import { randomBytes } from "node:crypto";
import { handleUpload } from "@vercel/blob/client";
import { clientIp, rateLimit, SUBMIT_LIMIT } from "@/lib/rate-limit";
import { MAX_POSTER_BYTES, POSTER_TYPES, posterExtension, posterFileError, tokenSchema } from "@/lib/submit-schema";
import { blobToken, findParticipant, json, NO_MATCH, readBody, submissionGate, tooMany } from "@/lib/submit-server";

/**
 * POST /api/submit/token   body: { email, code, filename, contentType, size }
 * Issues a short-lived Vercel Blob client-upload token for ONE file at a
 * path the server picks: posters/<participant code>-<random>.<ext>.
 * The browser then uploads straight to Vercel Blob with that token and calls
 * POST /api/submit to record the file. (onUploadCompleted is not used: it
 * cannot reach localhost, and the save step records the upload anyway.)
 *
 *   400  bad request / wrong file type / too big
 *   401  email + code do not match
 *   403  submissions are not open, or the deadline has passed
 */

/** A refusal raised inside onBeforeGenerateToken, carried out to the response. */
class Refusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(`submit-token:${clientIp(request)}`, SUBMIT_LIMIT);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const parsed = tokenSchema.safeParse(await readBody(request));
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  const { email, code, filename, contentType, size } = parsed.data;

  // The server chooses the path. The random part makes the public URL unguessable.
  const extension = posterExtension(filename);
  const pathname = `posters/${code}-${randomBytes(16).toString("hex")}.${extension ?? "bin"}`;

  try {
    const result = await handleUpload({
      request,
      token: blobToken(),
      body: { type: "blob.generate-client-token", payload: { pathname, multipart: false, clientPayload: null } },
      // Every rule is enforced here, right before the token is created.
      onBeforeGenerateToken: async (requestedPath) => {
        if (requestedPath !== pathname) throw new Refusal(400, "Invalid request.");

        // png / jpg / pdf only (extension AND content type), 15 MB at most.
        const fileProblem = posterFileError({ name: filename, type: contentType, size });
        if (fileProblem || !extension) throw new Refusal(400, fileProblem ?? "Poster must be a PNG, JPG or PDF file.");

        // Email + code are re-checked on every call.
        if (!(await findParticipant(email, code))) throw new Refusal(401, NO_MATCH);

        // Phase and deadline, decided in SQL on the database clock.
        const gate = await submissionGate();
        if (!gate.open) throw new Refusal(403, gate.message);

        return {
          allowedContentTypes: [POSTER_TYPES[extension]],
          maximumSizeInBytes: MAX_POSTER_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });

    if (result.type !== "blob.generate-client-token") throw new Error("unexpected handleUpload result");
    return json({ token: result.clientToken, pathname });
  } catch (error) {
    if (error instanceof Refusal) return json({ error: error.message }, error.status);
    console.error("[api/submit/token]", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
