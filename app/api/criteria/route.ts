import { connection } from "next/server";
import { readCriteria } from "@/lib/criteria";

/**
 * GET /api/criteria (public)
 * The judging criteria for the home page:
 * [{ position, label, max_points, description }] in display order.
 * Deliberately nothing else: no ids, no scores, no participant data.
 *
 * Cached for 30 seconds at the edge, so an edit in /admin shows on the home
 * page within about a minute.
 */
export async function GET() {
  await connection();

  try {
    const body = (await readCriteria()).map((criterion) => ({
      position: criterion.position,
      label: criterion.label,
      max_points: criterion.max_points,
      description: criterion.description,
    }));
    return Response.json(body, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[api/criteria]", error instanceof Error ? error.message : "unknown error");
    return Response.json(
      { error: "Could not load the judging criteria." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
