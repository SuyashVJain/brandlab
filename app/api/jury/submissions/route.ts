import { json, requireStaff } from "@/lib/auth";
import { readCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import type { JuryData } from "@/lib/jury-schema";

/**
 * GET /api/jury/submissions (JURY ONLY; admins get 403)
 * Blind judging: rows come from the `jury_submissions` view, which carries the
 * participant CODE only. No name, email, phone or enrollment number is ever
 * selected here. Each row also carries this judge's own saved scores, and the
 * response includes the current criteria.
 *
 * Keywords are included only once they have been revealed, by the same SQL
 * rule as /api/event-state, so judges can check the keyword link.
 */
export async function GET(request: Request) {
  const staff = await requireStaff(request, ["jury"]);
  if (staff instanceof Response) return staff;

  try {
    const sql = db();
    const [criteria, rows, states] = await Promise.all([
      readCriteria(),
      sql`
        select j.id, j.code, j.event_name, j.tagline, j.poster_url,
               sc.id as score_id, sc.total, sc.notes,
               (
                 select jsonb_object_agg(v.criterion_id, v.points)
                 from score_values v
                 where v.score_id = sc.id
               ) as by_criterion
        from jury_submissions j
        left join scores sc on sc.submission_id = j.id and sc.judge_id = ${staff.id}
        order by j.code
      `,
      sql`
        select
          s.phase = 'results' as locked,
          case
            when s.phase in ('keywords_revealed', 'submissions_open', 'submissions_closed', 'results')
                 and s.reveal_at is not null
                 and now() >= s.reveal_at
            then (select coalesce(array_agg(k.word order by k.position, k.id), '{}'::text[]) from keywords k)
          end as keywords
        from event_state s
        where s.id = 1
      `,
    ]);

    const body: JuryData = {
      criteria,
      submissions: rows.map((row) => ({
        id: row.id,
        code: row.code,
        event_name: row.event_name,
        tagline: row.tagline,
        poster_url: row.poster_url,
        my_score: row.score_id
          ? { by_criterion: row.by_criterion ?? {}, total: row.total, notes: row.notes }
          : null,
      })),
      locked: states[0]?.locked === true,
    };
    if (Array.isArray(states[0]?.keywords)) body.keywords = states[0].keywords;

    return json(body);
  } catch (error) {
    console.error("[api/jury/submissions]", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
