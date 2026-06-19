/**
 * Behavioral specs for `src/lib/verify.ts` — the deterministic verdict layer.
 *
 * Tests cover the public `verifyLabel()` function plus the internal matching
 * helpers that determine Pass / Review / Fail for each field type.  Each test
 * is written as a declarative spec so it can be read as documentation.
 *
 * No network calls; no API keys needed.
 */

import { describe, it, expect } from "vitest";
import { verifyLabel } from "@/lib/verify";
import type { ExpectedFields, ExtractedLabel } from "@/lib/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A fully-compliant extracted label (all fields correct, bold warning present). */
function makeExtracted(overrides: Partial<ExtractedLabel> = {}): ExtractedLabel {
  return {
    brandName: "OLD TOM DISTILLERY",
    classType: "Kentucky Straight Bourbon Whiskey",
    alcoholContent: "45% Alc./Vol. (90 Proof)",
    abvPercent: 45,
    netContents: "750 mL",
    bottlerInfo: "Old Tom Distillery Co., Bardstown, Kentucky",
    countryOfOrigin: "",
    governmentWarning:
      "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not " +
      "drink alcoholic beverages during pregnancy because of the risk of birth defects. " +
      "(2) Consumption of alcoholic beverages impairs your ability to drive a car or " +
      "operate machinery, and may cause health problems.",
    warningHeadingBold: true,
    legible: true,
    imageNotes: "",
    ...overrides,
  };
}

/** A fully-specified COLA application that matches the fixture label. */
function makeExpected(overrides: Partial<ExpectedFields> = {}): ExpectedFields {
  return {
    brandName: "OLD TOM DISTILLERY",
    classType: "Kentucky Straight Bourbon Whiskey",
    alcoholContent: "45%",
    netContents: "750 mL",
    bottlerInfo: "Old Tom Distillery Co., Bardstown, Kentucky",
    ...overrides,
  };
}

const META = { model: "claude-sonnet-4-6", elapsedMs: 3500 };

// ─── Overall verdict ───────────────────────────────────────────────────────────

describe("verifyLabel — overall verdict", () => {
  it("returns overall=pass when all fields match and warning is compliant", () => {
    const result = verifyLabel(makeExpected(), makeExtracted(), META);
    expect(result.overall).toBe("pass");
  });

  it("returns overall=fail when a core field mismatches", () => {
    const result = verifyLabel(
      makeExpected({ brandName: "COMPLETELY DIFFERENT BRAND" }),
      makeExtracted(),
      META,
    );
    expect(result.overall).toBe("fail");
  });

  it("returns overall=fail when Government Warning is missing", () => {
    const result = verifyLabel(
      makeExpected(),
      makeExtracted({ governmentWarning: "" }),
      META,
    );
    expect(result.overall).toBe("fail");
  });

  it("returns overall=review when a field is a near-miss (≤15% edit distance)", () => {
    // "OLD TOM DISTILLERY" vs "OLD TOM DISTILLERIE" — one letter off → warn → overall review
    const result = verifyLabel(
      makeExpected({ brandName: "OLD TOM DISTILLERIE" }),
      makeExtracted({ brandName: "OLD TOM DISTILLERY" }),
      META,
    );
    expect(result.overall).toBe("review");
  });

  it("includes the model name and elapsedMs in the result", () => {
    const result = verifyLabel(makeExpected(), makeExtracted(), META);
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.elapsedMs).toBe(3500);
  });
});

// ─── Brand name matching ───────────────────────────────────────────────────────

