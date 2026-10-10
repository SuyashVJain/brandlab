import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifySchema, type VerifyResult } from "@/lib/submit-schema";
import { holdUntil, json, readBody, tooMany } from "@/lib/submit-server";

/**
 * POST /api/submit/verify   body: { email, code }
 * Same rules as /api/lookup: both values must match one participant. Every
 * other outcome is the same { ok: false } after the same minimum delay.
 * On success it also returns that participant's current submission, if any.
 */

const MIN_RESPONSE_MS = 400;

async function verify(body: unknown): Promise<VerifyResult> {
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return { ok: false };

  const rows = await db()`
    select p.full_name, p.partner_name is not null as is_pair,
           s.event_name, s.tagline, s.poster_url, s.submitted_at
    from participants p
    left join submissions s on s.participant_id = p.id
    where p.email = ${parsed.data.email} and p.code = ${parsed.data.code}
    limit 1
  `;
  const row = rows[0];
  if (!row) return { ok: false };

  return {
    ok: true,
    full_name: row.full_name,
    mode: row.is_pair ? "pair" : "alone",
    submission: row.poster_url
      ? {
          event_name: row.event_name,
          tagline: row.tagline,
          poster_url: row.poster_url,
          submitted_at: new Date(row.submitted_at).toISOString(),
        }
      : null,
  };
}

export async function POST(request: Request) {
  const started = Date.now();

  const limit = rateLimit(`submit-verify:${clientIp(request)}`, 60, 10 * 60 * 1000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  let result: VerifyResult = { ok: false };
  let failed = false;
  try {
    result = await verify(await readBody(request));
  } catch (error) {
    failed = true;
    console.error("[api/submit/verify]", error instanceof Error ? error.message : "unknown error");
  }

  await holdUntil(started, MIN_RESPONSE_MS);
  if (failed) return json({ error: "Something went wrong on our side. Please try again." }, 500);
  return json(result);
}
