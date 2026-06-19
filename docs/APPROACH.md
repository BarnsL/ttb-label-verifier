# Approach, tools, and assumptions

## Approach

**Split perception from judgement.** A vision model (Claude) reads the label image into structured fields; a small deterministic layer turns those fields into the actual Pass/Review/Fail verdict.

- The LLM is good at *reading* — stylized fonts, curved labels, glare, odd angles — which is exactly where traditional OCR struggled in TTB's prior pilot.
- The verdict is plain code (`src/lib/verify.ts`, `src/lib/warning.ts`). Given the same extracted text it always returns the same decision, with a reason. That matters for a regulator: a compliance call should be **consistent and explainable**, not a model's vibe.

**Pipeline:** browser downsizes the image → `POST /api/verify` → `extractLabel()` (one Claude call, JSON-schema-constrained output, thinking disabled) → `verifyLabel()` (deterministic) → result.

**Meeting the stakeholder requirements** (from the interview notes):

| Requirement | How |
|---|---|
| ≤ 5-second results | One non-streaming call, thinking disabled, client-side downscale, structured output. Model is env-swappable (Opus→Haiku) to hit the budget on TTB infra. |
| "My 73-year-old mother could use it" | One screen, one obvious flow, large targets, plain-language results, status shown by **icon + word + colour** (not colour alone). |
| Batch (200–300 at once) | Multi-upload + optional filename-keyed CSV of expected values; parallel processing with a live results table. |
| Fuzzy brand judgement | `"STONE'S THROW"` == `"Stone's Throw"` via case/punctuation normalization; near-misses → **Review**. |
| Strict warning check | Word-for-word against the canonical 27 CFR §16.21 text, with an explicit ALL-CAPS check on `GOVERNMENT WARNING:`. |
| Imperfect images | The model returns a `legible` flag and notes (glare/angle); downscaling normalizes phone photos. |

## Tools

- **Next.js 16 (App Router) + TypeScript** — one project for UI and the API route; deploys to Vercel as-is.
- **Tailwind CSS** — accessible, high-contrast UI.
- **Anthropic Claude vision** with **structured outputs** (`output_config.format`) — guarantees schema-valid JSON from the image, no brittle parsing.
- **Vercel** — public URL for the prototype.

## Assumptions & trade-offs

- **Standalone proof-of-concept.** No COLA integration (out of scope per IT). Nothing is persisted — images are processed in memory and never stored, sidestepping PII/retention concerns for the exercise.
- **Government Warning.** Canonical text is verbatim from 27 CFR §16.21. The body is compared word-for-word (case-insensitive on wording); `GOVERNMENT WARNING:` is required in capitals **and bold** (§16.22) — the vision model reports whether the heading is bold, and a non-bold heading is flagged for verification. The model transcribes the warning exactly as printed so the deterministic check is meaningful. Font-size/legibility rules beyond caps + bold remain out of scope for v1.
- **Field coverage.** Brand, class/type, ABV, net contents, and the warning are the core. Bottler name/address and country of origin (TTB "common elements") are also extracted and matched **when the application supplies them** — both are optional and skipped when blank.
- **Matching tolerances.** Brand/class: normalized exact → Pass; ≤15% edit distance → Review; otherwise Fail. ABV: compared numerically (±0.05). These thresholds are intentionally simple and easy to tune.
- **Outbound-firewall constraint.** TTB's network blocks many ML endpoints. For this hosted prototype, the call originates from our server, so it's unaffected. In production inside TTB's FedRAMP/Azure boundary, the same `extractLabel()` would target **Azure OpenAI / Azure AI Vision or an on-prem model** — the model provider is the only piece that changes.
- **Latency.** Measured on the sample label (warm): `claude-sonnet-4-6` (default) ~4.5–5.0s, `claude-opus-4-8` ~5.2s, `claude-haiku-4-5` lowest. The *first* request also pays a one-time structured-output schema compile (~6s, cached 24h server-side), so warm calls are the steady state. Swap models via `ANTHROPIC_MODEL` with no code change — pick the speed/accuracy trade-off that fits TTB infrastructure. Sonnet is the default because correctness is the top requirement and ~5s meets the "about 5 seconds" bar.
- **Batch without a CSV** screens the Government Warning and internal consistency only (there are no application values to match against). The CSV parser is minimal (no quoted-comma handling) — fine for the prototype.
- **Limits.** Vision OCR can still misread a value; the deterministic layer guarantees a *consistent* verdict for the text it was given, not legal correctness. This is a triage aid for agents, not a final determination.
