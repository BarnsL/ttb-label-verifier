import type { WarningCheck } from "./types";

/**
 * The mandatory Government Warning, verbatim from 27 CFR § 16.21.
 * This is the single source of truth for the word-for-word check.
 */
export const CANONICAL_GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not " +
  "drink alcoholic beverages during pregnancy because of the risk of birth defects. " +
  "(2) Consumption of alcoholic beverages impairs your ability to drive a car or " +
  "operate machinery, and may cause health problems.";

const PREFIX = "GOVERNMENT WARNING:";

/** Collapse runs of whitespace and trim. The only normalization we apply to the
 *  body — we never alter wording, punctuation, or numbering. */
function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Case-folded word list, for word-for-word body comparison. */
function words(s: string): string[] {
  return collapse(s).toLowerCase().split(" ").filter(Boolean);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Verify a Government Warning string read from a label.
 *
 * Two independent requirements, both from TTB rules:
 *   1. The "GOVERNMENT WARNING:" heading appears in capital letters (§16.22).
 *   2. The full statement matches the mandatory wording word-for-word (§16.21).
 */
export function checkWarning(found: string | null | undefined): WarningCheck {
  const raw = (found ?? "").trim();

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

  const normalized = collapse(raw);
  const prefixAllCaps = normalized.includes(PREFIX);
  const prefixAnyCase = new RegExp(escapeRegExp(PREFIX), "i").test(normalized);
  const exactMatch =
    words(normalized).join(" ") === words(CANONICAL_GOVERNMENT_WARNING).join(" ");

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

  const ok = prefixAllCaps && exactMatch;
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

/** Pinpoint the first place the label's wording diverges from the canonical text. */
function firstWordingDelta(found: string): string[] {
  const a = words(CANONICAL_GOVERNMENT_WARNING);
  const b = words(found);
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      const ctxA = a.slice(Math.max(0, i - 2), i + 3).join(" ");
      const ctxB = b.slice(Math.max(0, i - 2), i + 3).join(" ");
      return [`First difference near word ${i + 1}: expected "…${ctxA}…", found "…${ctxB}…".`];
    }
  }
  if (a.length !== b.length) {
    return [a.length > b.length ? "The statement appears to be truncated." : "The statement contains extra text."];
  }
  return [];
}
