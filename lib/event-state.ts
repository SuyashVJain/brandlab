// SERVER ONLY. Reads the event state for the admin screens.
// Includes the keywords, so this must never be used by a public route.

import type { AdminState } from "@/lib/admin-schema";
import { db } from "@/lib/db";

const iso = (value: unknown): string | null => (value ? new Date(value as string).toISOString() : null);

export async function readAdminState(): Promise<AdminState> {
  const sql = db();
  const [states, keywords] = await Promise.all([
    sql`select phase, reveal_at, submissions_close_at, now() as server_time from event_state where id = 1`,
    sql`select word from keywords order by position, id`,
  ]);
  const state = states[0];
  if (!state) throw new Error("event_state row is missing");

  return {
    phase: state.phase,
    reveal_at: iso(state.reveal_at),
    submissions_close_at: iso(state.submissions_close_at),
    serverTime: iso(state.server_time) as string,
    keywords: keywords.map((row) => row.word as string),
  };
}
