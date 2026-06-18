import type {
  ExpectedFields,
  ExtractedLabel,
  FieldResult,
  VerificationResult,
} from "./types";
import { checkWarning } from "./warning";

/** Lower-case, strip punctuation, collapse whitespace. Makes
 *  "STONE'S THROW" and "Stone's Throw" compare equal (Dave's case). */
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = Array.from({ length: n + 1 }, (_, j) => j);
  const curr = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** Brand name / class-type comparison: case- and punctuation-insensitive, with a
 *  fuzzy "close match → review" band so near-misses aren't silently passed or failed. */
function fuzzy(field: string, expected: string | undefined, found: string): FieldResult {
  if (!expected || !expected.trim()) {
    return { field, status: "skipped", expected: null, found: found || null, message: "No application value provided." };
  }
  if (!found || !found.trim()) {
    return { field, status: "fail", expected, found: null, message: "Not found on the label." };
  }
  const e = normName(expected);
  const f = normName(found);
  if (e === f) {
    const exactRaw = collapse(expected) === collapse(found);
    return {
      field,
      status: "pass",
      expected,
      found,
      message: exactRaw ? "Matches the application." : "Matches the application (case/punctuation differ only).",
    };
  }
  const ratio = levenshtein(e, f) / Math.max(e.length, f.length);
  if (ratio <= 0.15) {
    return { field, status: "warn", expected, found, message: "Close match — please confirm." };
  }
  return { field, status: "fail", expected, found, message: "Does not match the application." };
}

/** Pull an ABV percentage out of free text like "45% Alc./Vol. (90 Proof)" or "45". */
function parseAbv(s: string): number | null {
  if (!s) return null;
  const pct = s.match(/(\d{1,2}(?:\.\d+)?)\s*%/);
  if (pct) return parseFloat(pct[1]);
  const alc = s.match(/(\d{1,2}(?:\.\d+)?)\s*%?\s*alc/i);
  if (alc) return parseFloat(alc[1]);
  const bare = s.match(/^\s*(\d{1,2}(?:\.\d+)?)\s*$/);
  return bare ? parseFloat(bare[1]) : null;
}

function checkAbv(expected: string | undefined, label: ExtractedLabel): FieldResult {
  const field = "Alcohol Content (ABV)";
  if (!expected || !expected.trim()) {
    return { field, status: "skipped", expected: null, found: label.alcoholContent || null, message: "No application value provided." };
  }
  const e = parseAbv(expected);
  const f = label.abvPercent >= 0 ? label.abvPercent : parseAbv(label.alcoholContent);
  if (e == null) {
    return { field, status: "warn", expected, found: label.alcoholContent || null, message: "Could not parse the application's ABV value." };
  }
  if (f == null) {
    return { field, status: "fail", expected, found: label.alcoholContent || null, message: "ABV not found on the label." };
  }
  if (Math.abs(e - f) < 0.05) {
    return { field, status: "pass", expected: `${e}%`, found: `${f}%`, message: "ABV matches the application." };
  }
  return { field, status: "fail", expected: `${e}%`, found: `${f}%`, message: `ABV mismatch: application says ${e}%, label shows ${f}%.` };
}

/** Normalize volume units so "750 mL", "750ML", "750 milliliters" all compare equal. */
function normUnits(s: string): string {
  return s
    .toLowerCase()
    .replace(/milliliters?|millilitres?/g, "ml")
    .replace(/liters?|litres?/g, "l")
    .replace(/fl\.?\s*oz\.?|fluid ounces?/g, "floz")
    .replace(/\s+/g, "")
    .trim();
}

function checkNetContents(expected: string | undefined, found: string): FieldResult {
  const field = "Net Contents";
  if (!expected || !expected.trim()) {
    return { field, status: "skipped", expected: null, found: found || null, message: "No application value provided." };
  }
  if (!found || !found.trim()) {
    return { field, status: "fail", expected, found: null, message: "Not found on the label." };
  }
  if (normUnits(expected) === normUnits(found)) {
    return { field, status: "pass", expected, found, message: "Matches the application." };
  }
  return { field, status: "fail", expected, found, message: "Does not match the application." };
}

/**
 * Deterministic verdict layer. The vision model does the *reading*; this turns the
 * read fields into auditable, repeatable pass/review/fail decisions a TTB agent
 * (or downstream system) can defend.
 */
export function verifyLabel(
  expected: ExpectedFields,
  extracted: ExtractedLabel,
  meta: { model: string; elapsedMs: number },
): VerificationResult {
  const fields: FieldResult[] = [
    fuzzy("Brand Name", expected.brandName, extracted.brandName),
    fuzzy("Class / Type", expected.classType, extracted.classType),
    checkAbv(expected.alcoholContent, extracted),
    checkNetContents(expected.netContents, extracted.netContents),
  ];
  const warning = checkWarning(extracted.governmentWarning);

  const statuses = [...fields.map((f) => f.status), warning.status];
  const overall: VerificationResult["overall"] = statuses.some(
    (s) => s === "fail" || s === "missing",
  )
    ? "fail"
    : statuses.includes("warn")
      ? "review"
      : "pass";

  return { overall, fields, warning, extracted, model: meta.model, elapsedMs: meta.elapsedMs };
}
