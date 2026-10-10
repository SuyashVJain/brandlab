import { adminOnly } from "@/lib/admin-route";
import { REVEAL_DELAY_SECONDS } from "@/lib/admin-schema";
import { json } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAdminState } from "@/lib/event-state";

/**
 * POST /api/admin/reveal (admin only)
 * The "Reveal keywords" button: sets phase 'keywords_revealed' and reveal_at
 * to a few seconds from now. Refuses with 409 when no keywords are saved.
 */
export async function POST(request: Request) {
  return adminOnly(request, "api/admin/reveal", async () => {
    const sql = db();

    const [{ count }] = await sql`select count(*)::int as count from keywords`;
    if (count === 0) {
      return json({ error: "Save at least one keyword before revealing." }, 409);
    }

    await sql`
      update event_state
      set phase = 'keywords_revealed',
          reveal_at = now() + make_interval(secs => ${REVEAL_DELAY_SECONDS}),
          updated_at = now()
      where id = 1
    `;
    return json(await readAdminState());
  });
}
