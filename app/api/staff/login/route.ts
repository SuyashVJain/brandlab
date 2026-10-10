import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { readJson } from "@/lib/admin-route";
import { loginSchema } from "@/lib/admin-schema";
import { json } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sessionCookie, signSession } from "@/lib/session";

/**
 * POST /api/staff/login   body: { email, password }
 * Success: sets the session cookie and returns { role }.
 * Every failure is the same 401 "Wrong email or password", and a bcrypt
 * compare always runs, so neither the message nor the timing reveals whether
 * an email belongs to a staff account.
 */

const FAILURE = { error: "Wrong email or password" };

// Compared against when the email is unknown, so that path costs the same as a real check.
let dummyHash: Promise<string> | undefined;
function getDummyHash() {
  dummyHash ??= bcrypt.hash(crypto.randomUUID(), 12);
  return dummyHash;
}

export async function POST(request: Request) {
  const limit = rateLimit(`login:${clientIp(request)}`, 10, 10 * 60 * 1000);
  if (!limit.ok) {
    return json({ error: "Too many attempts. Please try again in a few minutes." }, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  try {
    const parsed = loginSchema.safeParse(await readJson(request));

    const rows = parsed.success
      ? await db()`select id, email, password_hash, role from staff where email = ${parsed.data.email} limit 1`
      : [];
    const staff = rows[0];

    const matches = await bcrypt.compare(
      parsed.success ? parsed.data.password : "",
      staff?.password_hash ?? (await getDummyHash()),
    );
    if (!staff || !matches) return json(FAILURE, 401);

    const token = await signSession({ id: staff.id, email: staff.email, role: staff.role });
    const response = NextResponse.json({ role: staff.role }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) {
    console.error("[api/staff/login]", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
