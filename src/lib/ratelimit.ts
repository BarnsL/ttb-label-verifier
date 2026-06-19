/**
 * @file ratelimit.ts
 * Best-effort in-memory per-IP rate limiter for the API endpoints.
 *
 * How it works: for each (key, window) pair, it keeps a sliding window of
 * request timestamps and rejects requests that exceed the configured limit.
 *
 * Limitations of this approach (intentional for a prototype):
 *   - **Per-instance, not shared.** On Vercel's serverless platform each cold
 *     start gets a fresh in-memory state, so the limit is per-instance rather
 *     than global.  Two concurrent instances each allow `max` requests.
 *     Production: replace with Upstash Redis + `@upstash/ratelimit`.
 *   - **Not IP-spoofing-resistant.** IP is read from `X-Forwarded-For`; a
 *     determined attacker can rotate IPs.  This is sufficient to curb casual
 *     abuse of a prototype, not a production security control.
 *
 * See `src/app/api/verify/route.ts` and `src/app/api/grade/route.ts` for usage.
 */

/**
 * Map from rate-limit key to an array of request timestamps (in ms since epoch).
 * Entries are pruned when they age out of the current window, and the whole
 * map is GC'd when it grows beyond 5000 keys.
 */
const hits = new Map<string, number[]>();

/**
 * Check whether a request identified by `key` is allowed under the sliding-
 * window rate limit of `max` requests within `windowMs` milliseconds.
 *
 * This function is both the check AND the counter — calling it records the
 * current request.  Do not call it speculatively; call it once per incoming
 * request and act on the return value.
 *
 * @param key      - Unique identifier for the rate-limit bucket, e.g.
 *                   `"verify:192.0.2.1"` or `"grade:10.0.0.5"`.
 *                   Typically `"<endpoint>:<client-ip>"`.
 * @param max      - Maximum number of requests allowed within `windowMs`.
 * @param windowMs - Duration of the sliding window in milliseconds.
 * @returns `true` if the request is within the limit and has been counted;
 *          `false` if the limit has been exceeded (the request is NOT counted).
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  // Keep only timestamps within the current window; older ones don't count.
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    // Over the limit — update the stored slice (drop expired entries) but don't add.
    hits.set(key, recent);
    return false;
  }

  // Under the limit — record this request and allow it through.
  recent.push(now);
  hits.set(key, recent);

  // Periodic GC: if the map has grown large, sweep out fully-expired entries.
  // Triggered lazily rather than on a timer so there's no background work in serverless.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t > windowMs)) hits.delete(k);
    }
  }

  return true;
}

/**
 * Extract the best-available client IP from an incoming `Request`.
 *
 * Prefers `X-Forwarded-For` (set by Vercel's edge network) over
 * `X-Real-IP`, and falls back to `"unknown"` when neither header is present
 * (e.g. direct local requests during development).
 *
 * @param req - The incoming Next.js Route Handler `Request` object.
 * @returns   The client IP as a string, or `"unknown"`.
 */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
