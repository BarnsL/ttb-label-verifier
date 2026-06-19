# Approach — TTB Label Verifier

This document explains the technical and design decisions behind the TTB Label Verifier: why the architecture is split the way it is, how every stakeholder requirement maps to code, and what tradeoffs were made for this prototype vs. a production deployment.

---

## The Core Design: Perception vs. Decision

The most important architectural choice is the strict separation of **reading** (what the label says) from **deciding** (whether it complies).

```
Label image + COLA application values
         │
         ▼
┌──────────────────────────┐
│  Stage 1: Extract        │  ← Claude vision (src/lib/extract.ts)
│  "What does the label    │
│   actually say?"         │
└────────────┬─────────────┘
             │  ExtractedLabel (schema-validated JSON)
             ▼
┌──────────────────────────┐
│  Stage 2: Verify         │  ← Deterministic TypeScript (src/lib/verify.ts,
│  "Does it match the      │                               src/lib/warning.ts)
│   application?"          │
└────────────┬─────────────┘
             │  VerificationResult
             ▼
        Pass / Review / Fail
```

### Why This Split?

**AI makes a poor judge.** Large language models excel at perception but are statistically inconsistent judges: the same input can get different verdicts across calls, and the reasoning isn't auditable. A compliance tool must be *consistent* and *defensible* — a TTB reviewer must be able to explain why a label failed, and "the model felt it didn't match" is not a legal justification.

**Deterministic code makes a poor reader.** OCR and rule-based image parsing cannot reliably handle real-world label photos: glare off glass, camera angles, curved bottle surfaces, varying print quality, and dual-language layouts all defeat naive text extraction.

**Together, they cover both.** Claude handles the hard perception problem (tolerating real-world images); TypeScript handles the consistency requirement (same input always yields the same verdict). The verdict logic is fully unit-testable — given any `ExtractedLabel`, `verifyLabel()` is deterministic and auditable. See `src/__tests__/` for the test suite.

---

## Stage 1: Label Extraction (Claude Vision)

### Structured Output

The extraction call uses Claude's structured output mode (`output_config.format.type = "json_schema"`) with a schema that requires every field and uses sentinel values for absent ones (`""` for strings, `-1` for ABV). This guarantees a predictable, schema-valid JSON object from the model — no fragile parsing to handle missing keys.

The schema and system prompt live in `src/lib/extract.ts`. The system prompt emphasizes **verbatim transcription**: the model must copy text exactly as printed, including capitalization and punctuation. This is critical because:

- The Government Warning is checked character-by-character against the canonical CFR text.
- The verdict layer — not the model — decides whether a near-miss passes or fails. The model's job is perception only.

### Thinking Is Disabled

Claude 3+ models support extended thinking (chain-of-thought reasoning). Thinking is explicitly disabled here (`thinking: { type: "disabled" }`) because:

1. The task is *perception*, not *reasoning* — the model reads pixels and transcribes text; thinking adds latency with no accuracy benefit for this task type.
2. The 5-second SLA has no headroom for the extra tokens thinking generates.

### Model Selection

The model is env-configurable via `ANTHROPIC_MODEL`. The default is `claude-sonnet-4-6`:

| Model | Typical latency | Best for |
|---|---|---|
| `claude-haiku-4-5` | 1.5–2.5 s | Clean, flat studio-shot labels; batch at scale |
| `claude-sonnet-4-6` | 3–4.5 s | **Default.** Real-world phone photos (glare, angle, low light) within the 5s SLA |
| `claude-opus-4-8` | 4–5.5 s | Maximum accuracy on difficult or degraded images |

The first request after a cold start also pays a one-time schema-compile cost (~6 s), after which the structured-output schema is cached server-side. Warm calls are the steady state.

### Image Preprocessing

Photos are downscaled to 1600 px on the longest dimension and re-encoded as JPEG (quality 0.9) client-side before upload (`src/lib/image.ts`). This serves two goals:

1. **Latency.** Smaller payloads reduce base64 transfer time and shorten the prompt token count — both directly reduce response time toward the 5-second target.
2. **Consistency.** Re-encoding to JPEG normalizes formats (HEIC, WebP, high-res PNG) to a single format without a server-side dependency on native image libraries.

---

## Stage 2: Deterministic Verdict Logic

### Field-by-Field Results

Every field in `ExpectedFields` is checked independently and produces a `FieldResult` with one of five statuses:

| Status | Meaning |
|---|---|
| `pass` | Field matches the application |
| `warn` | Close but not exact — a human should review |
| `fail` | Clear mismatch |
| `missing` | Field is absent from the label (Government Warning only) |
| `skipped` | Application provided no value for this field — nothing to check |

A blank expected field → `skipped`. An absent label field → `fail`. This avoids silent pass-throughs: if a reviewer omits the ABV, the field is visibly `skipped` rather than silently ignored as a pass.

### Fuzzy Matching for Names (Brand Name, Class/Type)

Brand names and class/type designations are compared with Unicode-aware normalization (lower-case, strip non-alphanumeric characters) plus Levenshtein edit distance. The threshold is 15% of the longer string's character count:

- **Equal after normalization** → `pass` (with a note if raw capitalization differed, e.g. `"STONE'S THROW"` == `"Stone's Throw"`)
- **Edit distance ≤ 15%** → `warn` ("Close match — please confirm")
- **Edit distance > 15%** → `fail`

The 15% threshold was calibrated to catch genuine mismatches (completely different brand names) while surfacing ambiguous near-misses for human review rather than silently passing or auto-failing them.

