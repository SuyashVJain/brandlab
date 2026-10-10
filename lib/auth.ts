// SERVER ONLY. Who is calling, and are they allowed to?

import type { StaffRole } from "@/lib/admin-schema";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export type Staff = { id: string; email: string; role: StaffRole };

/** JSON response that is never cached. Used by all staff/admin routes. */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/**
 * Turns a session token into the current staff row.
 * The signature proves the token is ours; the database lookup proves the
 * account still exists, and its role is read fresh (so removing or demoting
 * someone takes effect immediately, not after 12 hours).
 */
export async function staffFromToken(token: string | undefined): Promise<Staff | null> {
  const session = await verifySession(token);
  if (!session) return null;

  const rows = await db()`select id, email, role from staff where id = ${session.id} limit 1`;
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, email: row.email, role: row.role };
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > -1 && part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return undefined;
}

/** True when a browser sent this request from another site. */
function isCrossSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false; // non-browser callers (curl, scripts) send no Origin
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/**
 * Guard for staff routes. Call it first in every handler:
 *
 *   const staff = await requireStaff(request, ["admin"]);
 *   if (staff instanceof Response) return staff;
 *
 * Returns 401 when there is no valid session, 403 when the role is not allowed.
 */
export async function requireStaff(request: Request, roles: StaffRole[]): Promise<Staff | Response> {
  // Extra CSRF protection on top of the SameSite=Lax cookie.
  if (request.method !== "GET" && request.method !== "HEAD" && isCrossSite(request)) {
    return json({ error: "Cross-site request refused." }, 403);
  }

  let staff: Staff | null;
  try {
    staff = await staffFromToken(readCookie(request, SESSION_COOKIE));
  } catch (error) {
    console.error("[auth]", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }

  if (!staff) return json({ error: "Not signed in." }, 401);
  if (!roles.includes(staff.role)) return json({ error: "You do not have access to this." }, 403);
  return staff;
}
