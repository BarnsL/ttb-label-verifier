# TTB Label Verifier

**AI-assisted alcohol label compliance review for the U.S. Alcohol and Tobacco Tax and Trade Bureau (TTB).**

[![Deploy](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://ttb-label-verifier-barnslau.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)

**▶ Live demo: https://ttb-label-verifier-barnslau.vercel.app**

---

## Table of Contents

- [What It Checks, and Why](#what-it-checks-and-why)
- [Using the App](#using-the-app)
  - [Single Label](#single-label)
  - [Built-In Samples](#try-the-built-in-samples)
  - [Batch Mode](#batch)
  - [Other Features](#other-touches)
- [What Gets Checked](#what-gets-checked)
- [How It Works](#how-it-works)
- [Run It Yourself](#run-it-yourself)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Built With](#built-with)
- [Contributing](#contributing)

---

## What It Checks, and Why

For every product, a TTB reviewer receives two things: a **COLA application** (Certificate of Label Approval) stating what the bottle claims — brand, class/type, alcohol content, net contents, bottler, country — and an image of the **printed label**. Approving it means confirming:

1. **The label matches the application** — the producer printed what they filed.
2. **The Government Warning is exactly right** — `GOVERNMENT WARNING:` in capitals and bold (27 CFR §16.22), word-for-word the mandated statement (§16.21).

By hand this is slow, repetitive, eye-strain work, and the warning's formatting is the easiest thing to miss. This app does one label in seconds and never glosses over it.

---

## Using the App

### Single Label

The reviewer's workflow is two inputs and a button:

1. **Enter the application's claimed values** — brand name, class/type, alcohol content, net contents (bottler and country of origin are optional). Leave any field blank to skip it.
2. **Provide the label** — either:
   - **Click a built-in sample** (top of the page) to load a label *and* its application in one click — no upload, no typing; or
   - **Upload a label photo** (JPEG/PNG) — phone photos at an angle or with glare are fine.
3. **Press "Verify label."** In a few seconds you get a verdict:
   - 🟢 **Pass** — everything matches and the warning is compliant.
   - 🟡 **Review** — a near-miss a human should glance at (e.g. a brand typo).
   - 🔴 **Fail** — a real mismatch or a non-compliant warning, with the exact problem called out.

Each field shows *what the application said* vs. *what was read off the label*, in plain language. Hover any field label for a tooltip.

### Try the Built-In Samples

Three labels are wired up so you can test instantly:

| Sample | Type | Expected result |
|---|---|---|
| 🥃 **Old Tom Distillery** | Bourbon | **Pass** |
| 🍷 **Crimson Vale** | Cabernet Sauvignon | **Pass** |
| 🍸 **Silver Birch** | Vodka | **Fail** — its "Government Warning" is in title case and not bold, which TTB rejects |
| 🍶 **Sho Chiku Bai** | Sake — *real bottle photo* | Reads a real product photo; correctly flags that the Government Warning is **not shown** (it's on the back label) |

### Batch

Switch to the **Batch** tab to screen many labels at once. Optionally upload a **CSV** (`filename, brand, class, abv, net contents, bottler, country`) to supply each label's expected values, matched by filename; without one, each label is screened for the Government Warning and internal consistency. Results fill a table as they finish (three in parallel).

### Other Touches

- **Dark / light** toggle (top-right).
- **Docs** (book icon) opens this guide inside the app.
- **`/grade`** — a reviewer rubric: score the six evaluation criteria, add comments, and submit; the results are emailed to the candidate.

---

## What Gets Checked

| Field | Rule |
|-------|------|
| **Brand Name** | Case/punctuation-insensitive — `"STONE'S THROW"` matches `"Stone's Throw"`. Close-but-not-exact is **Review**, not failed. |
| **Class / Type** | Same fuzzy match. |
| **Alcohol Content** | Parsed to a number; any difference vs. the application is flagged. |
| **Net Contents** | Unit-normalized (`750 mL` = `750ML` = `750 milliliters`). |
| **Bottler Name / Address**, **Country of Origin** | Fuzzy match (optional fields). |
| **Government Warning** | Must be present, with `GOVERNMENT WARNING:` in **capital letters and bold** (27 CFR §16.22), matching the mandatory statement **word-for-word** (27 CFR §16.21). Deviations are pinpointed. |

---

## How It Works

**Vision reads; deterministic code decides** — two stages, deliberately separated:

1. **Read (AI).** Claude vision does perception *only*: it transcribes the label image into structured fields — brand, class/type, alcohol content, net contents, bottler, country, and the full Government Warning text. This is the stage that has to tolerate real-world photos: angle, glare, curved glass, low light.
2. **Decide (plain code).** Deterministic TypeScript compares each field to the application and renders the verdict — fuzzy match on names, numeric compare on alcohol content, unit-normalized compare on volume, and an exact word-for-word + caps + bold check on the warning.

The verdict never rides on the model "feeling" that two things match — it's testable logic, so the same input always yields the same result and every Pass / Review / Fail is explained field by field. That auditability is the point: a compliance decision has to be consistent and defensible, not a vibe. The model is swappable via `ANTHROPIC_MODEL` to trade accuracy against the ≤ 5-second target (default `claude-sonnet-4-6`, which stays accurate on low-res real-world photos; `claude-haiku-4-5` is faster/cheaper for clean labels, `claude-opus-4-8` most accurate on poor images). Full write-up in [docs/APPROACH.md](docs/APPROACH.md); security posture in [SECURITY.md](SECURITY.md).

---

## How It Meets the Reviewers' Needs

| What Reviewers Needed | How the App Delivers |
|---|---|
| **A verdict in ≤ 5 seconds** | One fast vision call (default `claude-sonnet-4-6`) with a cached structured-output schema, so there's no per-request compile cost. The model is swappable (Haiku for speed, Opus for accuracy). |
| **Usable by non-technical reviewers** | Two inputs and one button; plain-language, field-by-field results; one-click samples; a tooltip on every field. |
| **Many labels at once** | A **Batch** tab screens a set of images (three in parallel), with an optional CSV of expected values matched by filename. |
| **Brand names that are close but not identical** | Fuzzy, case/punctuation-insensitive matching — a near-miss becomes **Review** (human glance), not an automatic **Fail**. |
| **The Government Warning checked rigorously** | A dedicated check: present, `GOVERNMENT WARNING:` in caps and bold (§16.22), word-for-word the mandated text (§16.21); deviations are pinpointed. |
| **Imperfect, real-world photos** | Vision reads angled, glared, low-light phone photos — not just flat scans. |

---

## Run It Yourself

```bash
git clone https://github.com/BarnsL/ttb-label-verifier.git
cd ttb-label-verifier
npm install
cp .env.example .env.local     # set ANTHROPIC_API_KEY (required); RESEND_API_KEY optional, for /grade
npm run dev                    # http://localhost:3000
```

To deploy: push to GitHub, import the repo into Vercel, and set `ANTHROPIC_API_KEY` (plus optionally `ANTHROPIC_MODEL` and `RESEND_API_KEY`) as project environment variables. Standard Next.js — no other config needed.

---

## Project Structure

```
ttb-label-verifier/
├── docs/
│   └── APPROACH.md            ← Architecture rationale and design decisions
├── src/
│   ├── app/
│   │   ├── page.tsx           ← Main UI (single label + batch modes)
│   │   ├── layout.tsx         ← Root layout with theme provider
│   │   ├── grade/
│   │   │   └── page.tsx       ← Reviewer scorecard page
│   │   └── api/
│   │       ├── verify/        ← POST /api/verify — extraction + verification
│   │       ├── grade/         ← POST /api/grade  — reviewer email
│   │       └── readme/        ← GET  /api/readme — serves this file in-app
│   ├── lib/
│   │   ├── types.ts           ← Shared TypeScript types (schema only)
│   │   ├── extract.ts         ← Stage 1: Claude vision → ExtractedLabel
│   │   ├── verify.ts          ← Stage 2: deterministic field-by-field verdicts
│   │   ├── warning.ts         ← Government Warning check (27 CFR §§16.21–16.22)
│   │   ├── image.ts           ← Client-side image prep (downscale + JPEG re-encode)
│   │   └── ratelimit.ts       ← In-memory sliding-window rate limiter
│   └── components/
│       ├── ui/                ← shadcn/ui base components
│       ├── theme-provider.tsx
│       ├── theme-toggle.tsx
│       └── docs-dialog.tsx    ← In-app README dialog
├── public/
│   └── samples/               ← Built-in sample label images
├── .env.example               ← Environment variable documentation
├── CONTRIBUTING.md
├── LICENSE
└── SECURITY.md
```

---

## Testing

```bash
npm test            # run the Vitest unit-test suite
npm run test:watch  # watch mode
npm run test:cov    # HTML coverage report in ./coverage
```

Tests cover the pure verification engine (`src/lib/`) — no API keys needed and no network calls made. The test suite is also the behavioral specification for the verdict logic; see [`src/__tests__/warning.test.ts`](src/__tests__/warning.test.ts) and [`src/__tests__/verify.test.ts`](src/__tests__/verify.test.ts).

---

## Built With

Next.js 16 · TypeScript · Tailwind CSS / shadcn (Base UI) · Anthropic Claude vision (structured outputs) · Resend · Vercel

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code style guidance, and the PR checklist. The key design invariants to preserve: the vision model only reads the label; all verdict logic is deterministic TypeScript.
