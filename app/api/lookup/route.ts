import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { lookupSchema, type LookupResult } from "@/lib/register-schema";

/**
 * POST /api/lookup   body: { email, code }
 * Returns the participant's status only when BOTH values match one row.
 * Every other outcome is the same { found: false }, after the same minimum
 * delay, so the response never hints which of the two was wrong.
 */

const MIN_RESPONSE_MS = 400;

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

async function findParticipant(body: unknown): Promise<LookupResult> {
  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) return { found: false };

  // A single query on both columns: there is no separate "email exists" step to time.
  const rows = await db()`
    select code, full_name, partner_name is not null as is_pair, checked_in
    from participants
    where email = ${parsed.data.email} and code = ${parsed.data.code}
    limit 1
  `;
  const row = rows[0];
  if (!row) return { found: false };

  return {
    found: true,
    code: row.code,
    full_name: row.full_name,
    mode: row.is_pair ? "pair" : "alone",
    checked_in: row.checked_in,
  };
}

export async function POST(request: Request) {
  const started = Date.now();

  const limit = rateLimit(`lookup:${clientIp(request)}`);
  if (!limit.ok) {
    return json({ error: "Too many attempts. Please try again in a few minutes." }, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let result: LookupResult = { found: false };
  let failed = false;
  try {
    result = await findParticipant(await request.json().catch(() => null));
  } catch (error) {
    failed = true;
    console.error("[api/lookup]", error instanceof Error ? error.message : "unknown error");
  }

  // Hold every answer to the same minimum duration.
  const wait = MIN_RESPONSE_MS - (Date.now() - started);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

  if (failed) return json({ error: "Something went wrong on our side. Please try again." }, 500);
  return json(result);
}
