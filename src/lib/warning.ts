/**
 * @file warning.ts
 * Government Warning compliance check (27 CFR §§16.21–16.22).
 *
 * Every alcohol beverage label sold in the United States must carry the
 * Government Warning statement, exactly as mandated by the Surgeon General's
 * Warning Act.  TTB enforces three specific requirements:
 *
 *   §16.21 — The statement must match the mandated wording word-for-word.
 *   §16.22 — The "GOVERNMENT WARNING:" heading must be in CAPITAL LETTERS.
 *   §16.22 — The heading must be in bold type.
 *
 * This module:
 *   1. Exports `CANONICAL_GOVERNMENT_WARNING` — the verbatim CFR §16.21 text
 *      (the single source of truth; never edit without updating the CFR citation).
 *   2. Exports `checkWarning()` — deterministic compliance check against that text.
 *
 * See `src/__tests__/warning.test.ts` for the behavioral spec.
 */

import type { WarningCheck } from "./types";

/**
 * The mandatory Government Warning statement, taken verbatim from 27 CFR §16.21.
 *
 * This is the single source of truth for the word-for-word check.
 * Do NOT paraphrase, reformat, or edit this string except to track a
 * legislative amendment to the regulation — update the CFR citation if you do.
 */
export const CANONICAL_GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not " +
  "drink alcoholic beverages during pregnancy because of the risk of birth defects. " +
  "(2) Consumption of alcoholic beverages impairs your ability to drive a car or " +
  "operate machinery, and may cause health problems.";

/**
 * The required all-caps prefix that must appear on every compliant label
 * (27 CFR §16.22).  Used for both the exact-match check and the case-insensitive
 * presence check.
 */
const PREFIX = "GOVERNMENT WARNING:";

/**
 * Collapse runs of whitespace and trim.
 * The only normalization applied to warning text before comparison —
 * wording, punctuation, and numbering are never altered.
 */
function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Split a collapsed string into lower-cased words.
 * Used for the word-for-word body comparison (§16.21): the body text is
 * compared case-insensitively so that minor capitalization differences in
 * the body (not the prefix) do not cause a false failure.
 */
function words(s: string): string[] {
  return collapse(s).toLowerCase().split(" ").filter(Boolean);
}

/**
 * Escape special regex metacharacters in a string.
 * Used when building a case-insensitive regex from the literal prefix string.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Verify a Government Warning found on a label against all TTB requirements.
 *
 * Checks three independent conditions and aggregates them into a `WarningCheck`:
 *
 *   1. **Presence** — was the warning found on the label at all?
 *   2. **All-caps prefix** — does "GOVERNMENT WARNING:" appear in capital letters?
 *      (§16.22).  Checked by looking for the literal string `PREFIX` in the
 *      normalized text.
 *   3. **Bold heading** — does the model report the heading as bold?  (§16.22).
 *      Vision-based bold detection is heuristic; `undefined` is treated as
 *      "unknown / benefit of the doubt" and does not contribute to a failure.
 *   4. **Word-for-word body** — does the statement match the canonical §16.21 text?
 *      Compared after collapsing whitespace and lower-casing so minor spacing or
 *      body-text case differences do not cause false positives.
 *
 * @param found       - The warning text as read from the label (exactly as printed).
 *                      Pass `null`, `undefined`, or `""` to indicate the warning
 *                      was not found on the label at all.
 * @param headingBold - Whether the vision model detected the "GOVERNMENT WARNING"
 *                      heading in bold type.  `undefined` means the model did not
 *                      report this (treated as unknown — not a failure by itself).
 * @returns A `WarningCheck` with the status and a list of specific failures.
 */
export function checkWarning(
  found: string | null | undefined,
  headingBold?: boolean,
): WarningCheck {
  const raw = (found ?? "").trim();

  // ── Absent warning ─────────────────────────────────────────────────────────
  if (!raw) {
    return {
      status: "missing",
      present: false,
      prefixAllCaps: false,
      exactMatch: false,
      found: null,
      differences: [],
      message:
        "No Government Warning statement was found on the label. It is mandatory " +
        "on all alcohol beverage labels (27 CFR §16.21).",
    };
  }

  // ── Warning is present — run three compliance checks ──────────────────────
  const normalized = collapse(raw);

  // Check 1: "GOVERNMENT WARNING:" in ALL CAPS (§16.22).
  const prefixAllCaps  = normalized.includes(PREFIX);
  // Secondary check: is the heading present at all, just in the wrong case?
  const prefixAnyCase  = new RegExp(escapeRegExp(PREFIX), "i").test(normalized);

  // Check 2: body text matches word-for-word (§16.21), case-insensitive.
  const exactMatch =
    words(normalized).join(" ") === words(CANONICAL_GOVERNMENT_WARNING).join(" ");

  // Collect specific failure reasons for the reviewer.
  const differences: string[] = [];

  if (!prefixAllCaps) {
    differences.push(
      prefixAnyCase
        ? '"GOVERNMENT WARNING:" must appear in capital letters — found different capitalization.'
        : 'The required "GOVERNMENT WARNING:" heading is missing.',
    );
  }

  if (!exactMatch) {
    differences.push("The wording does not match the mandatory statement word-for-word.");
    differences.push(...firstWordingDelta(normalized));
  }

  // Bold detection from a photo is heuristic — flag `false` for human review,
  // but do not treat `undefined` (unknown) as a failure.
  if (headingBold === false) {
    differences.push(
      'The "GOVERNMENT WARNING" heading does not appear to be in bold type ' +
      "(27 CFR §16.22 requires bold) — please verify.",
    );
  }

  const ok = prefixAllCaps && exactMatch && headingBold !== false;

  return {
    status: ok ? "pass" : "fail",
    present: true,
    prefixAllCaps,
    exactMatch,
    found: normalized,
    differences,
    message: ok
      ? "Government Warning is present and matches the mandatory text exactly."
      : "Government Warning is present but does not meet TTB requirements.",
  };
}

/**
 * Locate and describe the first place the label's warning text diverges from
 * the canonical §16.21 text.
 *
 * Compares word-by-word (case-insensitive) and returns a human-readable
 * description of the first divergence, including up to 5 words of context
 * around the differing position.  Also notes truncation or extra text.
 *
 * @param found - The normalized (collapsed whitespace) warning text from the label.
 * @returns     An array of zero or one description strings to append to `differences`.
 */
function firstWordingDelta(found: string): string[] {
  const a = words(CANONICAL_GOVERNMENT_WARNING); // canonical (what it should be)
  const b = words(found);                        // actual    (what the label says)
  const n = Math.min(a.length, b.length);

  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      // Show ±2 words of context around the divergence for readability.
      const ctxA = a.slice(Math.max(0, i - 2), i + 3).join(" ");
      const ctxB = b.slice(Math.max(0, i - 2), i + 3).join(" ");
      return [`First difference near word ${i + 1}: expected "…${ctxA}…", found "…${ctxB}…".`];
    }
  }

  // All shared words match — difference is in length only.
  if (a.length !== b.length) {
    return [
      a.length > b.length
        ? "The statement appears to be truncated."
        : "The statement contains extra text.",
    ];
  }

  return []; // no divergence found (shouldn't reach here if exactMatch === false)
}
