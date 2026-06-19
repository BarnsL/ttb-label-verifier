# TTB Label Verification

**▶ Live demo: https://ttb-label-verifier-barnslau.vercel.app**

AI-assisted verification that an alcohol beverage label matches its COLA application — a standalone prototype for TTB label compliance review.

Upload a label image plus the application's claimed values; the app reads the label with AI vision and checks the brand name, class/type, alcohol content, net contents, and the mandatory Government Warning — returning a clear **Pass / Review / Fail** with plain-language reasons, in seconds. Batch mode handles many labels at once.

**Try it instantly** with the built-in **sample labels** (one click, no upload needed), and toggle **dark / light mode**. UI built on shadcn/ui. Reviewers can score the prototype at **`/grade`** — submitting emails the results to the candidate (via Resend).

## Quick start

```bash
npm install
cp .env.example .env.local     # then set ANTHROPIC_API_KEY
npm run dev                    # http://localhost:3000
```

`ANTHROPIC_API_KEY` is required. `ANTHROPIC_MODEL` is optional (default `claude-opus-4-8`).

## What it checks

| Field | Rule |
|-------|------|
| **Brand name** | Case/punctuation-insensitive — `"STONE'S THROW"` matches `"Stone's Throw"`. Close-but-not-exact is flagged **Review**, not failed. |
| **Class / type** | Same fuzzy match. |
| **Alcohol content** | Parsed to a number; any difference vs. the application is flagged. |
| **Net contents** | Unit-normalized (`750 mL` = `750ML` = `750 milliliters`). |
| **Bottler name/address** | Fuzzy match against the application (optional field). |
| **Country of origin** | Fuzzy match (optional; mainly for imports). |
| **Government Warning** | Present, with `GOVERNMENT WARNING:` in **capital letters** and **bold** (§16.22), and matching the mandatory statement **word-for-word** (27 CFR §16.21). Deviations are pinpointed. |

## How it works

The vision model **reads** the label into structured fields; deterministic code then **decides** the verdict. Perception is AI; the pass/fail decision is plain, testable logic — so results are consistent and auditable, which is what a compliance decision needs. Details in [docs/APPROACH.md](docs/APPROACH.md).

## Batch mode

Upload many images at once. Optionally add a **CSV** (`filename, brand, class, abv, net contents`) to supply each label's expected values, matched by filename. Without a CSV, each label is screened for the Government Warning and internal field consistency. Results render in a table as they complete (3 in parallel).

## The 5-second target

`ANTHROPIC_MODEL` swaps the vision model with no code change, to balance accuracy vs. the ≤5s requirement on your infrastructure:

- `claude-sonnet-4-6` (default) — ~4.5–5.0s, accurate; meets the ~5-second target
- `claude-opus-4-8` — most accurate on poor images (~5.2s)
- `claude-haiku-4-5` — fastest, lowest cost

The result footer shows the actual elapsed time and flags anything over 5s. (The very first request also pays a one-time schema compile of a few seconds, cached for 24h.)

## Test labels

A sample label is in [`public/sample-label.svg`](public/sample-label.svg) — open it in a browser and screenshot it to PNG to try the app. You can also AI-generate labels (the assessment suggests this) or photograph real bottles.

## Deploy

Push to GitHub, import into **Vercel**, and set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) as project environment variables. Standard Next.js; the `/api/verify` function has a 30-second ceiling.

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Anthropic Claude vision (structured outputs) · Vercel.
