import { adminOnly, readJson } from "@/lib/admin-route";
import { firstIssue } from "@/lib/admin-schema";
import { json } from "@/lib/auth";
import { db } from "@/lib/db";
import { participantColumns, toParticipantRow, withNewFields } from "@/lib/participants-server";
import { checkinSchema } from "@/lib/registrations";

/**
 * POST /api/admin/checkin (admin only)   body: { id, checked_in }
 * Marks one participant as checked in (or undoes it) and returns that row.
 */
export async function POST(request: Request) {
  return adminOnly(request, "api/admin/checkin", async () => {
    const parsed = checkinSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);

    const rows = await withNewFields((full) =>
      db().query(
        `update participants set checked_in = $1 where id = $2 returning ${participantColumns(full)}`,
        [parsed.data.checked_in, parsed.data.id],
      ),
    );
    if (rows.length === 0) return json({ error: "That participant no longer exists." }, 404);
    return json({ participant: toParticipantRow(rows[0]) });
  });
}