describe("verifyLabel — brand name field", () => {
  it("passes with exact match", () => {
    const result = verifyLabel(makeExpected(), makeExtracted(), META);
    const brand = result.fields.find((f) => f.field === "Brand Name");
    expect(brand?.status).toBe("pass");
  });

  it("passes when case differs (e.g. ALL CAPS vs Title Case)", () => {
    const result = verifyLabel(
      makeExpected({ brandName: "Old Tom Distillery" }),
      makeExtracted({ brandName: "OLD TOM DISTILLERY" }),
      META,
    );
    const brand = result.fields.find((f) => f.field === "Brand Name");
    expect(brand?.status).toBe("pass");
  });

  it("passes when only case and apostrophe presence differ ('STONE\\'S THROW' vs 'Stone\\'s Throw')", () => {
    // Both normalize to "stone s throw" — equal after punctuation stripping.
    const result = verifyLabel(
      makeExpected({ brandName: "STONE'S THROW" }),
      makeExtracted({ brandName: "Stone's Throw" }),
      META,
    );
    const brand = result.fields.find((f) => f.field === "Brand Name");
    expect(brand?.status).toBe("pass");
  });

  it("warns when apostrophe is dropped entirely ('STONE\\'S THROW' vs 'Stones Throw')", () => {
    // "STONE'S" → strips apostrophe → "stone s" (two tokens)
    // "Stones" → no apostrophe → "stones" (one token)
    // Normalized forms differ by one edit — within the 15% fuzzy band → warn.
    const result = verifyLabel(
      makeExpected({ brandName: "STONE'S THROW" }),
      makeExtracted({ brandName: "Stones Throw" }),
      META,
    );
    const brand = result.fields.find((f) => f.field === "Brand Name");
    expect(brand?.status).toBe("warn");
  });

  it("warns on close-but-not-equal brand name (near-miss)", () => {
    const result = verifyLabel(
      makeExpected({ brandName: "OLD TOM DISTILLERIE" }), // one-letter variant
      makeExtracted({ brandName: "OLD TOM DISTILLERY" }),
      META,
    );
    const brand = result.fields.find((f) => f.field === "Brand Name");
    expect(brand?.status).toBe("warn");
  });

  it("fails when brand names are clearly different", () => {
    const result = verifyLabel(
      makeExpected({ brandName: "COMPLETELY DIFFERENT BRAND" }),
      makeExtracted({ brandName: "OLD TOM DISTILLERY" }),
      META,
    );
    const brand = result.fields.find((f) => f.field === "Brand Name");
    expect(brand?.status).toBe("fail");
  });

  it("skips when application provides no brand name", () => {
    const result = verifyLabel(makeExpected({ brandName: "" }), makeExtracted(), META);
    const brand = result.fields.find((f) => f.field === "Brand Name");
    expect(brand?.status).toBe("skipped");
  });

  it("fails when brand name is not found on the label", () => {
    const result = verifyLabel(
      makeExpected({ brandName: "OLD TOM DISTILLERY" }),
      makeExtracted({ brandName: "" }),
      META,
    );
    const brand = result.fields.find((f) => f.field === "Brand Name");
    expect(brand?.status).toBe("fail");
  });
});

// ─── ABV comparison ────────────────────────────────────────────────────────────

describe("verifyLabel — alcohol content (ABV)", () => {
  it("passes with exact numeric match", () => {
    const result = verifyLabel(makeExpected({ alcoholContent: "45%" }), makeExtracted(), META);
    const abv = result.fields.find((f) => f.field === "Alcohol Content (ABV)");
    expect(abv?.status).toBe("pass");
  });

  it("passes when units differ but number matches ('45%' vs '45% Alc./Vol.')", () => {
    const result = verifyLabel(
      makeExpected({ alcoholContent: "45" }),
      makeExtracted({ abvPercent: 45, alcoholContent: "45% Alc./Vol. (90 Proof)" }),
      META,
    );
    const abv = result.fields.find((f) => f.field === "Alcohol Content (ABV)");
    expect(abv?.status).toBe("pass");
  });

  it("passes within the ±0.05% tolerance (rounding)", () => {
    const result = verifyLabel(
      makeExpected({ alcoholContent: "40.05%" }),
      makeExtracted({ abvPercent: 40.0, alcoholContent: "40% Alc./Vol." }),
      META,
    );
    const abv = result.fields.find((f) => f.field === "Alcohol Content (ABV)");
    expect(abv?.status).toBe("pass");
  });

  it("fails when ABV differs by 0.1% or more", () => {
    const result = verifyLabel(
      makeExpected({ alcoholContent: "45%" }),
      makeExtracted({ abvPercent: 40, alcoholContent: "40% Alc./Vol." }),
      META,
    );
    const abv = result.fields.find((f) => f.field === "Alcohol Content (ABV)");
    expect(abv?.status).toBe("fail");
  });

  it("fails when ABV is not found on the label (abvPercent=-1, no text)", () => {
    const result = verifyLabel(
      makeExpected({ alcoholContent: "45%" }),
      makeExtracted({ abvPercent: -1, alcoholContent: "" }),
      META,
    );
    const abv = result.fields.find((f) => f.field === "Alcohol Content (ABV)");
    expect(abv?.status).toBe("fail");
  });

  it("skips when application provides no ABV", () => {
    const result = verifyLabel(makeExpected({ alcoholContent: "" }), makeExtracted(), META);
    const abv = result.fields.find((f) => f.field === "Alcohol Content (ABV)");
    expect(abv?.status).toBe("skipped");
  });
});

