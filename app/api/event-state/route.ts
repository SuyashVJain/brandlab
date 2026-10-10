import { connection } from "next/server";
import { db } from "@/lib/db";
import type { PublicEventState } from "@/lib/live";

/**
 * GET /api/event-state (public, no login)
 * Always: { phase, serverTime, revealAt, submissionsCloseAt }.
 * `keywords` is added ONLY when the phase is keywords_revealed or later AND
 * reveal_at is set AND the database clock has reached it. That decision is
 * made inside the one SQL statement below, so nothing can peek early.
 *
 * Caching: the response is the same for every caller (no cookies, no
 * participant data), so the edge may cache it for a second. A response
 * without keywords can only ever be served late, never early; clients run
 * their countdown from revealAt and serverTime alone.
 */
export async function GET() {
  // Always answer at request time; never prerender this.
  await connection();

  try {
    const [row] = await db()`
      select
        s.phase,
        now() as server_time,
        s.reveal_at,
        s.submissions_close_at,
        case
          when s.phase in ('keywords_revealed', 'submissions_open', 'submissions_closed', 'results')
               and s.reveal_at is not null
               and now() >= s.reveal_at
          then (
            select coalesce(array_agg(k.word order by k.position, k.id), '{}'::text[])
            from keywords k
          )
        end as keywords
      from event_state s
      where s.id = 1
    `;
    if (!row) throw new Error("event_state row is missing");

    const iso = (value: unknown) => (value ? new Date(value as string).toISOString() : null);
    const body: PublicEventState = {
      phase: row.phase,
      serverTime: iso(row.server_time) as string,
      revealAt: iso(row.reveal_at),
      submissionsCloseAt: iso(row.submissions_close_at),
    };
    // Not released yet: the key is left out entirely.
    if (Array.isArray(row.keywords)) body.keywords = row.keywords;

    return Response.json(body, {
      headers: { "Cache-Control": "public, s-maxage=1, stale-while-revalidate=2" },
    });
  } catch (error) {
    console.error("[api/event-state]", error instanceof Error ? error.message : "unknown error");
    return Response.json(
      { error: "Could not load the event state." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
