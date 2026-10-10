import { NextResponse } from "next/server";
import { clearedSessionCookie } from "@/lib/session";

/** POST /api/staff/logout: removes the session cookie. Safe to call when not signed in. */
export async function POST() {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(clearedSessionCookie());
  return response;
}
