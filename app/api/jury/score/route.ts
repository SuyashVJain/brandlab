import { NeonDbError } from "@neondatabase/serverless";
import { readJson } from "@/lib/admin-route";
import { firstIssue } from "@/lib/admin-schema";
import { json, requireStaff } from "@/lib/auth";
import { readCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { scoreSchema } from "@/lib/jury-schema";

/**
 * POST /api/jury/score (JURY ONLY; admins get 403)
 * body: { submission_id, scores: { [criterion_id]: points }, notes? }
 * Saves this judge's scores for one submission (one row per judge per
 * submission; saving again replaces it). The judge is ALWAYS the signed-in
 * staff member: a judge_id in the body is ignored.
 *
 *   400  a criterion is missing or unknown, or points are not whole numbers in 0..max
 *   403  not a jury account, or phase is 'results' (scoring is locked)
 *   404  no such submission
 */
export async function POST(request: Request) {
  const staff = await requireStaff(request, ["jury"]);
  if (staff instanceof Response) return staff;

  const parsed = scoreSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);
  const { submission_id, scores, notes } = parsed.data;

  try {
    // Check the body against the current criteria.
    const criteria = await readCriteria();
    const known = new Set(criteria.map((criterion) => String(criterion.id)));
    if (Object.keys(scores).some((key) => !known.has(key))) {
      return json({ error: "That score includes a criterion that does not exist. Refresh and try again." }, 400);
    }
    for (const criterion of criteria) {
      const points = scores[String(criterion.id)];
      if (points === undefined) return json({ error: `Missing score for "${criterion.label}".` }, 400);
      if (!Number.isInteger(points)) return json({ error: "Scores must be whole numbers." }, 400);
      if (points < 0 || points > criterion.max_points) {
        return json({ error: `"${criterion.label}" must be between 0 and ${criterion.max_points}.` }, 400);
      }
    }

    // One statement = one transaction: the criteria are re-checked, the phase
    // lock is applied, the scores row is upserted with total = sum, and its
    // per-criterion values are replaced.
    const [result] = await db()`
      with input as (
        select e.key::int as criterion_id, e.value::int as points
        from jsonb_each_text(${JSON.stringify(scores)}::jsonb) e
      ),
      valid as (
        select (select count(*) from criteria) = (select count(*) from input)
           and not exists (
             select 1 from input i
             left join criteria c on c.id = i.criterion_id
             where c.id is null or i.points < 0 or i.points > c.max_points
           ) as ok
      ),
      saved as (
        insert into scores (submission_id, judge_id, total, notes)
        select ${submission_id}, ${staff.id}, (select sum(points) from input)::int, ${notes || null}
        from event_state s, valid
        where s.id = 1 and s.phase <> 'results' and valid.ok
        on conflict (submission_id, judge_id) do update
          set total = excluded.total, notes = excluded.notes
        returning id, total
      ),
      cleared as (
        delete from score_values v
        using saved
        where v.score_id = saved.id and v.criterion_id not in (select criterion_id from input)
        returning 1
      ),
      written as (
        insert into score_values (score_id, criterion_id, points)
        select saved.id, i.criterion_id, i.points
        from saved cross join input i
        on conflict (score_id, criterion_id) do update set points = excluded.points
        returning 1
      )
      select (select total from saved) as total,
             (select ok from valid) as valid,
             (select count(*) from written) + (select count(*) from cleared) as changed
    `;

    if (!result?.valid) {
      return json({ error: "The criteria changed while you were scoring. Refresh and try again." }, 400);
    }
    if (result.total === null) {
      return json({ error: "Results are out, so scores can no longer be changed." }, 403);
    }
    return json({ ok: true, total: result.total });
  } catch (error) {
    if (error instanceof NeonDbError && error.code === "23503") {
      return json({ error: "That submission no longer exists." }, 404);
    }
    console.error("[api/jury/score]", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
