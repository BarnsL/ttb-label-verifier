/**
 * Behavioral specs for `src/lib/warning.ts` — the Government Warning check.
 *
 * These tests cover the three independent compliance conditions (§16.21 word-
 * for-word match, §16.22 all-caps prefix, §16.22 bold heading) plus their
 * interactions and edge cases.  Each test is written as a declarative spec so
 * the suite doubles as living documentation of what "compliant" means.
 *
 * No network calls; no API keys needed.
 */

import { describe, it, expect } from "vitest";
import { checkWarning, CANONICAL_GOVERNMENT_WARNING } from "@/lib/warning";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a warning string from parts so tests stay readable. */
function makeWarning(opts: {
  prefix?: string;
  body?: string;
}): string {
  const prefix = opts.prefix ?? "GOVERNMENT WARNING:";
  const body =
    opts.body ??
    " (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";
  return `${prefix}${body}`;
}

// ─── Presence check ───────────────────────────────────────────────────────────

describe("checkWarning — absent warning", () => {
  it("returns status=missing when found is null", () => {
    const r = checkWarning(null);
    expect(r.status).toBe("missing");
    expect(r.present).toBe(false);
  });

  it("returns status=missing when found is empty string", () => {
    const r = checkWarning("");
    expect(r.status).toBe("missing");
  });

  it("returns status=missing when found is whitespace only", () => {
    const r = checkWarning("   ");
    expect(r.status).toBe("missing");
  });

  it("includes a message explaining the warning is mandatory", () => {
    const r = checkWarning(null);
    expect(r.message).toMatch(/mandatory/i);
  });
});

// ─── Fully compliant warning ───────────────────────────────────────────────────

describe("checkWarning — fully compliant warning", () => {
  it("returns status=pass for the canonical verbatim text with bold=true", () => {
    const r = checkWarning(CANONICAL_GOVERNMENT_WARNING, true);
    expect(r.status).toBe("pass");
  });

  it("returns present=true", () => {
    const r = checkWarning(CANONICAL_GOVERNMENT_WARNING, true);
    expect(r.present).toBe(true);
  });

  it("returns prefixAllCaps=true", () => {
    const r = checkWarning(CANONICAL_GOVERNMENT_WARNING, true);
    expect(r.prefixAllCaps).toBe(true);
  });

  it("returns exactMatch=true", () => {
    const r = checkWarning(CANONICAL_GOVERNMENT_WARNING, true);
    expect(r.exactMatch).toBe(true);
  });

  it("returns an empty differences array", () => {
    const r = checkWarning(CANONICAL_GOVERNMENT_WARNING, true);
    expect(r.differences).toHaveLength(0);
  });

  it("tolerates extra leading/trailing whitespace", () => {
    const r = checkWarning(`  ${CANONICAL_GOVERNMENT_WARNING}  `, true);
    expect(r.status).toBe("pass");
  });

  it("tolerates internal double-spaces (collapses whitespace)", () => {
    const doubled = CANONICAL_GOVERNMENT_WARNING.replace(" ", "  ");
    const r = checkWarning(doubled, true);
    expect(r.status).toBe("pass");
  });
});

// ─── Prefix capitalization ─────────────────────────────────────────────────────

describe("checkWarning — prefix capitalization (§16.22)", () => {
  it("fails when 'GOVERNMENT WARNING:' is in title case", () => {
    const r = checkWarning(makeWarning({ prefix: "Government Warning:" }), true);
    expect(r.status).toBe("fail");
    expect(r.prefixAllCaps).toBe(false);
  });

  it("fails when prefix is lower-case", () => {
    const r = checkWarning(makeWarning({ prefix: "government warning:" }), true);
    expect(r.status).toBe("fail");
    expect(r.prefixAllCaps).toBe(false);
  });

  it("adds a difference noting the capitalization problem", () => {
    const r = checkWarning(makeWarning({ prefix: "Government Warning:" }), true);
    expect(r.differences.some((d) => /capital/i.test(d))).toBe(true);
  });
});

// ─── Bold heading (§16.22) ────────────────────────────────────────────────────

describe("checkWarning — bold heading (§16.22)", () => {
  it("fails when headingBold is explicitly false", () => {
    const r = checkWarning(CANONICAL_GOVERNMENT_WARNING, false);
    expect(r.status).toBe("fail");
  });

  it("adds a difference noting the bold requirement", () => {
    const r = checkWarning(CANONICAL_GOVERNMENT_WARNING, false);
    expect(r.differences.some((d) => /bold/i.test(d))).toBe(true);
  });

  it("passes when headingBold is true", () => {
    const r = checkWarning(CANONICAL_GOVERNMENT_WARNING, true);
    expect(r.status).toBe("pass");
  });

  it("passes when headingBold is undefined (unknown)", () => {
    // The vision model may not report bold for every image; undefined = benefit of the doubt.
    const r = checkWarning(CANONICAL_GOVERNMENT_WARNING, undefined);
    expect(r.status).toBe("pass");
  });
});

// ─── Word-for-word body match (§16.21) ───────────────────────────────────────

describe("checkWarning — body word-for-word match (§16.21)", () => {
  it("fails when a word is substituted ('should not' → 'must not')", () => {
    const altered = CANONICAL_GOVERNMENT_WARNING.replace("should not", "must not");
    const r = checkWarning(altered, true);
    expect(r.status).toBe("fail");
    expect(r.exactMatch).toBe(false);
  });

  it("fails when the statement is truncated", () => {
    const truncated = CANONICAL_GOVERNMENT_WARNING.slice(0, 80);
    const r = checkWarning(truncated, true);
    expect(r.status).toBe("fail");
  });

  it("fails when extra text is appended after the statement", () => {
    const extra = CANONICAL_GOVERNMENT_WARNING + " Additional disclaimer.";
    const r = checkWarning(extra, true);
    expect(r.status).toBe("fail");
  });

  it("passes when only word case differs inside the body (case-insensitive body compare)", () => {
    // The body is compared case-insensitively — only the PREFIX must be ALL CAPS.
    const lowerBody = CANONICAL_GOVERNMENT_WARNING.toLowerCase().replace(
      "government warning:",
      "GOVERNMENT WARNING:", // restore the required all-caps prefix
    );
    const r = checkWarning(lowerBody, true);
    expect(r.exactMatch).toBe(true);
  });

  it("pinpoints the first differing word in the differences array", () => {
    const altered = CANONICAL_GOVERNMENT_WARNING.replace("Surgeon General", "Surgeon General's office");
    const r = checkWarning(altered, true);
    const hasDelta = r.differences.some((d) => /word/i.test(d) || /differ/i.test(d));
    expect(hasDelta).toBe(true);
  });
});

// ─── CANONICAL_GOVERNMENT_WARNING export ─────────────────────────────────────

describe("CANONICAL_GOVERNMENT_WARNING constant", () => {
  it("starts with 'GOVERNMENT WARNING:'", () => {
    expect(CANONICAL_GOVERNMENT_WARNING.startsWith("GOVERNMENT WARNING:")).toBe(true);
  });

  it("mentions Surgeon General", () => {
    expect(CANONICAL_GOVERNMENT_WARNING).toContain("Surgeon General");
  });

  it("covers both mandatory statements ((1) pregnancy, (2) driving)", () => {
    expect(CANONICAL_GOVERNMENT_WARNING).toContain("(1)");
    expect(CANONICAL_GOVERNMENT_WARNING).toContain("(2)");
    expect(CANONICAL_GOVERNMENT_WARNING).toContain("pregnancy");
    expect(CANONICAL_GOVERNMENT_WARNING).toContain("drive a car");
  });
});
