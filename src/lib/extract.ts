/**
 * @file extract.ts
 * Stage 1 of the verification pipeline: send a label image to a Claude vision
 * model and receive a schema-validated `ExtractedLabel` object.
 *
 * Design principles:
 *   - The model's job is PERCEPTION ONLY — transcribe text exactly as printed.
 *     It does not judge whether the label passes or fails.
 *   - Structured output (`output_config.format.type = "json_schema"`) guarantees
 *     a predictable shape from every response; no fragile JSON-parsing required.
 *   - Thinking is disabled: this is a read-and-transcribe task, not reasoning.
 *     Thinking adds latency with no accuracy benefit here, and the 5-second SLA
 *     has no headroom for it.
 *   - The model is env-configurable so speed/accuracy can be tuned without code
 *     changes — see `MODEL` below.
 *
 * See also: `src/lib/verify.ts` for Stage 2 (deterministic verdict logic).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedLabel } from "./types";

/**
 * The Claude model used for label extraction.
 *
 * Configurable via the `ANTHROPIC_MODEL` environment variable:
 *
 *   `claude-haiku-4-5`  — Fastest / cheapest. Accurate on clean, flat labels;
 *                         may miss fine text on degraded or angled photos.
 *
 *   `claude-sonnet-4-6` — DEFAULT. Handles real-world phone photos (glare,
 *                         angle, low light) while staying ≤5 seconds.
 *
 *   `claude-opus-4-8`   — Most accurate on difficult images. Slightly slower
 *                         (~5 s) and costs more per call.
 */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

/** Anthropic client — reads ANTHROPIC_API_KEY from the environment automatically. */
const client = new Anthropic();

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/**
 * System prompt sent before every extraction call.
 *
 * Critical rules:
 *   1. Transcribe EXACTLY as printed — capitalization, punctuation, and spacing
 *      are all significant.  The Government Warning is compared character-by-
 *      character against the canonical CFR text; any reformatting breaks it.
 *   2. Never guess or infer values that are not visible on the label.
 *   3. Use sentinels for absent fields: `""` for strings, `-1` for abvPercent.
 */
const SYSTEM = `You are a data-extraction assistant for U.S. TTB (Alcohol and Tobacco Tax and Trade Bureau) label review.
Read the alcohol beverage label in the image and return the requested fields.

Rules:
- Transcribe text EXACTLY as printed: preserve capitalization, punctuation, spacing, and numbering. This is critical for the government warning, which is checked word-for-word.
- If a field is not visible on the label, return an empty string "" — never guess or infer a value that is not printed.
- abvPercent: the alcohol-by-volume as a plain number (e.g. 45 for "45% Alc./Vol."), or -1 if no ABV is shown.
- bottlerInfo: the name and address of the bottler/producer as printed (e.g. "Old Tom Distillery Co., Bardstown, KY"), or "".
- countryOfOrigin: the country of origin if stated (mainly for imports), or "".
- governmentWarning: the complete "GOVERNMENT WARNING" statement exactly as printed (including its capitalization), or "" if there is no such statement.
- warningHeadingBold: true if the "GOVERNMENT WARNING" heading is in bold type, false if it is clearly not bold (only meaningful when a warning is present).
- legible: false if glare, blur, low resolution, or a steep angle prevented you from confidently reading the key fields.`;

/**
 * JSON Schema for structured output.
 *
 * Every field is required; absent values use sentinels (`""` / `-1`) so the
 * returned object always has a predictable shape.  `additionalProperties: false`
 * is mandatory for Claude structured-output mode — it prevents the model from
 * adding extra keys that would fail schema validation.
 *
 * This schema is compiled server-side and cached for ~24 hours; the first
 * request after a cold start pays a one-time compile cost (~6 s extra).
 */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    brandName:         { type: "string",  description: "Brand name as printed, or ''." },
    classType:         { type: "string",  description: "Class/type designation, e.g. 'Kentucky Straight Bourbon Whiskey', or ''." },
    alcoholContent:    { type: "string",  description: "Alcohol-content text as printed, e.g. '45% Alc./Vol. (90 Proof)', or ''." },
    abvPercent:        { type: "number",  description: "ABV as a plain number (e.g. 45), or -1 if absent." },
    netContents:       { type: "string",  description: "Net contents as printed, e.g. '750 mL', or ''." },
    bottlerInfo:       { type: "string",  description: "Name and address of the bottler/producer, or ''." },
    countryOfOrigin:   { type: "string",  description: "Country of origin if stated (imports), or ''." },
    governmentWarning: { type: "string",  description: "Full government warning exactly as printed, or ''." },
    warningHeadingBold:{ type: "boolean", description: "Whether the 'GOVERNMENT WARNING' heading is in bold type." },
    legible:           { type: "boolean", description: "Whether the image was clear enough to read confidently." },
    imageNotes:        { type: "string",  description: "Brief notes on image quality issues (glare, angle, blur), or ''." },
  },
  required: [
    "brandName",
    "classType",
    "alcoholContent",
    "abvPercent",
    "netContents",
    "bottlerInfo",
    "countryOfOrigin",
    "governmentWarning",
    "warningHeadingBold",
    "legible",
    "imageNotes",
  ],
} as const;

/**
 * Send a label image to the configured Claude vision model and return the
 * structured `ExtractedLabel` fields.
 *
 * This is a pure extraction step — it returns exactly what is printed on the
 * label with no interpretation.  The caller (`verifyLabel`) handles all
 * comparison logic.
 *
 * @param imageBase64 - Base64-encoded image data (no `data:` prefix).
 * @param mediaType   - MIME type of the image (`image/jpeg`, `image/png`, etc.).
 * @param model       - Claude model id to read with; defaults to the env-configured MODEL.
 * @returns           A fully-populated `ExtractedLabel` with sentinel values
 *                    (`""` / `-1`) for fields not present on the label.
 * @throws            If the model does not return a text block (network error,
 *                    content policy block, etc.).
 */
export async function extractLabel(
  imageBase64: string,
  mediaType: ImageMediaType,
  model: string = MODEL,
): Promise<ExtractedLabel> {
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    // Perception task, not reasoning — disable thinking to stay within the 5s budget.
    thinking: { type: "disabled" },
    system: SYSTEM,
    // output_config guarantees a single text block of schema-valid JSON.
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          { type: "text", text: "Extract the TTB label fields from this image." },
        ],
      },
    ],
  } as Anthropic.Messages.MessageCreateParamsNonStreaming);

  // The structured-output format always delivers exactly one text block.
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model did not return structured output.");
  }

  // Defensively apply defaults: even though the schema marks all fields required,
  // guard against unexpected nulls so downstream code can assume clean types.
  const raw = JSON.parse(textBlock.text) as Partial<ExtractedLabel>;
  return {
    brandName:          (raw.brandName          ?? "").trim(),
    classType:          (raw.classType           ?? "").trim(),
    alcoholContent:     (raw.alcoholContent      ?? "").trim(),
    abvPercent:         typeof raw.abvPercent === "number" ? raw.abvPercent : -1,
    netContents:        (raw.netContents         ?? "").trim(),
    bottlerInfo:        (raw.bottlerInfo         ?? "").trim(),
    countryOfOrigin:    (raw.countryOfOrigin     ?? "").trim(),
    governmentWarning:  (raw.governmentWarning   ?? "").trim(),
    warningHeadingBold: raw.warningHeadingBold !== false, // undefined → true (benefit of the doubt)
    legible:            raw.legible !== false,            // undefined → true
    imageNotes:         (raw.imageNotes          ?? "").trim(),
  };
}
