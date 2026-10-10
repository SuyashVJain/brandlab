// SERVER ONLY. Small helpers shared by the /api/admin routes.

import { json, requireStaff, type Staff } from "@/lib/auth";

/**
 * Wraps an admin-only handler: checks the session and role on every call,
 * and turns unexpected errors into a plain 500 without leaking details.
 */
export async function adminOnly(
  request: Request,
  label: string,
  handler: (staff: Staff) => Promise<Response>,
): Promise<Response> {
  const staff = await requireStaff(request, ["admin"]);
  if (staff instanceof Response) return staff;
  try {
    return await handler(staff);
  } catch (error) {
    console.error(`[${label}]`, error instanceof Error ? error.message : "unknown error");
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}

/** Request body as JSON, or null when it is missing or malformed. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
