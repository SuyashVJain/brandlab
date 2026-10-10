import { z } from "zod";

/**
 * Shapes shared by the admin pages (browser) and the staff/admin API routes
 * (server). No server-only imports in this file.
 */

/** The seven event phases, in the order the event moves through them. */
export const PHASES = [
  "closed",
  "registration",
  "live",
  "keywords_revealed",
  "submissions_open",
  "submissions_closed",
  "results",
] as const;

export type Phase = (typeof PHASES)[number];

export const PHASE_LABEL: Record<Phase, string> = {
  closed: "Closed",
  registration: "Registration",
  live: "Live",
  keywords_revealed: "Keywords revealed",
  submissions_open: "Submissions open",
  submissions_closed: "Submissions closed",
  results: "Results",
};

export type StaffRole = "admin" | "jury";

/** How long after "Reveal" the keywords become visible, so the live countdown can run. */
export const REVEAL_DELAY_SECONDS = 10;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const phaseSchema = z.object({
  phase: z.enum(PHASES, "Unknown phase."),
});

export const deadlineSchema = z.object({
  // ISO 8601 with an offset or Z (for example 2026-10-13T14:30:00+05:30), or null to clear.
  submissions_close_at: z.union([
    z.iso.datetime({ offset: true, error: "Deadline must be an ISO date-time." }),
    z.null(),
  ]),
});

/** Highest rank that can be revealed on /live. */
export const MAX_REVEAL_RANK = 200;

export const revealRankSchema = z.object({
  // 0 hides the reveal.
  rank: z
    .number("Enter a whole number.")
    .int("Enter a whole number.")
    .min(0, "The rank cannot be negative.")
    .max(MAX_REVEAL_RANK, `The rank can be ${MAX_REVEAL_RANK} at most.`),
});

export const keywordsSchema = z.object({
  keywords: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Keywords cannot be empty.")
        .max(40, "Each keyword must be 40 characters or fewer."),
    )
    .min(1, "Add at least one keyword.")
    .max(8, "Use 8 keywords at most.")
    .refine(
      (words) => new Set(words.map((word) => word.toLowerCase())).size === words.length,
      "Each keyword must be different.",
    ),
});

/** What the admin routes return after every read or change. Times are ISO strings (UTC). */
export type AdminState = {
  phase: Phase;
  reveal_at: string | null;
  submissions_close_at: string | null;
  serverTime: string;
  keywords: string[];
  /** The rank /live is revealing right now (0 = nothing). */
  revealed_rank: number;
  /** Goes up on every reveal save, so the same rank can be replayed. */
  reveal_nonce: number;
  /** Submissions at least one judge has scored: the highest rank that exists. */
  scored_entries: number;
  /** The full ranking, best first. Admin screens only. */
  ranking: RankPreview[];
};

/** One line of the admin-only preview of who holds a rank. */
export type RankPreview = {
  rank: number;
  code: string;
  event_name: string;
  name: string;
  partner: string | null;
};

/** First validation message, for a single-line error. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request.";
}
