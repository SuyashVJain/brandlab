import { z } from "zod";
import type { StaffRole } from "@/lib/admin-schema";

/**
 * Shapes shared by the staff / criteria / jury / leaderboard API routes
 * (server) and the admin tabs (browser). No server-only imports in this file.
 */

/* ---------- judging criteria (stored in the `criteria` table, edited in /admin) ---------- */

export type Criterion = { id: number; position: number; label: string; max_points: number };

export const MIN_CRITERIA = 3;
export const MAX_CRITERIA = 8;
export const CRITERIA_TOTAL = 100;
export const MAX_CRITERION_LABEL = 80;

/** Sent back when judges have already scored: the criteria can no longer change. */
export const CRITERIA_LOCKED = "Criteria are locked because judges have already saved scores.";

/** PUT /api/admin/criteria: the whole list, in display order. `id` is present for existing criteria. */
export const criteriaSchema = z.object({
  criteria: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        label: z
          .string()
          .trim()
          .min(1, "Every criterion needs a label.")
          .max(MAX_CRITERION_LABEL, `Labels must be ${MAX_CRITERION_LABEL} characters or fewer.`),
        max_points: z
          .number("Max points must be a number.")
          .int("Max points must be a whole number.")
          .min(1, "Max points must be at least 1."),
      }),
    )
    .min(MIN_CRITERIA, `Use at least ${MIN_CRITERIA} criteria.`)
    .max(MAX_CRITERIA, `Use ${MAX_CRITERIA} criteria at most.`)
    .refine(
      (list) => list.reduce((sum, item) => sum + item.max_points, 0) === CRITERIA_TOTAL,
      `Max points must add up to exactly ${CRITERIA_TOTAL}.`,
    )
    .refine((list) => {
      const ids = list.map((item) => item.id).filter((id) => id !== undefined);
      return new Set(ids).size === ids.length;
    }, "The same criterion appears twice."),
});

/* ---------- scoring ---------- */

export const MAX_NOTES = 500;

/**
 * POST /api/jury/score. `scores` maps criterion id -> points. The route checks
 * it against the current criteria (all present, whole numbers, 0..max, no extras).
 */
export const scoreSchema = z.object({
  submission_id: z.uuid("Unknown submission."),
  scores: z.record(z.string(), z.number("Scores must be numbers.")),
  notes: z.string().trim().max(MAX_NOTES, `Notes must be ${MAX_NOTES} characters or fewer.`).optional(),
});

/** Points keyed by criterion id (as a string, the way JSON carries it). */
export type PointsByCriterion = Record<string, number>;

export function totalOf(criteria: Criterion[], points: PointsByCriterion): number {
  return criteria.reduce((sum, criterion) => sum + (points[String(criterion.id)] || 0), 0);
}

/* ---------- staff ---------- */

const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address."));
const password = z.string().min(10, "Password must be at least 10 characters.").max(200, "Password is too long.");
const id = z.uuid("Unknown staff account.");

export const staffCreateSchema = z.object({
  email,
  password,
  role: z.enum(["admin", "jury"], "Role must be admin or jury."),
});
export const staffPasswordSchema = z.object({ id, password });
export const staffDeleteSchema = z.object({ id });

/* ---------- response shapes ---------- */

export type StaffRow = { id: string; email: string; role: StaffRole; created_at: string };

/** GET /api/admin/criteria */
export type CriteriaData = { criteria: Criterion[]; locked: boolean };

/** One submission as a judge sees it: participant code only, never a name or contact detail. */
export type JurySubmission = {
  id: string;
  code: string;
  event_name: string;
  tagline: string | null;
  poster_url: string;
  /** This judge's own saved scores, or null when not scored yet. */
  my_score: { by_criterion: PointsByCriterion; total: number; notes: string | null } | null;
};

/** GET /api/jury/submissions */
export type JuryData = {
  criteria: Criterion[];
  submissions: JurySubmission[];
  /** True in the 'results' phase: scores can no longer be changed. */
  locked: boolean;
  /** Present only once the keywords have been revealed (same rule as /api/event-state). */
  keywords?: string[];
};

export type JudgeScore = { judge: string; total: number; notes: string | null; by_criterion: PointsByCriterion };

export type LeaderRow = {
  id: string;
  code: string;
  full_name: string;
  event_name: string;
  /** Average of the judges' totals, or null when nobody has scored it. */
  avg_total: number | null;
  judge_count: number;
  judges: JudgeScore[];
};

/** GET /api/admin/leaderboard (admin only: includes the participant's name). */
export type LeaderboardData = { criteria: Criterion[]; leaderboard: LeaderRow[] };
