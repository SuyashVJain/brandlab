// SERVER ONLY. Simple in-memory rate limiter for the public API routes.
//
// NOTE: the counters live in this process's memory, so the limit is PER
// INSTANCE. On Vercel each serverless instance keeps its own counts and they
// reset on a cold start. That is enough to slow down a script hammering one
// instance, but it is not a hard global limit. Swap this for a shared store
// (for example a table in Neon or Upstash) if a strict limit is ever needed.
//
// The key is the client IP, and campus Wi-Fi puts everyone behind ONE shared
// IP. The default is therefore generous (200 per 10 minutes) so a room full of
// students can all register; routes that need to be stricter pass their own limit.

const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 200;

/**
 * Limit for the three poster submission routes (/api/submit, /api/submit/token,
 * /api/submit/verify): 600 per 10 minutes per IP. On event day the whole room
 * submits within the same few minutes from the campus Wi-Fi, which is ONE shared
 * IP, and each student makes several calls (verify, upload token, submit, retries).
 * It stays per IP so a single script still cannot hammer the routes without end.
 */
export const SUBMIT_LIMIT = 600;

const hits = new Map<string, number[]>();

export type RateLimitResult = { ok: boolean; retryAfter: number };

/**
 * Sliding window: at most `limit` calls per `windowMs` for a key.
 * `retryAfter` is in seconds (0 when the call is allowed).
 */
export function rateLimit(key: string, limit = LIMIT, windowMs = WINDOW_MS): RateLimitResult {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }

  recent.push(now);
  hits.set(key, recent);

  // Keep the map from growing without bound.
  if (hits.size > 5000) {
    for (const [storedKey, times] of hits) {
      if (times.every((time) => now - time >= windowMs)) hits.delete(storedKey);
    }
  }
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP. Vercel (and most proxies) put it first in x-forwarded-for. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
