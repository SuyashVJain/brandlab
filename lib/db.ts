// SERVER ONLY.
// Import this from route handlers and other server code only. Never import it
// from a client component ("use client") or anything a client component
// imports: DATABASE_URL must not reach the browser.
// (The "server-only" package is not installed, so this comment and the runtime
// check below are the guard.)

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

if (typeof window !== "undefined") {
  throw new Error("lib/db.ts was imported in the browser. It is server-only.");
}

let client: NeonQueryFunction<false, false> | undefined;

/**
 * Neon HTTP client, created on first use so a missing DATABASE_URL fails the
 * request that needs it instead of the whole build.
 *
 *   const sql = db();
 *   const rows = await sql`select phase from event_state where id = 1`;
 *
 * Always pass values through the template (parameterized), never by string concatenation.
 */
export function db(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set.");
    client = neon(url);
  }
  return client;
}
