/**
 * @file verify.ts
 * Stage 2 of the verification pipeline: deterministic, auditable comparison
 * of what the COLA application claims vs. what the vision model read off the label.
 *
 * Architecture note: the vision model (Stage 1, `extract.ts`) only READS the label.
 * This file DECIDES compliance.  Keeping the two stages separate means:
 *   - Every verdict is reproducible: same input → same output, always.
 *   - Every verdict is explainable: each field reports *why* it passed or failed.
 *   - The full suite is unit-testable without any network calls or API keys.
 *
 * See `src/__tests__/verify.test.ts` for the behavioral spec.
 */

import type {
  ExpectedFields,
  ExtractedLabel,
  FieldResult,
  VerificationResult,
} from "./types";
import { checkWarning } from "./warning";

// ─── String normalization helpers ─────────────────────────────────────────────

/**
 * Normalize a name string for case- and punctuation-insensitive comparison.
 *
 * Lowercases, strips non-alphanumeric characters (using Unicode property escapes
 * so accented letters and non-Latin scripts are preserved), and collapses
 * whitespace.  "STONE'S THROW" and "Stone's Throw" both normalize to
 * "stones throw" and therefore compare equal.
 */
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ") // strip punctuation; keep letters + digits
    .replace(/\s+/g, " ")               // collapse internal whitespace
    .trim();
}

/**
 * Collapse runs of whitespace and trim.
 * Used when we want to compare raw presentation (not normalize for fuzzy matching)
 * but still treat "A  B" and "A B" as equal.
 */
function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// ─── Levenshtein distance ─────────────────────────────────────────────────────

/**
 * Compute the Levenshtein edit distance between two strings.
 *
 * Uses a two-row DP table (O(min(m, n)) space).  Called on already-normalized
 * strings (lower-case, punctuation stripped) so the distance reflects semantic
 * similarity, not formatting differences.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns The minimum number of single-character edits (insertions, deletions,
 *          substitutions) needed to transform `a` into `b`.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;

  // `prev[j]` = edit distance for a[0..i-1] vs b[0..j-1] from the previous row.
  const prev = Array.from({ length: n + 1 }, (_, j) => j);
  const curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i; // deleting all i characters of `a`
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,                              // deletion from a
        curr[j - 1] + 1,                          // insertion into a
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), // substitution
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]; // shift rows
  }
  return prev[n];
}

// ─── Fuzzy field comparison (brand name, class/type) ─────────────────────────

/**
 * Compare a text field (brand name or class/type) between the COLA application
 * and the label, using case/punctuation-insensitive matching with a fuzzy
 * "near-miss → review" band.
 *
 * Threshold: if the Levenshtein distance between normalized strings is ≤15% of
 * the longer string's length, the result is `warn` (human review) rather than
 * `fail`.  This catches genuine mismatches (completely different names) while
 * surfacing ambiguous near-misses for human confirmation.
 *
 * @param field    - Human-readable field name for the result (e.g. "Brand Name").
 * @param expected - Value from the COLA application.
 * @param found    - Value read from the label by the vision model.
 * @returns A `FieldResult` with an appropriate status and message.
 */
function fuzzy(field: string, expected: string | undefined, found: string): FieldResult {
  // No application value — nothing to compare; skip silently.
  if (!expected || !expected.trim()) {
    return {
      field,
      status: "skipped",
      expected: null,
      found: found || null,
      message: "No application value provided.",
    };
  }

  // Field absent from the label — clear failure.
  if (!found || !found.trim()) {
    return {
      field,
      status: "fail",
      expected,
      found: null,
      message: "Not found on the label.",
    };
  }

  const e = normName(expected);
  const f = normName(found);

  if (e === f) {
    // Normalized strings are equal.  Note when raw capitalization differs so
    // the reviewer can see the difference without marking it a failure.
    const exactRaw = collapse(expected) === collapse(found);
    return {
      field,
      status: "pass",
      expected,
      found,
      message: exactRaw
        ? "Matches the application."
        : "Matches the application (case/punctuation differ only).",
    };
  }

  // Compute edit distance as a fraction of the longer string.
  const ratio = levenshtein(e, f) / Math.max(e.length, f.length);

  if (ratio <= 0.15) {
    // Close but not exact — flag for human review rather than auto-failing.
    return { field, status: "warn", expected, found, message: "Close match — please confirm." };
  }

  return { field, status: "fail", expected, found, message: "Does not match the application." };
}

// ─── ABV comparison ───────────────────────────────────────────────────────────

