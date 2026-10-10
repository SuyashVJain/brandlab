import { z } from "zod";
import type { StaffRole } from "@/lib/admin-schema";

/**
 * Shapes shared by the staff / jury / leaderboard API routes (server) and the
 * admin tabs (browser). No server-only imports in this file.
 */

/* ---------- judging criteria (weights from docs/CONTENT.md, total 100) ---------- */

export const CRITERIA = [
  { key: "name_score", label: "Creativity and originality of the event name", short: "Name", max: 25 },
  { key: "keyword_score", label: "Link between keywords and the idea", short: "Keywords", max: 20 },
  { key: "design_score", label: "Poster visual design and composition", short: "Design", max: 30 },
  { key: "clarity_score", label: "Clarity, typography and readability", short: "Clarity", max: 15 },
  { key: "impact_score", label: "Overall impact and brand feel", short: "Impact", max: 10 },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];
export type ScoreValues = Record<CriterionKey, number>;

export const MAX_NOTES = 500;

const points = (max: number) =>
  z.number("Scores must be numbers.").int("Scores must be whole numbers.").min(0, "Scores cannot be negative.").max(max, `That score is over its maximum of ${max}.`);

export const scoreSchema = z.object({
  submission_id: z.uuid("Unknown submission."),
  name_score: points(25),
  keyword_score: points(20),
  design_score: points(30),
  clarity_score: points(15),
  impact_score: points(10),
  notes: z.string().trim().max(MAX_NOTES, `Notes must be ${MAX_NOTES} characters or fewer.`).optional(),
});

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

/** One submission as a judge sees it: participant code only, never a name or contact detail. */
export type JurySubmission = {
  id: string;
  code: string;
  event_name: string;
  tagline: string | null;
  poster_url: string;
  /** This judge's own saved scores, or null when not scored yet. */
  my_score: (ScoreValues & { notes: string | null; total: number }) | null;
};

/** GET /api/jury/submissions */
export type JuryData = {
  submissions: JurySubmission[];
  /** True in the 'results' phase: scores can no longer be changed. */
  locked: boolean;
  /** Present only once the keywords have been revealed (same rule as /api/event-state). */
  keywords?: string[];
};

export type JudgeScore = ScoreValues & { judge: string; total: number; notes: string | null };

/** GET /api/admin/leaderboard (admin only: includes the participant's name). */
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

export function totalOf(values: ScoreValues): number {
  return CRITERIA.reduce((sum, criterion) => sum + (values[criterion.key] || 0), 0);
}