// ─── Net contents comparison ───────────────────────────────────────────────────

describe("verifyLabel — net contents", () => {
  it("passes with exact match", () => {
    const result = verifyLabel(makeExpected({ netContents: "750 mL" }), makeExtracted(), META);
    const nc = result.fields.find((f) => f.field === "Net Contents");
    expect(nc?.status).toBe("pass");
  });

  it("passes when units differ but volume matches ('750 mL' vs '750ML')", () => {
    const result = verifyLabel(
      makeExpected({ netContents: "750 mL" }),
      makeExtracted({ netContents: "750ML" }),
      META,
    );
    const nc = result.fields.find((f) => f.field === "Net Contents");
    expect(nc?.status).toBe("pass");
  });

  it("passes for dual-unit label ('375 mL (12.7 fl. oz.)') vs application '375 mL'", () => {
    const result = verifyLabel(
      makeExpected({ netContents: "375 mL" }),
      makeExtracted({ netContents: "375 mL (12.7 fl. oz.)" }),
      META,
    );
    const nc = result.fields.find((f) => f.field === "Net Contents");
    expect(nc?.status).toBe("pass");
  });

  it("passes when litre notation used ('0.75 L' vs '750 mL')", () => {
    const result = verifyLabel(
      makeExpected({ netContents: "750 mL" }),
      makeExtracted({ netContents: "0.75 L" }),
      META,
    );
    const nc = result.fields.find((f) => f.field === "Net Contents");
    expect(nc?.status).toBe("pass");
  });

  it("fails when volume differs (375 mL vs 750 mL)", () => {
    const result = verifyLabel(
      makeExpected({ netContents: "750 mL" }),
      makeExtracted({ netContents: "375 mL" }),
      META,
    );
    const nc = result.fields.find((f) => f.field === "Net Contents");
    expect(nc?.status).toBe("fail");
  });

  it("skips when application provides no net contents", () => {
    const result = verifyLabel(makeExpected({ netContents: "" }), makeExtracted(), META);
    const nc = result.fields.find((f) => f.field === "Net Contents");
    expect(nc?.status).toBe("skipped");
  });
});

// ─── Government Warning roll-up ────────────────────────────────────────────────

describe("verifyLabel — Government Warning in results", () => {
  it("includes a warning field in the result", () => {
    const result = verifyLabel(makeExpected(), makeExtracted(), META);
    expect(result.warning).toBeDefined();
  });

  it("warning.status=pass for the canonical compliant warning", () => {
    const result = verifyLabel(makeExpected(), makeExtracted(), META);
    expect(result.warning.status).toBe("pass");
  });

  it("warning.status=missing when no warning on label → overall=fail", () => {
    const result = verifyLabel(makeExpected(), makeExtracted({ governmentWarning: "" }), META);
    expect(result.warning.status).toBe("missing");
    expect(result.overall).toBe("fail");
  });

  it("warning.status=fail for a title-case warning → overall=fail", () => {
    const result = verifyLabel(
      makeExpected(),
      makeExtracted({
        governmentWarning:
          "Government Warning: (1) According to the Surgeon General, women should not " +
          "drink alcoholic beverages during pregnancy because of the risk of birth defects. " +
          "(2) Consumption of alcoholic beverages impairs your ability to drive a car or " +
          "operate machinery, and may cause health problems.",
      }),
      META,
    );
    expect(result.warning.status).toBe("fail");
    expect(result.overall).toBe("fail");
  });
});

// ─── Optional fields ───────────────────────────────────────────────────────────

describe("verifyLabel — optional fields (bottler, country of origin)", () => {
  it("skips Bottler Name when not provided in the application", () => {
    const result = verifyLabel(
      makeExpected({ bottlerInfo: undefined }),
      makeExtracted(),
      META,
    );
    const bottler = result.fields.find((f) => f.field === "Bottler Name / Address");
    expect(bottler?.status).toBe("skipped");
  });

  it("skips Country of Origin when not provided in the application", () => {
    const result = verifyLabel(
      makeExpected({ countryOfOrigin: undefined }),
      makeExtracted({ countryOfOrigin: "" }),
      META,
    );
    const country = result.fields.find((f) => f.field === "Country of Origin");
    expect(country?.status).toBe("skipped");
  });
});
