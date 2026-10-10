import { adminOnly } from "@/lib/admin-route";
import { json } from "@/lib/auth";
import { readCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import type { JudgeScore, LeaderboardData, LeaderRow } from "@/lib/jury-schema";
import { rankedEntries } from "@/lib/ranking-server";

/**
 * GET /api/admin/leaderboard (admin only)
 * Scored entries in exactly the public ranking order (same tie-break: the
 * first criterion, then the second), followed by the entries nobody has scored
 * yet. Includes the participant's name (admins only; judges never see it),
 * every judge's points per criterion and the criteria themselves for the labels.
 */
export async function GET(request: Request) {
  return adminOnly(request, "api/admin/leaderboard", async () => {
    const sql = db();
    const [criteria, ranked, unscored, scores] = await Promise.all([
      readCriteria(),
      rankedEntries(),
      sql`
        select s.id, p.code, s.event_name, p.full_name
        from submissions s
        join participants p on p.id = s.participant_id
        where not exists (select 1 from scores sc where sc.submission_id = s.id)
        order by p.code
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

    const leaderboard: LeaderRow[] = [
      ...ranked.map((entry) => ({
        id: entry.id,
        code: entry.code,
        full_name: entry.full_name,
        event_name: entry.event_name,
        avg_total: entry.avg_total,
        judge_count: entry.judge_count,
        judges: byJudge.get(entry.id) ?? [],
      })),
      ...unscored.map((row) => ({
        id: row.id as string,
        code: row.code as string,
        full_name: row.full_name as string,
        event_name: row.event_name as string,
        avg_total: null,
        judge_count: 0,
        judges: [],
      })),
    ];

    const body: LeaderboardData = { criteria, leaderboard };
    return json(body);
  });
}
