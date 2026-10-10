import { NeonDbError } from "@neondatabase/serverless";
import { readJson } from "@/lib/admin-route";
import { firstIssue } from "@/lib/admin-schema";
import { json, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreSchema } from "@/lib/jury-schema";

/**
 * POST /api/jury/score (admin and jury)
 * body: { submission_id, name_score, keyword_score, design_score, clarity_score, impact_score, notes? }
 * Saves this judge's scores for one submission (one row per judge per
 * submission; saving again replaces it). The judge is ALWAYS the signed-in
 * staff member: a judge_id in the body is ignored.
 *
 *   400  not whole numbers, or outside a criterion's range
 *   403  phase is 'results': scoring is locked
 *   404  no such submission
 */
export async function POST(request: Request) {
  const staff = await requireStaff(request, ["admin", "jury"]);
  if (staff instanceof Response) return staff;

  const parsed = scoreSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);
  const score = parsed.data;

  try {
    // The phase check and the upsert are one statement.
    const rows = await db()`
      insert into scores
        (submission_id, judge_id, name_score, keyword_score, design_score, clarity_score, impact_score, notes)
      select ${score.submission_id}, ${staff.id}, ${score.name_score}, ${score.keyword_score},
             ${score.design_score}, ${score.clarity_score}, ${score.impact_score}, ${score.notes || null}
      from event_state
      where id = 1 and phase <> 'results'
      on conflict (submission_id, judge_id) do update
        set name_score = excluded.name_score,
            keyword_score = excluded.keyword_score,
            design_score = excluded.design_score,
            clarity_score = excluded.clarity_score,
            impact_score = excluded.impact_score,
            notes = excluded.notes
      returning total
    `;
    if (rows.length === 0) {
      return json({ error: "Results are out, so scores can no longer be changed." }, 403);
    }
    return json({ ok: true, total: rows[0].total });
  } catch (error) {
    if (error instanceof NeonDbError && error.code === "23503") {
      return json({ error: "That submission no longer exists." }, 404);
    }
    console.error("[api/jury/score]", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
