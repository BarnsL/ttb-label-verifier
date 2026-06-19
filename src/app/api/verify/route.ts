/**
 * @file app/api/verify/route.ts
 * POST /api/verify — the core verification endpoint.
 *
 * Receives a base64-encoded label image and COLA application values, runs the
 * two-stage pipeline (Claude vision extraction → deterministic verification),
 * and returns a `VerificationResult`.
 *
 * Request body (JSON):
 *   {
 *     imageBase64: string,          // required — base64 image data (no data: prefix)
 *     mediaType?:  string,          // optional — MIME type; defaults to "image/jpeg"
 *     expected?:   ExpectedFields,  // optional — COLA application values to compare against
 *   }
 *
 * Success response (200):
 *   { result: VerificationResult }
 *
 * Error responses:
 *   400 — missing or invalid request parameters
 *   413 — image payload too large (~6 MB limit)
 *   429 — rate limit exceeded (20 requests / minute / IP)
 *   500 — ANTHROPIC_API_KEY not configured on the server
 *   502 — extraction or verification failed (upstream error detail included)
 *
 * Security:
 *   - Rate-limited to 20 requests / minute / IP (in-memory, per-instance).
 *   - Media type is checked against an allowlist before the image reaches the model.
 *   - Payload size is capped at ~6 MB (8,500,000 base64 chars ≈ 6.4 MB decoded).
 *   - ANTHROPIC_API_KEY is server-side only; never sent to the browser.
 *   - No images are stored — processing is entirely in memory.
 */

import { extractLabel, MODEL } from "@/lib/extract";
import { verifyLabel } from "@/lib/verify";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import type { ExpectedFields } from "@/lib/types";

// Use Node.js runtime (not Edge) because the Anthropic SDK uses Node APIs.
export const runtime = "nodejs";

// Opt out of static rendering so each request is handled dynamically.
export const dynamic = "force-dynamic";

// Vercel function timeout ceiling — well above the ~5 s target but needed as a
// hard upper bound so stuck requests don't bill indefinitely.
export const maxDuration = 30;

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/** Accepted image MIME types. Rejects unexpected formats before hitting the model. */
const ALLOWED_MEDIA = new Set<ImageMediaType>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/**
 * Reader models the UI is allowed to request, mapped to full Claude model ids.
 * Any other value falls back to the env-configured default (MODEL). This keeps
 * arbitrary, client-controlled model strings from reaching the Anthropic API.
 */
const MODEL_CHOICES: Record<string, string> = {
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5",
};

/** Shape of the JSON request body. */
interface Body {
  imageBase64?: string;
  mediaType?: string;
  expected?: ExpectedFields;
  model?: string;
}

/**
 * Build a JSON `Response` with the given status code.
 * Centralizes the Content-Type header so every response is consistent.
 */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Handle POST /api/verify.
 *
 * Validates the request, runs the pipeline, and returns a `VerificationResult`.
 * Errors at each stage produce a specific HTTP status and a plain-language
 * `error` message suitable for display in the UI.
 */
export async function POST(req: Request): Promise<Response> {
  // Guard: refuse immediately if the API key is not configured on this deployment.
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(
      {
        error:
          "Server is missing ANTHROPIC_API_KEY. Add it to the environment to enable verification.",
      },
      500,
    );
  }

  // Rate limit: 20 verify requests per minute per client IP.
  if (!rateLimit(`verify:${clientIp(req)}`, 20, 60_000)) {
    return json({ error: "Too many requests — please wait a moment and try again." }, 429);
  }

  // Parse the request body.
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const { imageBase64, mediaType = "image/jpeg", expected = {} } = body;

  // Resolve the requested reader to an allowlisted model id; default to MODEL.
  const model = (body.model && MODEL_CHOICES[body.model]) || MODEL;

  // Validate required fields.
  if (!imageBase64) {
    return json({ error: "Missing 'imageBase64'." }, 400);
  }

  if (!ALLOWED_MEDIA.has(mediaType as ImageMediaType)) {
    return json(
      { error: `Unsupported mediaType '${mediaType}'. Use JPEG, PNG, GIF, or WebP.` },
      400,
    );
  }

  // Cap payload size: 8,500,000 base64 chars ≈ 6.4 MB decoded — well above any
  // realistic label photo after client-side downscaling to 1600 px.
  if (imageBase64.length > 8_500_000) {
    return json({ error: "Image too large (~6 MB max). Please upload a smaller image." }, 413);
  }

  const started = Date.now();

  try {
    // Stage 1: Vision extraction — what does the label say?
    const extracted = await extractLabel(imageBase64, mediaType as ImageMediaType, model);

    // Stage 2: Deterministic verification — does it match the application?
    const result = verifyLabel(expected, extracted, {
      model,
      elapsedMs: Date.now() - started,
    });

    return json({ result });
  } catch (e) {
    // Surface the error message for debugging while keeping the HTTP status
    // as 502 (bad gateway) to distinguish from client-side 4xx errors.
    return json(
      {
        error: "Verification failed.",
        detail: e instanceof Error ? e.message : String(e),
      },
      502,
    );
  }
}
