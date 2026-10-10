import { adminOnly, readJson } from "@/lib/admin-route";
import { firstIssue, phaseSchema, REVEAL_DELAY_SECONDS } from "@/lib/admin-schema";
import { json } from "@/lib/auth";
import { isMissingColumn } from "@/lib/criteria";
import { db } from "@/lib/db";
import { readAdminState } from "@/lib/event-state";

/**
 * POST /api/admin/phase (admin only)   body: { phase }
 * Moves the event to any of the seven phases. Moving to 'keywords_revealed'
 * also schedules reveal_at a few seconds ahead when it is empty or already in
 * the past, so the live countdown has time to run. Stepping back to 'closed',
 * 'registration' or 'live' clears reveal_at, so keywords can never stay
 * visible after going back.
 */
export async function POST(request: Request) {
  return adminOnly(request, "api/admin/phase", async () => {
    const parsed = phaseSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);
    const { phase } = parsed.data;

    await db()`
      update event_state
      set phase = ${phase}::event_phase,
          updated_at = now(),
          reveal_at = case
            when ${phase}::text in ('closed', 'registration', 'live') then null
            when ${phase}::text = 'keywords_revealed' and (reveal_at is null or reveal_at < now())
              then now() + make_interval(secs => ${REVEAL_DELAY_SECONDS})
            else reveal_at
          end
      where id = 1
    `;
    // A phase change always hides the rank reveal, so an old rank can never
    // pop up when the event enters "results". (Columns from migration 006.)
    try {
      await db()`update event_state set revealed_rank = 0, reveal_nonce = reveal_nonce + 1 where id = 1`;
    } catch (error) {
      if (!isMissingColumn(error)) throw error;
    }
    return json(await readAdminState());
  });
}