/**
 * Parse an ABV percentage from free text.
 *
 * Handles the common formats seen on labels and COLA applications:
 *   - "45% Alc./Vol. (90 Proof)" → 45
 *   - "40% alc." → 40
 *   - "13.5%" → 13.5
 *   - "45" (bare number, implied %) → 45
 *
 * @param s - Raw alcohol-content string.
 * @returns The ABV as a number, or `null` if no recognizable pattern was found.
 */
function parseAbv(s: string): number | null {
  if (!s) return null;

  // "45%" or "45.5% ..." — most common form.
  const pct = s.match(/(\d{1,2}(?:\.\d+)?)\s*%/);
  if (pct) return parseFloat(pct[1]);

  // "40 alc" / "40% alc." — label with partial formatting.
  const alc = s.match(/(\d{1,2}(?:\.\d+)?)\s*%?\s*alc/i);
  if (alc) return parseFloat(alc[1]);

  // Bare number (e.g. the COLA application might say just "45").
  const bare = s.match(/^\s*(\d{1,2}(?:\.\d+)?)\s*$/);
  return bare ? parseFloat(bare[1]) : null;
}

/**
 * Compare the declared ABV from the COLA application against what the vision
 * model read from the label, using a ±0.05% numeric tolerance to absorb
 * rounding differences in the last decimal digit.
 *
 * @param expected - ABV string from the COLA application (may include units).
 * @param label    - Full `ExtractedLabel` (uses `abvPercent` first, falls back
 *                   to parsing `alcoholContent` text if `abvPercent` is -1).
 * @returns A `FieldResult` with the numeric comparison result.
 */
function checkAbv(expected: string | undefined, label: ExtractedLabel): FieldResult {
  const field = "Alcohol Content (ABV)";

  if (!expected || !expected.trim()) {
    return {
      field,
      status: "skipped",
      expected: null,
      found: label.alcoholContent || null,
      message: "No application value provided.",
    };
  }

  const e = parseAbv(expected);

  // Prefer the pre-parsed abvPercent from the model; fall back to parsing the text.
  const f = label.abvPercent >= 0 ? label.abvPercent : parseAbv(label.alcoholContent);

  if (e == null) {
    // Application value was unparseable — warn rather than silently skip.
    return {
      field,
      status: "warn",
      expected,
      found: label.alcoholContent || null,
      message: "Could not parse the application's ABV value.",
    };
  }

  if (f == null) {
    return {
      field,
      status: "fail",
      expected,
      found: label.alcoholContent || null,
      message: "ABV not found on the label.",
    };
  }

  if (Math.abs(e - f) < 0.05) {
    // Within rounding tolerance — pass.
    return {
      field,
      status: "pass",
      expected: `${e}%`,
      found: `${f}%`,
      message: "ABV matches the application.",
    };
  }

  return {
    field,
    status: "fail",
    expected: `${e}%`,
    found: `${f}%`,
    message: `ABV mismatch: application says ${e}%, label shows ${f}%.`,
  };
}

// ─── Net contents comparison ──────────────────────────────────────────────────

/**
 * Normalize volume unit abbreviations for string-level fallback comparison.
 *
 * Maps all variants to short lower-case forms:
 *   "milliliters" / "millilitres" → "ml"
 *   "liters" / "litres"           → "l"
 *   "fl. oz." / "fluid ounces"    → "floz"
 *
 * Also strips all whitespace so "750 mL" → "750ml".
 */
