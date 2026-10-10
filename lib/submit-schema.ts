import { z } from "zod";
import { lookupSchema, type Mode } from "@/lib/register-schema";

/**
 * Rules shared by the /submit page (browser) and the submit API routes
 * (server). No server-only imports in this file.
 */

export const MAX_POSTER_BYTES = 15 * 1024 * 1024;
export const MAX_EVENT_NAME = 60;
export const MAX_TAGLINE = 100;

/** Allowed poster files: extension -> content type. */
export const POSTER_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
} as const;

export type PosterExtension = keyof typeof POSTER_TYPES;

/** For <input type="file" accept>. */
export const POSTER_ACCEPT = ".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf";

export function posterExtension(filename: string): PosterExtension | null {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return extension in POSTER_TYPES && filename.includes(".") ? (extension as PosterExtension) : null;
}

/**
 * Why a poster file is not acceptable, or null when it is fine.
 * Checks the extension, the content type and the size.
 */
export function posterFileError(file: { name: string; type: string; size: number }): string | null {
  const extension = posterExtension(file.name);
  if (!extension || file.type !== POSTER_TYPES[extension]) {
    return "Poster must be a PNG, JPG or PDF file.";
  }
  if (file.size <= 0) return "That file is empty.";
  if (file.size > MAX_POSTER_BYTES) return "Poster is too big. The limit is 15 MB.";
  return null;
}

/** Email + participant code, exactly as /api/lookup takes them. */
export const verifySchema = lookupSchema;

/** The two text fields of a submission. */
export const submissionFieldsSchema = z.object({
  event_name: z
    .string()
    .trim()
    .min(1, "Enter your event name.")
    .max(MAX_EVENT_NAME, `Event name must be ${MAX_EVENT_NAME} characters or fewer.`),
  tagline: z.string().trim().max(MAX_TAGLINE, `Tagline must be ${MAX_TAGLINE} characters or fewer.`).optional(),
});

export const tokenSchema = verifySchema.extend({
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().max(100),
  size: z.number().int(),
});

export const saveSchema = verifySchema.extend({
  ...submissionFieldsSchema.shape,
  poster_url: z.string().max(500).pipe(z.url({ protocol: /^https$/, error: "Poster link is not valid." })),
});

export type SubmissionInfo = {
  event_name: string;
  tagline: string | null;
  poster_url: string;
  /** ISO time (UTC). */
  submitted_at: string;
};

/** POST /api/submit/verify */
export type VerifyResult =
  | { ok: true; full_name: string; mode: Mode; submission: SubmissionInfo | null }
  | { ok: false };

/** GET /api/submit/status */
export type SubmitStatus = { open: boolean; closesAt: string | null; serverTime: string };

/** True for posters the browser can show inline (not PDFs). */
export function isImagePoster(url: string): boolean {
  return /\.(png|jpe?g)$/i.test(url.split("?")[0]);
}
