import { connection } from "next/server";
import { db } from "@/lib/db";
import { rankedEntries, readReveal } from "@/lib/ranking-server";
import type { ResultsData } from "@/lib/results";

/**
 * GET /api/results (public)
 * In the "results" phase, while an admin has a rank revealed, this returns
 * ONLY the one team at that rank:
 *   { published: true, rank, event_name, poster_url, name, partner }
 * Never another rank, and never scores, emails, enrollment numbers, codes or ids.
 * In every other case: { published: false }.
 *
 * The ranking itself (average of the judges' totals, then the first and second
 * criteria as tie-breaks) lives in lib/ranking-server.ts.
 */

const HEADERS = { "Cache-Control": "public, s-maxage=1, stale-while-revalidate=2" };
const NOTHING: ResultsData = { published: false };

export async function GET() {
  await connection();

  try {
    const [[state], reveal] = await Promise.all([db()`select phase from event_state where id = 1`, readReveal()]);
    if (state?.phase !== "results" || reveal.rank <= 0) {
      return Response.json(NOTHING, { headers: HEADERS });
    }

    const entry = (await rankedEntries()).find((item) => item.rank === reveal.rank);
    if (!entry) return Response.json(NOTHING, { headers: HEADERS });

    const body: ResultsData = {
      published: true,
      rank: entry.rank,
      event_name: entry.event_name,
      poster_url: entry.poster_url,
      name: entry.full_name,
      partner: entry.partner_name,
    };
    return Response.json(body, { headers: HEADERS });
  } catch (error) {
    console.error("[api/results]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Could not load the results." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