function normUnits(s: string): string {
  return s
    .toLowerCase()
    .replace(/milliliters?|millilitres?/g, "ml")
    .replace(/liters?|litres?/g, "l")
    .replace(/fl\.?\s*oz\.?|fluid ounces?/g, "floz")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Parse a net-contents string to millilitres, handling all common unit variants.
 *
 * Prefers the metric (mL) reading when both metric and imperial appear on the
 * same label (e.g. "375 mL (12.7 fl. oz.)") because the COLA application uses
 * metric values and TTB requires the metric statement.
 *
 * Supported input examples:
 *   "750 mL"              → 750
 *   "750ML"               → 750
 *   "750 milliliters"     → 750
 *   "0.75 L"              → 750
 *   "375 mL (12.7 fl oz)" → 375  ← prefers mL
 *   "1.75 L"              → 1750
 *
 * @param s - Net contents string as printed on the label or as entered in the COLA.
 * @returns Volume in millilitres, or `null` if no recognizable pattern is found.
 */
function parseVolume(s: string): number | null {
  const t = s
    .toLowerCase()
    .replace(/milliliters?|millilitres?/g, "ml")
    .replace(/liters?|litres?/g, "l")
    .replace(/fl\.?\s*oz\.?|fluid ounces?/g, "floz");

  // Try mL first — preferred over L and fl oz when all appear together.
  const ml = t.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (ml) return parseFloat(ml[1]);

  const l = t.match(/(\d+(?:\.\d+)?)\s*l\b/);
  if (l) return parseFloat(l[1]) * 1000;

  const oz = t.match(/(\d+(?:\.\d+)?)\s*floz\b/);
  if (oz) return parseFloat(oz[1]) * 29.5735; // 1 US fl oz = 29.5735 mL

  return null;
}

/**
 * Compare the declared net contents from the COLA application against the label.
 *
 * Primary: parse both to mL and compare with a tolerance of ±2% (or ±0.5 mL,
 * whichever is larger) to absorb floating-point rounding from unit conversions.
 *
 * Fallback: if parsing fails for either value, compare as normalized strings
 * (whitespace collapsed, units lowercased).
 *
 * @param expected - Net contents string from the COLA application.
 * @param found    - Net contents string read from the label image.
 * @returns A `FieldResult` with the comparison result.
 */
function checkNetContents(expected: string | undefined, found: string): FieldResult {
  const field = "Net Contents";

  if (!expected || !expected.trim()) {
    return {
      field,
      status: "skipped",
      expected: null,
      found: found || null,
      message: "No application value provided.",
    };
  }

  if (!found || !found.trim()) {
    return {
      field,
      status: "fail",
      expected,
      found: null,
      message: "Not found on the label.",
    };
  }

  const ev = parseVolume(expected);
  const fv = parseVolume(found);

  if (ev != null && fv != null) {
    // Numeric comparison: tolerate ±2% or ±0.5 mL to absorb unit-conversion rounding.
    if (Math.abs(ev - fv) <= Math.max(0.5, ev * 0.02)) {
      return { field, status: "pass", expected, found, message: "Matches the application." };
    }
    return {
      field,
      status: "fail",
      expected,
      found,
      message: `Volume mismatch: application says ${expected}, label shows ${found}.`,
    };
  }

  // Fallback: normalized string comparison when parsing fails for either value.
  if (normUnits(expected) === normUnits(found)) {
    return { field, status: "pass", expected, found, message: "Matches the application." };
  }
  return { field, status: "fail", expected, found, message: "Does not match the application." };
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Deterministic verdict layer — the core of the verification pipeline.
 *
 * Compares every field in the COLA application against what the vision model
 * read from the label image, producing an auditable, field-by-field result.
 * The Government Warning is checked via `checkWarning()` and participates in
 * the overall verdict roll-up as a peer field.
 *
 * Overall verdict rules:
 *   - Any field `fail` or `missing`  → overall `"fail"`
 *   - Any field `warn`               → overall `"review"`
 *   - Otherwise                      → overall `"pass"`
 *
 * The vision model does the reading; this function does the deciding.  They
 * must stay separate: the verdict must be reproducible and defensible, not a
 * statistical output from the model.
 *
 * @param expected  - COLA application values (what the label should say).
 * @param extracted - Structured fields read from the label by `extractLabel()`.
 * @param meta      - Metadata about the extraction call (model, elapsed time).
 * @returns         A fully-populated `VerificationResult`.
 */
export function verifyLabel(
  expected: ExpectedFields,
  extracted: ExtractedLabel,
  meta: { model: string; elapsedMs: number },
): VerificationResult {
  // Check each COLA field against the corresponding extracted label value.
  const fields: FieldResult[] = [
    fuzzy("Brand Name",            expected.brandName,        extracted.brandName),
    fuzzy("Class / Type",          expected.classType,        extracted.classType),
    checkAbv(expected.alcoholContent, extracted),
    checkNetContents(expected.netContents, extracted.netContents),
    fuzzy("Bottler Name / Address", expected.bottlerInfo,     extracted.bottlerInfo),
    fuzzy("Country of Origin",      expected.countryOfOrigin, extracted.countryOfOrigin),
  ];

  // Government Warning is always checked regardless of application fields.
  const warning = checkWarning(extracted.governmentWarning, extracted.warningHeadingBold);

  // Roll up to overall verdict: any fail/missing → fail; any warn → review; else pass.
  const statuses = [...fields.map((f) => f.status), warning.status];
  const overall: VerificationResult["overall"] = statuses.some(
    (s) => s === "fail" || s === "missing",
  )
    ? "fail"
    : statuses.includes("warn")
      ? "review"
      : "pass";

  return {
    overall,
    fields,
    warning,
    extracted,
    model: meta.model,
    elapsedMs: meta.elapsedMs,
  };
}
