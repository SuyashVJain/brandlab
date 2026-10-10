import { NeonDbError } from "@neondatabase/serverless";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fieldErrors, registerSchema, type RegisterResult } from "@/lib/register-schema";

/**
 * POST /api/register
 * Creates one participant entry and returns only { code, full_name, mode }.
 *
 *   400  validation failed            { error, fields }
 *   403  phase is not 'registration'  { error }
 *   409  email / enrollment clash     { error, field }
 *   429  rate limited                 { error }
 */

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

const CLASH_MESSAGE: Record<string, string> = {
  email: "This email is already registered.",
  enrollment_no: "This enrollment number is already registered.",
  partner_enrollment_no: "Your partner's enrollment number is already registered.",
};

function conflict(field: keyof typeof CLASH_MESSAGE) {
  return json({ error: CLASH_MESSAGE[field], field }, 409);
}

/** Which unique constraint an insert tripped over, if any. */
function uniqueClash(error: unknown): "code" | "email" | "enrollment_no" | null {
  if (!(error instanceof NeonDbError) || error.code !== "23505") return null;
  if (error.constraint === "participants_code_key") return "code";
  if (error.constraint === "participants_email_key") return "email";
  if (error.constraint === "participants_enrollment_no_key") return "enrollment_no";
  return null;
}

export async function POST(request: Request) {
  const limit = rateLimit(`register:${clientIp(request)}`);
  if (!limit.ok) {
    return json({ error: "Too many attempts. Please try again in a few minutes." }, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, 400);
  }
  const input = parsed.data;

  try {
    const sql = db();

    const [state] = await sql`select phase from event_state where id = 1`;
    if (state?.phase !== "registration") {
      return json({ error: "Registration is closed." }, 403);
    }

    // One person, one entry: an enrollment number may appear only once,
    // whether as the main participant or as somebody's partner.
    const [taken] = await sql`
      select
        exists (select 1 from participants where email = ${input.email}) as email,
        exists (
          select 1 from participants
          where enrollment_no = ${input.enrollment_no} or partner_enrollment_no = ${input.enrollment_no}
        ) as enrollment_no,
        exists (
          select 1 from participants
          where enrollment_no = ${input.partner_enrollment_no} or partner_enrollment_no = ${input.partner_enrollment_no}
        ) as partner_enrollment_no
    `;
    if (taken.email) return conflict("email");
    if (taken.enrollment_no) return conflict("enrollment_no");
    if (taken.partner_enrollment_no) return conflict("partner_enrollment_no");

    // The code comes from a Postgres sequence, so two people registering at
    // the same moment never get the same one. Retry once if it ever collides.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const [row] = await sql`
          insert into participants
            (code, full_name, email, phone, enrollment_no, course_year, partner_name, partner_enrollment_no)
          values (
            'BL-' || lpad(nextval('participant_code_seq')::text, 4, '0'),
            ${input.full_name}, ${input.email}, ${input.phone}, ${input.enrollment_no},
            ${input.course_year}, ${input.partner_name}, ${input.partner_enrollment_no}
          )
          returning code, full_name
        `;
        const result: RegisterResult = { code: row.code, full_name: row.full_name, mode: input.mode };
        return json(result, 201);
      } catch (error) {
        const clash = uniqueClash(error);
        if (clash === "code" && attempt === 0) continue;
        // Someone registered the same email / enrollment between the check and the insert.
        if (clash === "email" || clash === "enrollment_no") return conflict(clash);
        throw error;
      }
    }
    throw new Error("could not allocate a participant code");
  } catch (error) {
    // Log the message only: never the error object, the input, or connection details.
    console.error("[api/register]", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
