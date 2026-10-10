import { z } from "zod";
import { siteContent } from "@/lib/site-content";

/**
 * Validation shared by the register form (browser) and the API routes
 * (server), so both sides always agree. This file must stay free of
 * server-only imports.
 */

const enrollment = (label: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .min(5, `${label} must be at least 5 characters.`)
    .max(20, `${label} must be 20 characters or fewer.`);

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long.")
  .pipe(z.email("Enter a valid email address."));

const PROGRAMS: readonly string[] = siteContent.registration.programs;
const SEMESTERS: readonly number[] = siteContent.registration.semesters;

/** 10-digit Indian mobile number: digits only, starts with 6-9. */
const PHONE = /^[6-9]\d{9}$/;

/** The form sends every field as text; a semester arrives as "3". */
const inList = (value: string | undefined, kind: "program" | "semester") =>
  kind === "program" ? PROGRAMS.includes(value ?? "") : /^\d$/.test(value ?? "") && SEMESTERS.includes(Number(value));

const PARTNER_FIELDS = ["partner_name", "partner_enrollment_no", "partner_phone", "partner_program", "partner_semester"] as const;

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(80, "Name must be 80 characters or fewer."),
    email,
    phone: z.string().trim().regex(PHONE, "Enter a 10-digit mobile number, digits only."),
    enrollment_no: enrollment("Enrollment number"),
    program: z.string().trim().refine((value) => inList(value, "program"), "Choose your programme."),
    semester: z.string().trim().refine((value) => inList(value, "semester"), "Choose your semester."),
    mode: z.enum(["alone", "pair"], "Choose how you are joining."),
    partner_name: z.string().trim().max(80, "Name must be 80 characters or fewer.").optional(),
    partner_enrollment_no: z.string().trim().toUpperCase().max(20, "Enrollment number must be 20 characters or fewer.").optional(),
    partner_phone: z.string().trim().max(20).optional(),
    partner_program: z.string().trim().max(40).optional(),
    partner_semester: z.string().trim().max(2).optional(),
  })
  .superRefine((value, context) => {
    if (value.mode !== "pair") {
      // Partner details are not accepted for an individual entry.
      for (const field of PARTNER_FIELDS) {
        if (value[field]) context.addIssue({ code: "custom", path: [field], message: "Partner details are only for pair entries." });
      }
      return;
    }

    if (!value.partner_name || value.partner_name.length < 2) {
      context.addIssue({ code: "custom", path: ["partner_name"], message: "Enter your partner's full name." });
    }
    const partner = value.partner_enrollment_no ?? "";
    if (partner.length < 5) {
      context.addIssue({
        code: "custom",
        path: ["partner_enrollment_no"],
        message: "Enter your partner's enrollment number (at least 5 characters).",
      });
    } else if (partner === value.enrollment_no) {
      context.addIssue({
        code: "custom",
        path: ["partner_enrollment_no"],
        message: "Partner's enrollment number must be different from yours.",
      });
    }

    if (!PHONE.test(value.partner_phone ?? "")) {
      context.addIssue({ code: "custom", path: ["partner_phone"], message: "Enter your partner's 10-digit mobile number, digits only." });
    } else if (value.partner_phone === value.phone) {
      context.addIssue({ code: "custom", path: ["partner_phone"], message: "Partner's phone must be different from yours." });
    }
    if (!inList(value.partner_program, "program")) {
      context.addIssue({ code: "custom", path: ["partner_program"], message: "Choose your partner's programme." });
    }
    if (!inList(value.partner_semester, "semester")) {
      context.addIssue({ code: "custom", path: ["partner_semester"], message: "Choose your partner's semester." });
    }
  })
  // Normalise: empty optionals become null, semesters become numbers, and partner fields are null when joining alone.
  .transform((value) => ({
    full_name: value.full_name,
    email: value.email,
    phone: value.phone,
    enrollment_no: value.enrollment_no,
    program: value.program,
    semester: Number(value.semester),
    mode: value.mode,
    partner_name: value.mode === "pair" ? (value.partner_name ?? null) : null,
    partner_enrollment_no: value.mode === "pair" ? (value.partner_enrollment_no ?? null) : null,
    partner_phone: value.mode === "pair" ? (value.partner_phone ?? null) : null,
    partner_program: value.mode === "pair" ? (value.partner_program ?? null) : null,
    partner_semester: value.mode === "pair" ? Number(value.partner_semester) : null,
  }));

export const lookupSchema = z.object({
  email,
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^BL-\d{4,6}$/, "Codes look like BL-0042."),
});

export type RegisterFields = z.input<typeof registerSchema>;
export type RegisterData = z.output<typeof registerSchema>;
export type RegisterFieldName = keyof RegisterFields;
export type Mode = RegisterData["mode"];

/** What POST /api/register returns on success. Nothing else leaves the server. */
export type RegisterResult = { code: string; full_name: string; mode: Mode; program?: string; semester?: number };

/** What POST /api/lookup returns. */
export type LookupResult =
  | { found: true; code: string; full_name: string; mode: Mode; checked_in: boolean }
  | { found: false };

/** First message per field, for showing under the inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!(field in result)) result[field] = issue.message;
  }
  return result;
}
