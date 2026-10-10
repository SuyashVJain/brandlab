// SERVER ONLY. Signs and verifies the staff session cookie.
// Never import this from a client component: it reads SESSION_SECRET.

import { SignJWT, jwtVerify } from "jose";
import type { StaffRole } from "@/lib/admin-schema";

export const SESSION_COOKIE = "bl_session";
const MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

export type Session = { id: string; email: string; role: StaffRole };

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is not set (it needs at least 32 characters).");
  }
  return new TextEncoder().encode(secret);
}

/** Signed JWT (HS256) carrying the staff id, email and role. Expires in 12 hours. */
export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ email: session.email, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Returns the session, or null for a missing, tampered or expired token. */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const { sub, email, role } = payload;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    if (role !== "admin" && role !== "jury") return null;
    return { id: sub, email, role };
  } catch {
    return null;
  }
}

const baseCookie = {
  name: SESSION_COOKIE,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Cookie options for a fresh session. */
export function sessionCookie(token: string) {
  return { ...baseCookie, value: token, maxAge: MAX_AGE_SECONDS };
}

/** Cookie options that remove the session. */
export function clearedSessionCookie() {
  return { ...baseCookie, value: "", maxAge: 0 };
}
