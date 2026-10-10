import { adminOnly } from "@/lib/admin-route";
import { json } from "@/lib/auth";
import { db } from "@/lib/db";
import { listParticipants } from "@/lib/participants-server";
import { STATUSES, type CheckinStatus, type ParticipantsData } from "@/lib/registrations";

/**
 * GET /api/admin/participants?q=&status= (admin only)
 * The registrations list for the check-in desk, plus counts over everyone.
 *   q       searches code, name, email, enrollment number and phone (case-insensitive)
 *   status  all | checked_in | not_checked_in
 */
export async function GET(request: Request) {
  return adminOnly(request, "api/admin/participants", async () => {
    const params = new URL(request.url).searchParams;
    const q = (params.get("q") ?? "").trim().slice(0, 100);
    const status = (params.get("status") ?? "all") as CheckinStatus;
    if (!STATUSES.includes(status)) return json({ error: "Unknown status filter." }, 400);

    const [participants, counts] = await Promise.all([
      listParticipants(q, status),
      db()`
        select count(*)::int as total,
               count(*) filter (where checked_in)::int as checked_in,
               count(*) filter (where partner_name is null)::int as solo,
               count(*) filter (where partner_name is not null)::int as pairs
        from participants
      `,
    ]);

    const body: ParticipantsData = {
      participants,
      counts: {
        total: counts[0].total,
        checked_in: counts[0].checked_in,
        solo: counts[0].solo,
        pairs: counts[0].pairs,
      },
    };
    return json(body);
  });
}
