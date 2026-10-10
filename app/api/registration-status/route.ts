import { connection } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/registration-status
 * Returns only { open: boolean }, so the form can show "Registration is
 * closed" without exposing the phase or anything else.
 */
export async function GET() {
  // Always answer at request time; this must never be prerendered or cached.
  await connection();

  try {
    const [state] = await db()`select phase from event_state where id = 1`;
    return Response.json(
      { open: state?.phase === "registration" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/registration-status]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Could not check registration status." }, { status: 500 });
  }
}
