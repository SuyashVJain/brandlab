// SERVER ONLY. The one place the ranking is computed, and the rank currently revealed on /live.
// rankedEntries() includes names and codes: only admin routes may return its rows as they are.

import { isMissingColumn } from "@/lib/criteria";
import { db } from "@/lib/db";

export type RankedEntry = {
  rank: number;
  id: string;
  code: string;
  event_name: string;
  poster_url: string;
  full_name: string;
  partner_name: string | null;
  /** Average of the judges' totals, rounded to 2 places. */
  avg_total: number;
  judge_count: number;
};

/**
 * Every scored submission, best first.
 * Ranking: the average of the judges' totals. Ties are broken by the higher
 * average on the first criterion (by position), then on the second, then by
 * event name so the order is always the same. Entries nobody has scored are
 * not ranked.
 */
export async function rankedEntries(): Promise<RankedEntry[]> {
  const rows = await db()`
    with ordered as (
      select id, row_number() over (order by position, id) as place from criteria
    ),
    ranked as (
      select s.id, p.code, s.event_name, s.poster_url, p.full_name, p.partner_name,
             avg(sc.total) as total,
             count(sc.id)::int as judge_count,
             avg((select v.points from score_values v join ordered o on o.id = v.criterion_id
                  where v.score_id = sc.id and o.place = 1)) as first_criterion,
             avg((select v.points from score_values v join ordered o on o.id = v.criterion_id
                  where v.score_id = sc.id and o.place = 2)) as second_criterion
      from submissions s
      join participants p on p.id = s.participant_id
      join scores sc on sc.submission_id = s.id
      group by s.id, p.code, s.event_name, s.poster_url, p.full_name, p.partner_name
    )
    select r.id, r.code, r.event_name, r.poster_url, r.full_name, r.partner_name, r.judge_count,
           round(r.total, 2) as avg_total,
           row_number() over (
             order by r.total desc, r.first_criterion desc nulls last,
                      r.second_criterion desc nulls last, r.event_name
           )::int as rank
    from ranked r
    order by rank
  `;
  return rows.map((row) => ({
    rank: row.rank,
    id: row.id,
    code: row.code,
    event_name: row.event_name,
    poster_url: row.poster_url,
    full_name: row.full_name,
    partner_name: row.partner_name ?? null,
    avg_total: Number(row.avg_total),
    judge_count: row.judge_count,
  }));
}

export type RevealState = { rank: number; nonce: number };

/**
 * The rank revealed on /live and its nonce (event_state.revealed_rank / reveal_nonce).
 * Both columns come from migration 006. Until that migration has been run they do
 * not exist, and this answers "nothing revealed" instead of failing.
 */
export async function readReveal(): Promise<RevealState> {
  try {
    const [row] = await db()`select revealed_rank, reveal_nonce from event_state where id = 1`;
    return { rank: Number(row?.revealed_rank ?? 0), nonce: Number(row?.reveal_nonce ?? 0) };
  } catch (error) {
    if (isMissingColumn(error)) return { rank: 0, nonce: 0 };
    throw error;
  }
}
