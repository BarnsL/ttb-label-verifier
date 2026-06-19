# Contributing to TTB Label Verifier

Thank you for your interest in contributing. This document describes how to get the project running locally and what to keep in mind before opening a pull request.

## Development setup

**Prerequisites:** Node.js ≥ 20, npm ≥ 10, an Anthropic API key.

```bash
git clone https://github.com/BarnsL/ttb-label-verifier.git
cd ttb-label-verifier
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY at minimum
npm run dev                  # http://localhost:3000
```

The `/grade` email endpoint also requires `RESEND_API_KEY`. See [`.env.example`](.env.example) for all options.

## Running the tests

```bash
npm test            # run the Vitest unit-test suite once
npm run test:watch  # watch mode — re-runs on file changes
npm run test:cov    # generate an HTML coverage report in ./coverage
```

The tests cover the pure verification engine in `src/lib/` — no API keys needed and no network calls made.

## Architecture overview

```
src/
  lib/
    types.ts      — shared TypeScript types for the entire engine
    extract.ts    — vision model call (Claude structured output → ExtractedLabel)
    verify.ts     — deterministic field-by-field comparison logic
    warning.ts    — Government Warning word-for-word check (27 CFR §16.21)
    image.ts      — client-side image prep (resize + re-encode to JPEG)
    ratelimit.ts  — in-memory per-IP rate limiter
    utils.ts      — Tailwind className helper
  app/
    page.tsx      — main UI (single + batch modes)
    grade/        — reviewer scorecard page
    api/verify/   — POST: runs extractLabel + verifyLabel, returns VerificationResult
    api/grade/    — POST: sends reviewer scorecard email via Resend
    api/readme/   — GET: serves README.md for the in-app docs dialog
```

The two-stage architecture is the core design: **Claude does the reading** (perception — handling glare, angle, low light), **TypeScript does the deciding** (deterministic, auditable verdicts). Keep those layers separate. See [`docs/APPROACH.md`](docs/APPROACH.md) for the full rationale.

## Code style

- TypeScript everywhere. `npm run lint` must pass before opening a PR.
- Comment **why**, not what. Every non-obvious function, edge case, or CFR reference should have an inline comment or JSDoc block. See `src/lib/verify.ts` for the target level of annotation.
- Follow existing naming conventions (`camelCase` for functions, `PascalCase` for types/interfaces, `SCREAMING_SNAKE` for module-level constants).

## Deterministic verdict layer (important)

The functions in `src/lib/verify.ts` and `src/lib/warning.ts` must never call the AI model. Their purpose is to be fully deterministic and unit-testable. If you're adding a new check:

1. Add the type to `src/lib/types.ts`.
2. Implement the check as a pure function in `src/lib/verify.ts`.
3. Write a corresponding spec in `src/__tests__/verify.test.ts`.

## Government Warning text

The canonical warning text lives in `src/lib/warning.ts` (`CANONICAL_GOVERNMENT_WARNING`). **Do not edit this string.** It is taken verbatim from 27 CFR §16.21 and is the legal standard against which every label is checked. If the CFR is amended, update the string and the citation together.

## Pull request checklist

- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] New or changed logic has corresponding tests
- [ ] Environment variable additions are documented in `.env.example`
- [ ] Security-sensitive changes are noted in `SECURITY.md`

## Security

Please read [`SECURITY.md`](SECURITY.md) before touching the API routes, image handling, or email logic. Never add `NEXT_PUBLIC_` prefixes to keys — server-side secrets must stay server-side.
