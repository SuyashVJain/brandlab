import { BlobNotFoundError, del, head } from "@vercel/blob";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fieldErrors } from "@/lib/register-schema";
import { saveSchema } from "@/lib/submit-schema";
import {
  blobToken,
  findParticipant,
  isOwnPosterUrl,
  json,
  NO_MATCH,
  readBody,
  submissionGate,
  tooMany,
} from "@/lib/submit-server";

/**
 * POST /api/submit   body: { email, code, event_name, tagline, poster_url }
 * Saves (or replaces) the caller's one submission. The participant is taken
 * from email + code on every call, never from the request, so nobody can
 * write to another participant's row.
 *
 *   400  validation failed, or the poster link is not this participant's upload
 *   401  email + code do not match
 *   403  submissions are not open, or the deadline has passed
 */
export async function POST(request: Request) {
  const limit = rateLimit(`submit:${clientIp(request)}`, 300, 10 * 60 * 1000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const parsed = saveSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    return json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, 400);
  }
  const input = parsed.data;

  try {
    const participant = await findParticipant(input.email, input.code);
    if (!participant) return json({ error: NO_MATCH }, 401);

    // Must be a file on our blob store under posters/<this participant's code>-.
    if (!isOwnPosterUrl(input.poster_url, participant.code)) {
      return json({ error: "That poster link is not one of your uploads. Please upload the poster again." }, 400);
    }
    // ...and the file must really be there.
    try {
      await head(input.poster_url, { token: blobToken() });
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return json({ error: "We could not find that upload. Please upload the poster again." }, 400);
      }
      throw error;
    }

    // One statement: the phase + deadline check (database clock) and the upsert
    // happen together, so a submission can never slip in after the deadline.
    const rows = await db()`
      with gate as (
        select 1 from event_state
        where id = 1
          and phase = 'submissions_open'
          and (submissions_close_at is null or now() < submissions_close_at)
      ),
      previous as (
        select poster_url from submissions where participant_id = ${participant.id}
      ),
      saved as (
        insert into submissions (participant_id, event_name, tagline, poster_url)
        select ${participant.id}, ${input.event_name}, ${input.tagline || null}, ${input.poster_url}
        from gate
        on conflict (participant_id) do update
          set event_name = excluded.event_name,
              tagline = excluded.tagline,
              poster_url = excluded.poster_url,
              submitted_at = now(),
              updated_at = now()
        returning submitted_at
      )
      select saved.submitted_at, (select poster_url from previous) as old_poster_url
      from saved
    `;
    const row = rows[0];
    if (!row) {
      const gate = await submissionGate();
      return json({ error: gate.message || "Submissions are closed." }, 403);
    }

    // Replaced: remove the old file. A failed delete must never fail the submission.
    if (row.old_poster_url && row.old_poster_url !== input.poster_url) {
      try {
        await del(row.old_poster_url, { token: blobToken() });
      } catch (error) {
        console.error("[api/submit] old poster not deleted:", error instanceof Error ? error.message : "unknown");
      }
    }

    return json({ ok: true, submitted_at: new Date(row.submitted_at).toISOString() });
  } catch (error) {
    console.error("[api/submit]", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
