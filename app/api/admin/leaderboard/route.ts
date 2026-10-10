import { adminOnly } from "@/lib/admin-route";
import { json } from "@/lib/auth";
import { db } from "@/lib/db";
import type { JudgeScore, LeaderRow } from "@/lib/jury-schema";

/**
 * GET /api/admin/leaderboard (admin only)
 * The `leaderboard` view, best average first, with the participant's name
 * (admins only; judges never see it) and every judge's own scores.
 */
export async function GET(request: Request) {
  return adminOnly(request, "api/admin/leaderboard", async () => {
    const sql = db();
    const [rows, scores] = await Promise.all([
      sql`
        select l.id, l.code, l.event_name, l.avg_total, l.judge_count, p.full_name
        from leaderboard l
        join participants p on p.code = l.code
        order by l.avg_total desc nulls last, l.code
      `,
      sql`
        select sc.submission_id, st.email as judge, sc.name_score, sc.keyword_score, sc.design_score,
               sc.clarity_score, sc.impact_score, sc.total, sc.notes
        from scores sc
        join staff st on st.id = sc.judge_id
        order by st.email
      `,
    ]);

    const byJudge = new Map<string, JudgeScore[]>();
    for (const score of scores) {
      const list = byJudge.get(score.submission_id) ?? [];
      list.push({
        judge: score.judge,
        name_score: score.name_score,
        keyword_score: score.keyword_score,
        design_score: score.design_score,
        clarity_score: score.clarity_score,
        impact_score: score.impact_score,
        total: score.total,
        notes: score.notes,
      });
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
    return json({ leaderboard });
  });
}
