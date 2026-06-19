# Security notes

This is a standalone prototype. Below is what's in place, and what a production deployment would add.

## In place

- **No secrets in the repo.** API keys live only in environment variables (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`), are server-side only (never shipped to the client — no `NEXT_PUBLIC_*`), and `.env*` is gitignored. Verified: no secret values in the tracked tree or in git history.
- **Nothing persisted.** Label images are processed in memory and never stored — no PII at rest, no document retention.
- **Rate limiting** on the cost/abuse-sensitive endpoints: `/api/verify` (AI spend) 20/min/IP, `/api/grade` (email) 5/min/IP.
- **Input validation.** `/api/verify` enforces a media-type allowlist (JPEG/PNG/GIF/WebP) and a ~6 MB size cap; `/api/grade` clamps scores to 1–5, caps field lengths, and HTML-escapes all user input in the email.
- **Email is not an open relay.** `/api/grade` sends from a fixed sender to a fixed recipient (`GRADE_EMAIL_TO`) — the submitter chooses neither.
- **Same-origin APIs.** No `Access-Control-Allow-Origin` is set, so browsers can't invoke the APIs cross-origin.
- **Security headers** (`next.config.ts`): HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (anti-clickjacking), `Referrer-Policy`, and a restrictive `Permissions-Policy` (camera/mic/geolocation disabled).
- **No SSRF surface.** The server never fetches user-supplied URLs; the image arrives as client-side base64.

## Production hardening (out of scope for the prototype)

- Move rate limiting to a shared store (e.g. Upstash/Redis) — the in-memory limiter is per-serverless-instance.
- Add a strict Content-Security-Policy with nonces.
- Put the tool behind authenticated, authorized COLA users; add audit logging and a document-retention policy.
- Use Azure OpenAI / an on-prem model inside the FedRAMP boundary (TTB's network blocks outbound ML endpoints).

## Key rotation

Treat any key that has appeared outside the env file as compromised: rotate it (Anthropic console / Resend), update the Vercel environment variables, redeploy, then revoke the old key.
