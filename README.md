# Alcohol Label Verification

**▶ Live demo: https://ttb-label-verifier-barnslau.vercel.app**

An AI-assisted tool for **Alcohol and Tobacco Tax and Trade Bureau (TTB)** label compliance review: confirm that an alcohol beverage label matches its COLA application — and that the mandatory Government Warning is exactly right — in seconds.

## What it checks, and why

For every product, a TTB reviewer gets two things: a **COLA application** (Certificate of Label Approval) stating what the bottle claims — brand, class/type, alcohol content, net contents, bottler, country — and an image of the **printed label**. Approving it means confirming:

1. **The label matches the application** — the producer printed what they filed.
2. **The Government Warning is exactly right** — `GOVERNMENT WARNING:` in capitals and bold (27 CFR §16.22), word-for-word the mandated statement (§16.21).

By hand this is slow, repetitive, eye-strain work, and the warning's formatting is the easiest thing to miss. This app does one label in seconds and never glosses over it.

## Using the app

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

### Try the built-in samples
Three labels are wired up so you can test instantly:

| Sample | Type | Expected result |
|---|---|---|
| 🥃 **Old Tom Distillery** | Bourbon | **Pass** |
| 🍷 **Crimson Vale** | Cabernet Sauvignon | **Pass** |
| 🍸 **Silver Birch** | Vodka | **Fail** — its "Government Warning" is in title case and not bold, which TTB rejects |
| 🍶 **Sho Chiku Bai** | Sake — *real bottle photo* | Reads a real product photo; correctly flags that the Government Warning is **not shown** (it's on the back label) |

### Batch
Switch to the **Batch** tab to screen many labels at once. Optionally upload a **CSV** (`filename, brand, class, abv, net contents, bottler, country`) to supply each label's expected values, matched by filename; without one, each label is screened for the Government Warning and internal consistency. Results fill a table as they finish (three in parallel).

### Other touches
- **Dark / light** toggle (top-right).
- **Docs** (book icon) opens this guide inside the app.
- **`/grade`** — a reviewer rubric: score the six evaluation criteria, add comments, and submit; the results are emailed to the candidate.

## What gets checked

| Field | Rule |
|-------|------|
| **Brand name** | Case/punctuation-insensitive — `"STONE'S THROW"` matches `"Stone's Throw"`. Close-but-not-exact is **Review**, not failed. |
| **Class / type** | Same fuzzy match. |
| **Alcohol content** | Parsed to a number; any difference vs. the application is flagged. |
| **Net contents** | Unit-normalized (`750 mL` = `750ML` = `750 milliliters`). |
| **Bottler name/address**, **Country of origin** | Fuzzy match (optional fields). |
| **Government Warning** | Must be present, with `GOVERNMENT WARNING:` in **capital letters and bold** (27 CFR §16.22), matching the mandatory statement **word-for-word** (27 CFR §16.21). Deviations are pinpointed. |

## How it works

**Vision reads; deterministic code decides** — two stages, deliberately separated:

1. **Read (AI).** Claude vision does perception *only*: it transcribes the label image into structured fields — brand, class/type, alcohol content, net contents, bottler, country, and the full Government Warning text. This is the stage that has to tolerate real-world photos: angle, glare, curved glass, low light.
2. **Decide (plain code).** Deterministic TypeScript compares each field to the application and renders the verdict — fuzzy match on names, numeric compare on alcohol content, unit-normalized compare on volume, and an exact word-for-word + caps + bold check on the warning.

The verdict never rides on the model "feeling" that two things match — it's testable logic, so the same input always yields the same result and every Pass / Review / Fail is explained field by field. That auditability is the point: a compliance decision has to be consistent and defensible, not a vibe. The model is swappable via `ANTHROPIC_MODEL` to trade accuracy against the ≤ 5-second target (default `claude-haiku-4-5`; `claude-sonnet-4-6` and `claude-opus-4-8` are more accurate on poor images). Full write-up in [docs/APPROACH.md](docs/APPROACH.md); security posture in [SECURITY.md](SECURITY.md).

## How it meets the reviewers' needs

| What reviewers needed | How the app delivers |
|---|---|
| **A verdict in ≤ 5 seconds** | One fast vision call (default `claude-haiku-4-5`) with a cached structured-output schema, so there's no per-request compile cost. The model is swappable. |
| **Usable by non-technical reviewers** | Two inputs and one button; plain-language, field-by-field results; one-click samples; a tooltip on every field. |
| **Many labels at once** | A **Batch** tab screens a set of images (three in parallel), with an optional CSV of expected values matched by filename. |
| **Brand names that are close but not identical** | Fuzzy, case/punctuation-insensitive matching — a near-miss becomes **Review** (human glance), not an automatic **Fail**. |
| **The Government Warning checked rigorously** | A dedicated check: present, `GOVERNMENT WARNING:` in caps and bold (§16.22), word-for-word the mandated text (§16.21); deviations are pinpointed. |
| **Imperfect, real-world photos** | Vision reads angled, glared, low-light phone photos — not just flat scans. |

## Run it yourself

```bash
npm install
cp .env.example .env.local     # set ANTHROPIC_API_KEY (required); RESEND_API_KEY optional, for /grade
npm run dev                    # http://localhost:3000
```

To deploy: push to GitHub, import the repo into Vercel, and set `ANTHROPIC_API_KEY` (plus optionally `ANTHROPIC_MODEL` and `RESEND_API_KEY`) as project environment variables. Standard Next.js — no other config.

## Built with

Next.js 16 · TypeScript · Tailwind / shadcn (Base UI) · Anthropic Claude vision (structured outputs) · Resend · Vercel.
