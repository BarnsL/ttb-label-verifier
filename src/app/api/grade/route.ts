/**
 * @file app/api/grade/route.ts
 * POST /api/grade — reviewer scorecard email endpoint.
 *
 * Accepts a structured scorecard (reviewer name, 1–5 scores per criterion,
 * recommendation, free-text comments) and sends a formatted HTML email to
 * the candidate via Resend.  This endpoint is intended for TTB reviewers
 * evaluating the prototype, not for end-user label verification.
 *
 * Request body (JSON):
 *   {
 *     reviewer?:       string,                    // reviewer's name (optional)
 *     scores?:         Record<string, number>,    // criterion → 1–5 score
 *     recommendation?: string,                    // "Advance" | "Maybe" | "Do not advance"
 *     comments?:       string,                    // free-text (max 4000 chars)
 *   }
 *
 * Success response (200):
 *   { ok: true, total: number, max: number }
 *
 * Error responses:
 *   400 — malformed request body
 *   429 — rate limit exceeded (5 requests / minute / IP)
 *   500 — RESEND_API_KEY not configured on the server
 *   502 — email send failed (Resend API error detail included)
 *
 * Security:
 *   - Rate-limited to 5 requests / minute / IP to prevent email spam.
 *   - Sender and recipient are fixed server-side env vars — the submitter
 *     cannot redirect the email to an arbitrary address (not an open relay).
 *   - Scores are clamped to 1–5; field lengths are capped to prevent abuse.
 *   - All user-supplied strings are HTML-escaped before insertion into the email.
 *   - RESEND_API_KEY is server-side only; never sent to the browser.
 */

import { clientIp } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-upstash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Evaluation criteria scored by the reviewer.
 * Must match the criteria array in `src/app/grade/page.tsx` exactly — both
 * the UI and the email template use this list as the source of truth.
 */
const CRITERIA = [
  "Correctness & completeness of core requirements",
  "Code quality & organization",
  "Appropriate technical choices for the scope",
  "User experience & error handling",
  "Attention to requirements",
  "Creative problem-solving",
];

/** Shape of the JSON request body. */
interface Body {
  reviewer?: string;
  scores?: Record<string, number>;
  recommendation?: string;
  comments?: string;
}

/**
 * Build a JSON `Response` with the given status code.
 */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Escape the four HTML special characters that could enable injection into
 * the email body: `&`, `<`, `>`, `"`.
 *
 * Applied to all user-supplied strings before they are inserted into the HTML
 * template — prevents a reviewer's name or comment from breaking the markup.
 *
 * @param s - Raw user input.
 * @returns  HTML-safe string.
 */
function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

/**
 * Handle POST /api/grade.
 *
 * Validates the scorecard, builds a formatted HTML email, and sends it via
 * the Resend API.  Returns the total score on success so the UI can display it.
 */
export async function POST(req: Request): Promise<Response> {
  // Guard: this endpoint requires Resend to be configured.
  if (!process.env.RESEND_API_KEY) {
    return json(
      { error: "Email is not configured on this deployment (missing RESEND_API_KEY)." },
      500,
    );
  }

  // Rate limit: 5 grade submissions per minute per IP — prevents email spam.
  const rl = await checkRateLimit(`grade:${clientIp(req)}`, 5, 60);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests — please wait a moment." }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...(rl.headers ?? {}) },
    });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  // Validate and sanitize scores: each criterion must be an integer 1–5.
  // Any missing or out-of-range value is recorded as 0 (not scored).
  const scores = body.scores ?? {};
  const vals = CRITERIA.map((c) => {
    const n = Number(scores[c]);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : 0;
  });
  const total = vals.reduce((a, b) => a + b, 0);
  const max   = CRITERIA.length * 5; // 30

  // Sanitize free-text inputs: cap lengths to prevent abuse.
  const reviewer       = (body.reviewer       || "Anonymous reviewer").slice(0, 120);
  const recommendation = (body.recommendation || "—").slice(0, 40);
  const comments       = (body.comments       || "").slice(0, 4000);
  const when           = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

  // Build the score table rows — one row per criterion.
  const rows = CRITERIA.map(
    (c, i) =>
      `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(c)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;font-weight:600">${vals[i] || "—"} / 5</td>
      </tr>`,
  ).join("");

  // HTML email body — table layout for maximum email-client compatibility.
  const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;color:#111">
    <h2 style="margin:0 0 4px">TTB Label Verifier — review submitted</h2>
    <p style="color:#666;margin:0 0 16px">From <b>${esc(reviewer)}</b> · ${esc(when)} ET</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      ${rows}
      <tr>
        <td style="padding:8px 10px;font-weight:700">Total</td>
        <td style="padding:8px 10px;text-align:center;font-weight:700">${total} / ${max}</td>
      </tr>
    </table>
    <p style="margin:16px 0 4px"><b>Recommendation:</b> ${esc(recommendation)}</p>
    ${
      comments
        ? `<p style="margin:8px 0"><b>Comments:</b><br>${esc(comments).replace(/\n/g, "<br>")}</p>`
        : ""
    }
  </div>`;

  try {
    // POST to the Resend API — the only outbound network call this route makes.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.GRADE_EMAIL_FROM || "TTB Label Verifier <onboarding@resend.dev>",
        to:   [process.env.GRADE_EMAIL_TO  || "purpleindustries@pm.me"],
        subject: `TTB review: ${total}/${max} — ${reviewer}`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      return json({ error: "Email send failed.", detail }, 502);
    }

    return json({ ok: true, total, max });
  } catch (e) {
    return json(
      { error: "Email send failed.", detail: e instanceof Error ? e.message : String(e) },
      502,
    );
  }
}
