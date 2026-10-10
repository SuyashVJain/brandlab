import { adminOnly, readJson } from "@/lib/admin-route";
import { firstIssue, phaseSchema, REVEAL_DELAY_SECONDS } from "@/lib/admin-schema";
import { json } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAdminState } from "@/lib/event-state";

/**
 * POST /api/admin/phase (admin only)   body: { phase }
 * Moves the event to any of the seven phases. Moving to 'keywords_revealed'
 * also schedules reveal_at a few seconds ahead when it is empty or already in
 * the past, so the live countdown has time to run.
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
            when ${phase}::text = 'keywords_revealed' and (reveal_at is null or reveal_at < now())
              then now() + make_interval(secs => ${REVEAL_DELAY_SECONDS})
            else reveal_at
          end
      where id = 1
    `;
    return json(await readAdminState());
  });
}
