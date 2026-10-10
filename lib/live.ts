import type { Phase } from "@/lib/admin-schema";

/**
 * Shapes shared by GET /api/event-state (server) and the /live page (browser).
 * No server-only imports in this file.
 */

/** Phases in which keywords may be shown (once reveal_at has passed). */
export const REVEAL_PHASES: readonly Phase[] = [
  "keywords_revealed",
  "submissions_open",
  "submissions_closed",
  "results",
];

/** What GET /api/event-state returns. Times are ISO strings (UTC). */
export type PublicEventState = {
  phase: Phase;
  serverTime: string;
  revealAt: string | null;
  submissionsCloseAt: string | null;
  /** The rank being revealed on /live in the results phase (0 = nothing). */
  revealedRank?: number;
  /** Changes on every reveal save, so the same rank can be replayed. */
  revealNonce?: number;
  /** Present ONLY after the reveal. Before it, the key does not exist at all. */
  keywords?: string[];
};
