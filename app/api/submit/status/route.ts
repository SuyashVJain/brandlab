import { connection } from "next/server";
import { db } from "@/lib/db";
import type { SubmitStatus } from "@/lib/submit-schema";

/**
 * GET /api/submit/status (public)
 * Only { open, closesAt, serverTime }. `open` means phase 'submissions_open'
 * and the deadline has not passed, on the database clock.
 */
export async function GET() {
  await connection();

  try {
    const [row] = await db()`
      select
        phase = 'submissions_open' and (submissions_close_at is null or now() < submissions_close_at) as open,
        submissions_close_at,
        now() as server_time
      from event_state
      where id = 1
    `;
    if (!row) throw new Error("event_state row is missing");

    const body: SubmitStatus = {
      open: row.open === true,
      closesAt: row.submissions_close_at ? new Date(row.submissions_close_at).toISOString() : null,
      serverTime: new Date(row.server_time).toISOString(),
    };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/submit/status]", error instanceof Error ? error.message : "unknown error");
    return Response.json(
      { error: "Could not load the submission status." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
