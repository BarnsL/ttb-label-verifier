# Security

This document covers the security posture of TTB Label Verifier — what protections are in place, known limitations, and how to report vulnerabilities.

---

## Current Protections

### Secrets & API Keys

- **No secrets in the repository.** `ANTHROPIC_API_KEY` and `RESEND_API_KEY` live only in environment variables, are server-side only (no `NEXT_PUBLIC_*` prefix), and `.env*` is gitignored.
- **No keys in the client bundle.** Verified: no secret values in the tracked tree or in git history. The Anthropic SDK is invoked only inside `src/lib/extract.ts` on the Node.js runtime, never from the browser.
- **Model allowlist.** The `model` body parameter on `/api/verify` is checked against an enumerated allowlist (`sonnet`, `haiku`); arbitrary model strings are rejected.

### Rate Limiting

- **`/api/verify`:** 20 requests / minute / IP.
- **`/api/grade`:** 5 requests / minute / IP (email abuse prevention).
- **Distribution:** When `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured, rate limits are shared across all Vercel serverless instances via Upstash Redis sliding-window counters. Without these, the app falls back to a per-instance in-memory limiter (adequate for single-instance or low-traffic deployments).
- **Rate-limit headers:** 429 responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers when Upstash is active.

### Input Validation

- **Media type allowlist:** `/api/verify` accepts only `image/jpeg`, `image/png`, `image/gif`, `image/webp`. Unexpected MIME types return 400.
- **Payload size cap:** Base64 payload is capped at ~8.5 MB (≈ 6.4 MB decoded). Larger payloads return 413.
- **Score clamping:** `/api/grade` clamps scores to the range 1–5.
- **Field length caps:** Reviewer name (120 chars), recommendation (40 chars), comments (4000 chars).
- **HTML escaping:** All user-supplied strings are HTML-escaped via `esc()` before insertion into the email body (prevents email HTML injection).

### No SSRF Surface

The server never fetches user-supplied URLs. Images are transmitted as client-side base64, so there is no URL-fetch path for server-side request forgery.

### No Persistent Storage

Label images and COLA form data are processed in memory and discarded after each request. Rate-limit counters are the only server-side state and expire automatically.

### Email Is Not an Open Relay

`/api/grade` sends from a fixed `GRADE_EMAIL_FROM` env var to a fixed `GRADE_EMAIL_TO` env var. The submitter can control neither the sender nor the recipient.

### HTTP Security Headers

Applied to every response via `src/middleware.ts` (Next.js Edge middleware):

| Header | Value |
|---|---|
| `Content-Security-Policy` | Restricts sources; `unsafe-inline` required for Next.js App Router hydration (nonce-based hardening planned) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables camera, mic, geolocation, payment |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `X-Permitted-Cross-Domain-Policies` | `none` |

### Privacy & Compliance

- **Global Privacy Control (GPC):** When the browser sends `Sec-GPC: 1`, middleware sets a `gpc-optout` cookie; the cookie banner reads this and pre-selects "Reject Non-Essential."
- **CCPA/CPRA:** Privacy Policy at `/privacy`, Terms of Service at `/terms`, "Do Not Sell" opt-out link in the footer, cookie consent banner with granular categories.
- **Age gate:** Alcohol content requires 21+ verification before accessing the tool; stored in localStorage for 30 days.

---

## Known Limitations

| Issue | Status |
|---|---|
| `unsafe-inline` in CSP | Required by Next.js App Router hydration. A nonce-based CSP would eliminate this. Planned for production hardening. |
| `postcss` moderate advisory | Lives inside Next.js internals (`node_modules/next/.../postcss`). Cannot be resolved without downgrading Next.js. Monitoring upstream for a fix. |
| Rate limiting fallback | In-memory fallback when Upstash is unavailable is per-serverless-instance; not shared across instances. Normal traffic is unaffected. |

### Dependency Audit (as of 2026-06-19)

Run `npm audit` to see the current state. Status after mitigations applied:
- **esbuild** (low, dev-only): Updated to 0.28.1. ✅ Fixed.
- **postcss** (moderate, inside Next.js): Cannot fix without breaking Next.js version downgrade. ⚠️ Documented/accepted.

---

## Production Hardening Checklist

For a real FedRAMP / TTB production deployment, additionally:

- [ ] Move to Azure OpenAI (or an on-prem model) inside the FedRAMP boundary — TTB's network blocks outbound ML API calls.
- [ ] Add authenticated, authorized access (COLA user accounts, audit logging).
- [ ] Implement nonce-based CSP to eliminate `unsafe-inline`.
- [ ] Add a document-retention policy and audit log for any label data reviewed.
- [ ] Enable Vercel Bot Protection (or similar WAF) for automated bot filtering.

---

## Key Rotation

Treat any key that has appeared outside its env file as compromised:

1. Rotate the key (Anthropic console / Resend / Upstash).
2. Update the Vercel environment variables.
3. Redeploy the project.
4. Revoke the old key.

Do **not** push a new key to the repository — environment variables in Vercel are the correct storage location.

---

## Responsible Disclosure

To report a security vulnerability:

- **Email:** purpleindustries@pm.me — subject line: *Security Vulnerability Report — TTB Label Verifier*
- **GitHub:** [Open a Security Advisory](https://github.com/BarnsL/ttb-label-verifier/security/advisories/new)

Please include: steps to reproduce, potential impact, and a suggested mitigation. We acknowledge within 72 hours and aim to resolve critical issues within 14 days.