### ABV Comparison

ABV is compared numerically, parsed from free text like `"45% Alc./Vol. (90 Proof)"` via regex in `parseAbv()`. The tolerance is ±0.05% — a rounding difference in the last digit passes; a difference of 0.1% or more fails.

### Net Contents Comparison

Net contents are first parsed to millilitres to handle dual-unit labels (`"375 mL (12.7 fl. oz.)"`) and unit variants (`"750 mL"` = `"750ML"` = `"750 milliliters"` = `"0.75 L"`). The comparison tolerates ±2% (or ±0.5 mL, whichever is larger) to absorb floating-point rounding. If parsing fails, it falls back to a normalized string compare (collapsed whitespace, lowercase unit abbreviations).

### Government Warning Check (27 CFR §§16.21–16.22)

The canonical warning text is taken verbatim from **27 CFR §16.21** and stored as a module-level constant in `src/lib/warning.ts`. Three conditions must all be true for a `pass`:

1. **`GOVERNMENT WARNING:` in all caps** — the heading is matched case-sensitively (§16.22 requires capitals).
2. **The heading is in bold type** — reported by the vision model as `warningHeadingBold`. A `false` reading adds a difference note but does not hard-fail (bold detection from a photo is heuristic; the human should verify).
3. **The body matches word-for-word** — checked after collapsing whitespace and lower-casing. On a mismatch, `firstWordingDelta()` pinpoints the first divergent word in context.

If the warning is absent entirely, the status is `missing` — which rolls up to `fail` in the overall verdict.

### Overall Verdict Roll-Up

```
any field status is "fail" or "missing"  →  overall = "fail"
else any field status is "warn"          →  overall = "review"
else                                     →  overall = "pass"
```

The Government Warning participates in roll-up as a peer field. A warning mismatch alone is sufficient to fail the label.

---

## Batch Mode

Batch screening runs up to 3 API calls in parallel (`Promise.all([worker(), worker(), worker()])` in `page.tsx`). Three parallel workers balance throughput against Anthropic's per-minute rate limits. An optional CSV can supply per-filename expected values (matched by filename key); without it, each label is evaluated for the Government Warning and internal consistency only.

The CSV parser handles common column-header variants (`brand`, `brand name`, `brandName`, `abv`, `alcohol content`) but does not handle quoted commas — sufficient for the prototype workflow.

---

## Stakeholder Requirements — Traceability

| Requirement | Implementation |
|---|---|
| ≤ 5-second results | One non-streaming Claude call, thinking disabled, client-side downscale, structured output, model swappable via env var |
| Simple UX ("my 73-year-old mother could use it") | Single screen, two inputs, one button, plain-language results, status shown by icon + word + colour (not colour alone), one-click samples |
| Batch (200–300 labels) | Multi-upload + optional filename-keyed CSV; 3 parallel workers; live results table |
| Fuzzy brand matching (`"STONE'S THROW"` == `"Stone's Throw"`) | Unicode normalization + Levenshtein with a Review band for near-misses |
| Strict Government Warning check | Word-for-word against canonical 27 CFR §16.21, all-caps check on prefix, bold-type flag from vision model |
| Imperfect / angled / glared photos | Vision model; `legible` flag + `imageNotes` surface quality issues; downscale normalizes phone photos |

---

## Production Path (On-Premises / Azure FedRAMP)

TTB's network firewall blocks outbound connections to commercial ML endpoints. A production deployment inside the agency boundary would:

1. **Replace the Claude call** with an Azure OpenAI vision deployment (GPT-4o or equivalent) inside the FedRAMP boundary. Only `src/lib/extract.ts` changes — switch from `@anthropic-ai/sdk` to `openai` with the Azure endpoint headers. The rest of the codebase is model-agnostic.
2. **Host the Next.js server** on Azure App Service or AKS behind the network perimeter. `npm run build && npm start` is the production command — no container changes needed.
3. **Replace the in-memory rate limiter** with Upstash Redis (`@upstash/ratelimit`). The current limiter (`src/lib/ratelimit.ts`) is per-serverless-instance, which means limits are not shared across horizontally-scaled instances.
4. **Add authentication** via Azure AD/Entra ID at the reverse proxy (Azure API Management or Front Door) — no code changes to the app required.
5. **Add audit logging** — append every verification request (label filename, COLA ID, verdict, reviewer ID) to an append-only audit store.

---

## Assumptions and Known Limitations

- **Standalone prototype.** No COLA database integration (out of scope per IT). Nothing is persisted — images are processed in memory only, sidestepping PII and document-retention concerns.
- **Bold detection is heuristic.** The vision model reports whether `GOVERNMENT WARNING:` appears in bold type, but photo-based bold detection is inherently uncertain. The `warn` on non-bold is a flag for human verification, not a conclusive determination.
- **Font-size and placement rules** (§16.22 requires the warning to meet minimum type-size standards based on label area) are out of scope for v1 — vision-model metric extraction of relative font sizes is unreliable without calibration data.
- **Batch without a CSV** checks the Government Warning and internal label consistency only. Without expected values to compare against, field-level pass/fail cannot be rendered.
- **CSV parser is minimal.** Quoted commas and multi-line cells in the expected-values CSV are not handled — acceptable for the prototype workflow where the CSV is machine-generated or carefully formatted.
- **This is a triage aid, not a final determination.** Vision OCR can misread values; the deterministic layer guarantees a *consistent* verdict for the text it received, not absolute legal correctness. Human review remains the final step.
