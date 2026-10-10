// SERVER ONLY. Reads the event state for the admin screens.
// Includes the keywords and the full ranking with names, so this must never be used by a public route.

import type { AdminState } from "@/lib/admin-schema";
import { db } from "@/lib/db";
import { rankedEntries, readReveal } from "@/lib/ranking-server";

const iso = (value: unknown): string | null => (value ? new Date(value as string).toISOString() : null);

export async function readAdminState(): Promise<AdminState> {
  const sql = db();
  const [states, keywords, reveal, ranking] = await Promise.all([
    sql`select phase, reveal_at, submissions_close_at, now() as server_time from event_state where id = 1`,
    sql`select word from keywords order by position, id`,
    readReveal(),
    rankedEntries(),
  ]);
  const state = states[0];
  if (!state) throw new Error("event_state row is missing");

  return {
    phase: state.phase,
    reveal_at: iso(state.reveal_at),
    submissions_close_at: iso(state.submissions_close_at),
    serverTime: iso(state.server_time) as string,
    keywords: keywords.map((row) => row.word as string),
    revealed_rank: reveal.rank,
    reveal_nonce: reveal.nonce,
    scored_entries: ranking.length,
    ranking: ranking.map((entry) => ({
      rank: entry.rank,
      code: entry.code,
      event_name: entry.event_name,
      name: entry.full_name,
      partner: entry.partner_name,
    })),
  };
}
