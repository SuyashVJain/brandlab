/**
 * Shapes shared by GET /api/results (server) and the rank reveal on /live (browser).
 * No server-only imports in this file.
 */

/** The one team at the rank that is currently revealed. Nothing else is ever sent. */
export type RevealedEntry = {
  rank: number;
  event_name: string;
  poster_url: string;
  /** The participant's name. */
  name: string;
  /** The partner's name when the entry is a pair, otherwise null. */
  partner: string | null;
};

/** What GET /api/results returns. With nothing revealed it is exactly { published: false }. */
export type ResultsData = ({ published: true } & RevealedEntry) | { published: false };
