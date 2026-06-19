/**
 * @file types.ts
 * Shared TypeScript types for the TTB label-verification engine.
 *
 * Data flows through the engine in three shapes:
 *   1. `ExpectedFields`     — what the COLA application claims
 *   2. `ExtractedLabel`     — what Claude vision reads off the label image
 *   3. `VerificationResult` — the deterministic verdict comparing 1 vs 2
 *
 * Keep this file free of logic — it is a pure schema declaration.
 */

/**
 * Per-field verdict status.
 *
 * - `"pass"`    — the field matches the application value (within tolerance).
 * - `"warn"`    — a near-miss that a human should review (e.g. brand name
 *                 one character off — could be a typo or a legitimate variant).
 * - `"fail"`    — a clear mismatch between the label and the application.
 * - `"missing"` — used exclusively for the Government Warning when it is
 *                 absent from the label (absence is itself non-compliant).
 * - `"skipped"` — the application provided no value for this field, so there
 *                 is nothing to compare against; the field is not checked.
 */
export type FieldStatus = "pass" | "warn" | "fail" | "missing" | "skipped";

/**
 * The values the applicant entered in their COLA (Certificate of Label
 * Approval) application — i.e. what the label *should* say.
 *
 * All fields are optional; blank/undefined fields are skipped during
 * verification so reviewers can focus checks on the fields they care about.
 */
export interface ExpectedFields {
  /** Brand name as declared in the COLA, e.g. "OLD TOM DISTILLERY". */
  brandName?: string;

  /** Class/type designation, e.g. "Kentucky Straight Bourbon Whiskey". */
  classType?: string;

  /**
   * Alcohol content as entered, e.g. "45% Alc./Vol." or just "45".
   * Compared numerically — units and surrounding text are stripped during
   * parsing, so "45%" and "45% Alc./Vol. (90 Proof)" both parse to 45.
   */
  alcoholContent?: string;

  /**
   * Net contents as entered, e.g. "750 mL".
   * Compared after unit normalization so "750 mL" == "750ML" == "0.75 L".
   */
  netContents?: string;

  /**
   * Name and address of the bottler or producer, e.g.
   * "Old Tom Distillery Co., Bardstown, KY".
   * Optional — mainly relevant for third-party bottlers and imports.
   */
  bottlerInfo?: string;

  /**
   * Country of origin, e.g. "France".
   * Optional — primarily relevant for import labels.
   */
  countryOfOrigin?: string;
}

/**
 * Structured fields extracted from a label image by the Claude vision model.
 *
 * Every field is required and uses sentinel values for absent content:
 * - `""` (empty string) for text fields not visible on the label.
 * - `-1` for `abvPercent` when no ABV is shown.
 *
 * Using sentinels instead of optionals makes the shape predictable and means
 * every missing-field case is an explicit decision, not an accidental `undefined`.
 */
export interface ExtractedLabel {
  /** Brand name exactly as printed on the label, or `""` when not present. */
  brandName: string;

  /** Class/type designation as printed, or `""`. */
  classType: string;

  /**
   * Alcohol-content text exactly as printed, e.g. "45% Alc./Vol. (90 Proof)".
   * Used for display; the numeric comparison uses `abvPercent`.
   */
  alcoholContent: string;

  /**
   * ABV as a plain number extracted from the label, e.g. `45` for "45%".
   * `-1` when no ABV is visible on the label.
   */
  abvPercent: number;

  /** Net contents as printed, e.g. "750 mL", or `""`. */
  netContents: string;

  /** Name and address of the bottler/producer as printed, or `""`. */
  bottlerInfo: string;

  /**
   * Country of origin if stated on the label, or `""`.
   * Mainly present on import labels.
   */
  countryOfOrigin: string;

  /**
   * Full Government Warning statement exactly as printed, including its
   * capitalization, or `""` when absent.
   * Transcribed verbatim so the deterministic check can compare it character-
   * by-character against the canonical 27 CFR §16.21 text.
   */
  governmentWarning: string;

