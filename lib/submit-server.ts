// SERVER ONLY. Helpers shared by the /api/submit routes.

import { db } from "@/lib/db";
import { posterExtension } from "@/lib/submit-schema";

export type Participant = { id: string; code: string; full_name: string; is_pair: boolean };

/** Same wording for every "email and code do not match" case, so nothing hints which one was wrong. */
export const NO_MATCH = "That email and code do not match a registration.";

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** The participant for this email + code, or null. One query on both columns. */
export async function findParticipant(email: string, code: string): Promise<Participant | null> {
  const rows = await db()`
    select id, code, full_name, partner_name is not null as is_pair
    from participants
    where email = ${email} and code = ${code}
    limit 1
  `;
  const row = rows[0];
  return row ? { id: row.id, code: row.code, full_name: row.full_name, is_pair: row.is_pair } : null;
}

/**
 * Are submissions open right now? Decided by the database, on its own clock:
 * phase must be 'submissions_open' and the deadline (if any) must not have passed.
 */
export async function submissionGate(): Promise<{ open: boolean; message: string }> {
  const [row] = await db()`
    select
      phase = 'submissions_open' and (submissions_close_at is null or now() < submissions_close_at) as open,
      phase in ('closed', 'registration', 'live', 'keywords_revealed') as before
    from event_state
    where id = 1
  `;
  if (row?.open) return { open: true, message: "" };
  return { open: false, message: row?.before ? "Submissions are not open yet." : "Submissions are closed." };
}

/**
 * The store's read-write token, passed to every server-side blob call on
 * purpose. Without it the SDK would pick OIDC credentials whenever
 * VERCEL_OIDC_TOKEN is present (for example after `vercel env pull`), and those
 * are refused outside the environments OIDC is enabled for.
 */
export function blobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  return token;
}

/** Host of this project's public Vercel Blob store, read from the read-write token's store id. */
export function blobHost(): string | null {
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3];
  return storeId ? `${storeId.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

/**
 * True only for an https URL on our blob store, under posters/<this participant's code>-,
 * with an allowed extension. A participant can therefore never point at someone else's file.
 */
export function isOwnPosterUrl(value: string, code: string): boolean {
  const host = blobHost();
  if (!host) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === host &&
      url.pathname.startsWith(`/posters/${code}-`) &&
      posterExtension(url.pathname) !== null &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

/** Wait until at least `ms` have passed since `started`, so answers take the same time. */
export async function holdUntil(started: number, ms: number) {
  const wait = ms - (Date.now() - started);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

export function tooMany(retryAfter: number) {
  return json({ error: "Too many attempts. Please try again in a few minutes." }, 429, {
    "Retry-After": String(retryAfter),
  });
}

/** Request body as JSON, or null when it is missing or malformed. */
export async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
