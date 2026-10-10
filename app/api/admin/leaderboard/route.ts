import { adminOnly } from "@/lib/admin-route";
import { json } from "@/lib/auth";
import { readCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import type { JudgeScore, LeaderboardData, LeaderRow } from "@/lib/jury-schema";

/**
 * GET /api/admin/leaderboard (admin only)
 * The `leaderboard` view, best average first, with the participant's name
 * (admins only; judges never see it), every judge's points per criterion
 * (from score_values) and the criteria themselves for the labels.
 */
export async function GET(request: Request) {
  return adminOnly(request, "api/admin/leaderboard", async () => {
    const sql = db();
    const [criteria, rows, scores] = await Promise.all([
      readCriteria(),
      sql`
        select l.id, l.code, l.event_name, l.avg_total, l.judge_count, p.full_name
        from leaderboard l
        join participants p on p.code = l.code
        order by l.avg_total desc nulls last, l.code
      `,
      sql`
        select sc.submission_id, st.email as judge, sc.total, sc.notes,
               coalesce(
                 (select jsonb_object_agg(v.criterion_id, v.points) from score_values v where v.score_id = sc.id),
                 '{}'::jsonb
               ) as by_criterion
        from scores sc
        join staff st on st.id = sc.judge_id
        order by st.email
      `,
    ]);

    const byJudge = new Map<string, JudgeScore[]>();
    for (const score of scores) {
      const list = byJudge.get(score.submission_id) ?? [];
      list.push({ judge: score.judge, total: score.total, notes: score.notes, by_criterion: score.by_criterion });
      byJudge.set(score.submission_id, list);
    }

    const leaderboard: LeaderRow[] = rows.map((row) => ({
      id: row.id,
      code: row.code,
      full_name: row.full_name,
      event_name: row.event_name,
      avg_total: row.avg_total === null ? null : Number(row.avg_total),
      judge_count: Number(row.judge_count),
      judges: byJudge.get(row.id) ?? [],
    }));

    const body: LeaderboardData = { criteria, leaderboard };
    return json(body);
  });
}
