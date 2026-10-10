import { adminOnly } from "@/lib/admin-route";
import { json } from "@/lib/auth";
import { readAdminState } from "@/lib/event-state";

/** GET /api/admin/state (admin only): phase, reveal_at, submissions_close_at, serverTime, keywords. */
export async function GET(request: Request) {
  return adminOnly(request, "api/admin/state", async () => json(await readAdminState()));
}
