import { adminOnly, readJson } from "@/lib/admin-route";
import { deadlineSchema, firstIssue } from "@/lib/admin-schema";
import { json } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAdminState } from "@/lib/event-state";

/**
 * POST /api/admin/deadline (admin only)   body: { submissions_close_at }
 * An ISO date-time with offset sets the submission deadline; null clears it.
 */
export async function POST(request: Request) {
  return adminOnly(request, "api/admin/deadline", async () => {
    const parsed = deadlineSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);

    await db()`
      update event_state
      set submissions_close_at = ${parsed.data.submissions_close_at}::timestamptz,
          updated_at = now()
      where id = 1
    `;
    return json(await readAdminState());
  });
}
