// Shared types for the TTB label-verification engine.

/** Per-field verdict. `skipped` = the application provided no value to compare. */
export type FieldStatus = "pass" | "warn" | "fail" | "missing" | "skipped";

/** The values the applicant entered in COLA (what the label is checked against). */
export interface ExpectedFields {
  brandName?: string;
  classType?: string;
  /** As entered, e.g. "45% Alc./Vol." or just "45". */
  alcoholContent?: string;
  /** e.g. "750 mL". */
  netContents?: string;
}

/** Structured fields the vision model reads off the label image. */
export interface ExtractedLabel {
  brandName: string; // "" when not present on the label
  classType: string;
  /** Raw text as printed, e.g. "45% Alc./Vol. (90 Proof)". */
  alcoholContent: string;
  /** Parsed ABV percentage, or -1 when none could be read. */
  abvPercent: number;
  netContents: string;
  /** Full warning text read from the label, "" when absent. */
  governmentWarning: string;
  /** Model's judgement on whether the image was clear enough to read. */
  legible: boolean;
  /** Free-text notes (glare, angle, illegible regions). */
  imageNotes: string;
}

export interface FieldResult {
  field: string;
  status: FieldStatus;
  expected: string | null;
  found: string | null;
  message: string;
}

export interface WarningCheck {
  status: Extract<FieldStatus, "pass" | "fail" | "missing">;
  present: boolean;
  /** "GOVERNMENT WARNING:" appears in capital letters (27 CFR §16.22). */
  prefixAllCaps: boolean;
  /** Body matches the mandatory statement word-for-word. */
  exactMatch: boolean;
  found: string | null;
  message: string;
  differences: string[];
}

export interface VerificationResult {
  overall: "pass" | "review" | "fail";
  fields: FieldResult[];
  warning: WarningCheck;
  extracted: ExtractedLabel;
  model: string;
  elapsedMs: number;
}