  /**
   * Whether the "GOVERNMENT WARNING" heading appears in bold type.
   * Bold is required by 27 CFR §16.22. Only meaningful when a warning is present.
   * Detection from a photo is heuristic — treat a `false` reading as a flag for
   * human verification rather than a conclusive determination.
   */
  warningHeadingBold: boolean;

  /**
   * Whether the image was clear enough to read confidently.
   * `false` indicates glare, motion blur, extreme angle, or very low resolution
   * prevented the model from reading one or more fields with confidence.
   */
  legible: boolean;

  /**
   * Free-text notes from the model about image-quality issues, e.g.
   * "Heavy glare on the lower third; net contents may be partially obscured."
   * Empty string when the image is clean.
   */
  imageNotes: string;
}

/**
 * The result of comparing one field from the COLA application against what
 * was read from the label image.
 */
export interface FieldResult {
  /** Human-readable field name, e.g. "Brand Name" or "Alcohol Content (ABV)". */
  field: string;

  /** Verdict for this field. */
  status: FieldStatus;

  /**
   * The value from the COLA application (what the label should say).
   * `null` when the application provided no value (`"skipped"` status).
   */
  expected: string | null;

  /**
   * The value read off the label image.
   * `null` when the field was not found on the label.
   */
  found: string | null;

  /**
   * Plain-language explanation of the verdict, suitable for display to a
   * reviewer. E.g. "Matches the application (case/punctuation differ only)."
   */
  message: string;
}

/**
 * The result of the Government Warning compliance check.
 *
 * Separated from `FieldResult` because the warning check has richer structure:
 * three independent sub-conditions (presence, capitalization, word-for-word match)
 * that each need to be surfaced distinctly for the reviewer.
 */
export interface WarningCheck {
  /**
   * Overall status. Only `"pass"`, `"fail"`, or `"missing"` — no warn/skipped
   * because the warning is always mandatory and never a near-miss scenario.
   */
  status: Extract<FieldStatus, "pass" | "fail" | "missing">;

  /** Whether a Government Warning statement was found on the label at all. */
  present: boolean;

  /**
   * Whether the "GOVERNMENT WARNING:" heading appears in all capital letters,
   * as required by 27 CFR §16.22.
   */
  prefixAllCaps: boolean;

  /**
   * Whether the body of the warning matches the mandatory statement word-for-word,
   * as required by 27 CFR §16.21. Case-insensitive on the body text; only the
   * "GOVERNMENT WARNING:" prefix itself must be ALL CAPS.
   */
  exactMatch: boolean;

  /** The warning text as found on the label, or `null` when absent. */
  found: string | null;

  /** Plain-language overall summary message. */
  message: string;

  /**
   * List of specific compliance failures, each as a plain-language string.
   * Empty when `status === "pass"`. May include multiple items, e.g. one for
   * the capitalization and one for a wording difference.
   */
  differences: string[];
}

/**
 * The complete result of verifying a single label — the union of all field
 * results, the warning check, and metadata about the verification run.
 */
export interface VerificationResult {
  /**
   * Roll-up verdict.
   * - `"pass"`   — all fields match and the warning is compliant.
   * - `"review"` — at least one field is a near-miss; a human should check.
   * - `"fail"`   — at least one field has a clear mismatch or the warning fails.
   */
  overall: "pass" | "review" | "fail";

  /** Per-field results, one entry per field in `ExpectedFields`. */
  fields: FieldResult[];

  /** Government Warning compliance check result. */
  warning: WarningCheck;

  /** The raw structured data extracted from the label image by the vision model. */
  extracted: ExtractedLabel;

  /** The Anthropic model ID used for extraction, e.g. "claude-sonnet-4-6". */
  model: string;

  /** Wall-clock time in milliseconds for the full extract + verify pipeline. */
  elapsedMs: number;
}
