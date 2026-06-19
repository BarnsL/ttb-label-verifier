/**
 * @file ratelimit-upstash.ts
 * Distributed rate limiter backed by Upstash Redis, with automatic fallback to
 * the in-memory limiter when Upstash is not configured.
 *
 * Why Upstash?
 *   The built-in in-memory limiter (ratelimit.ts) is per-serverless-instance.
 *   On Vercel with concurrent cold starts, each instance gets its own counter,
 *   so the effective limit is (limit × number-of-instances).  Upstash uses a
 *   shared Redis store over HTTPS, giving a single global counter across all
 *   instances — the correct behaviour for abuse prevention.
 *
 * Setup (Vercel dashboard or .env.local):
 *   UPSTASH_REDIS_REST_URL   = https://your-db.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN = AXxx...
 *
 *   Get these from console.upstash.com (free tier supports this use case).
 *   Without them, the in-memory fallback is used automatically.
 *
 * Usage:
 *   const { allowed, headers } = await checkRateLimit("verify:1.2.3.4", 20, 60);
 *   if (!allowed) return json({ error: "Rate limit exceeded" }, 429);
 *   // Optionally attach rate-limit headers to the response:
 *   Object.entries(headers ?? {}).forEach(([k, v]) => res.headers.set(k, v));
 */

import { rateLimit as inMemoryRateLimit } from "./ratelimit";

/** Result of a rate-limit check. */
export interface RateLimitResult {
  /** Whether the request is within the allowed limit. */
  allowed: boolean;
  /**
   * Optional RFC-standard rate-limit headers to add to the response.
   * Only populated when Upstash is in use.
   */
  headers?: Record<string, string>;
}

/**
 * Check a sliding-window rate limit.
 *
 * Uses Upstash Redis when configured (shared across all serverless instances),
 * falls back to the in-memory limiter otherwise (per-instance — adequate for
 * low-traffic deployments).
 *
 * @param key           - Unique bucket key, e.g. `"verify:192.0.2.1"`.
 * @param max           - Maximum requests allowed within the window.
 * @param windowSeconds - Window duration in seconds.
 * @returns `{ allowed, headers }` — `allowed` is true when the request proceeds.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return checkUpstash(key, max, windowSeconds);
  }

  // In-memory fallback — converts seconds to ms for the existing limiter.
  const allowed = inMemoryRateLimit(key, max, windowSeconds * 1000);
  return { allowed };
}

/**
 * Perform a rate-limit check against Upstash Redis using a sliding window.
 * Creates a new `Ratelimit` client per call — safe for serverless because
 * `@upstash/ratelimit` communicates over HTTP (no persistent connection).
 *
 * Fails **open** on Upstash errors (the request proceeds) to prevent Upstash
 * outages from taking down the app.  The in-process in-memory limiter in the
 * API routes provides a secondary line of defense.
 *
 * @param key           - Unique bucket key.
 * @param max           - Max requests in the window.
 * @param windowSeconds - Window duration in seconds.
 * @returns `{ allowed, headers }`.
 */
async function checkUpstash(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    // Dynamic imports keep the Upstash packages out of the cold-start critical
    // path when Upstash is not configured, and avoid Node/Edge runtime issues.
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis }     = await import("@upstash/redis");

    const limiter = new Ratelimit({
      redis:   Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
      prefix:  "ttb",    // namespace so TTB keys don't collide with other apps
      analytics: false,  // opt out of Upstash analytics telemetry
    });

    const { success, limit, remaining, reset } = await limiter.limit(key);

    return {
      allowed: success,
      // RFC-standard headers inform the client about the rate-limit state.
      headers: {
        "X-RateLimit-Limit":     String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset":     String(reset),
      },
    };
  } catch (err) {
    // Log but don't propagate — fail open so an Upstash outage doesn't block all users.
    console.error("[ratelimit-upstash] Upstash check failed, failing open:", err);
    return { allowed: true };
  }
}
