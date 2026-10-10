import { adminOnly, readJson } from "@/lib/admin-route";
import { firstIssue, revealRankSchema } from "@/lib/admin-schema";
import { json } from "@/lib/auth";
import { isMissingColumn } from "@/lib/criteria";
import { db } from "@/lib/db";
import { readAdminState } from "@/lib/event-state";
import { rankedEntries } from "@/lib/ranking-server";

/**
 * PUT /api/admin/reveal-rank (admin only)   body: { rank }
 * Chooses which rank /live reveals: a whole number from 0 to 200, where 0
 * hides the reveal. A rank above 0 needs the "results" phase and must not be
 * higher than the number of scored entries.
 *
 * Every save bumps reveal_nonce, so saving the same rank again replays the
 * reveal on every open /live screen.
 */
export async function PUT(request: Request) {
  return adminOnly(request, "api/admin/reveal-rank", async () => {
    const parsed = revealRankSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);
    const { rank } = parsed.data;

    const sql = db();
    if (rank > 0) {
      const [[state], ranking] = await Promise.all([sql`select phase from event_state where id = 1`, rankedEntries()]);
      if (rank > ranking.length) {
        return json(
          { error: ranking.length === 0 ? "No entries have been scored yet." : `Only ${ranking.length} entries have been scored, so there is no rank ${rank}.` },
          400,
        );
      }
      if (state?.phase !== "results") {
        return json({ error: "Set the phase to Results before revealing a rank." }, 409);
      }
    }

    try {
      await sql`
        update event_state
        set revealed_rank = ${rank}, reveal_nonce = reveal_nonce + 1, updated_at = now()
        where id = 1
      `;
    } catch (error) {
      if (!isMissingColumn(error)) throw error;
      return json({ error: "This needs the latest database migration. Run npm run db:migrate, then try again." }, 409);
    }
    return json(await readAdminState());
  });
}
