# Alcohol Label Verification

**▶ Live demo: https://ttb-label-verifier-barnslau.vercel.app**

An AI-assisted tool for **Alcohol and Tobacco Tax and Trade Bureau (TTB)** label compliance review: confirm that an alcohol beverage label matches its COLA application — and that the mandatory Government Warning is exactly right — in seconds.

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

The vision model **reads** the label into structured fields; deterministic code then **decides** the verdict. Perception is AI; the pass/fail decision is plain, testable logic — so results are consistent and auditable, which a compliance decision needs. The model is swappable via `ANTHROPIC_MODEL` to balance accuracy against the ≤ 5-second target (default `claude-sonnet-4-6`). Full write-up in [docs/APPROACH.md](docs/APPROACH.md); security posture in [SECURITY.md](SECURITY.md).

## Run it yourself

```bash
npm install
cp .env.example .env.local     # set ANTHROPIC_API_KEY (required); RESEND_API_KEY optional, for /grade
npm run dev                    # http://localhost:3000
```

To deploy: push to GitHub, import the repo into Vercel, and set `ANTHROPIC_API_KEY` (plus optionally `ANTHROPIC_MODEL` and `RESEND_API_KEY`) as project environment variables. Standard Next.js — no other config.

## Built with

Next.js 16 · TypeScript · Tailwind / shadcn (Base UI) · Anthropic Claude vision (structured outputs) · Resend · Vercel.
