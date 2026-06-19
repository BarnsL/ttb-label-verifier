import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedLabel } from "./types";

/**
 * Model is env-configurable so we can trade accuracy for latency without code
 * changes. The default is a fast, accurate model that meets the TTB 5-second
 * target. Override with ANTHROPIC_MODEL:
 *   claude-opus-4-8   — most accurate on poor images (~5s)
 *   claude-haiku-4-5  — fastest, lowest cost
 */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

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

// Structured-output schema: every field required, sentinels for "absent"
// ("" for strings, -1 for abvPercent). additionalProperties:false is required.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    brandName: { type: "string", description: "Brand name as printed, or ''." },
    classType: { type: "string", description: "Class/type designation, e.g. 'Kentucky Straight Bourbon Whiskey', or ''." },
    alcoholContent: { type: "string", description: "Alcohol-content text as printed, e.g. '45% Alc./Vol. (90 Proof)', or ''." },
    abvPercent: { type: "number", description: "ABV as a number, or -1 if absent." },
    netContents: { type: "string", description: "Net contents as printed, e.g. '750 mL', or ''." },
    bottlerInfo: { type: "string", description: "Name and address of the bottler/producer, or ''." },
    countryOfOrigin: { type: "string", description: "Country of origin if stated (imports), or ''." },
    governmentWarning: { type: "string", description: "Full government warning exactly as printed, or ''." },
    warningHeadingBold: { type: "boolean", description: "Whether the 'GOVERNMENT WARNING' heading is in bold type." },
    legible: { type: "boolean", description: "Whether the image was clear enough to read confidently." },
    imageNotes: { type: "string", description: "Brief notes on image quality issues (glare, angle, blur), or ''." },
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

/** Send a label image to a Claude vision model and return structured fields. */
export async function extractLabel(
  imageBase64: string,
  mediaType: ImageMediaType,
): Promise<ExtractedLabel> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    // Perception task, not reasoning — disable thinking to stay inside the 5s budget.
    thinking: { type: "disabled" },
    system: SYSTEM,
    // Guarantees a single text block of schema-valid JSON.
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Extract the TTB label fields from this image." },
        ],
      },
    ],
  } as Anthropic.Messages.MessageCreateParamsNonStreaming);

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model did not return structured output.");
  }

  const raw = JSON.parse(textBlock.text) as Partial<ExtractedLabel>;
  return {
    brandName: (raw.brandName ?? "").trim(),
    classType: (raw.classType ?? "").trim(),
    alcoholContent: (raw.alcoholContent ?? "").trim(),
    abvPercent: typeof raw.abvPercent === "number" ? raw.abvPercent : -1,
    netContents: (raw.netContents ?? "").trim(),
    bottlerInfo: (raw.bottlerInfo ?? "").trim(),
    countryOfOrigin: (raw.countryOfOrigin ?? "").trim(),
    governmentWarning: (raw.governmentWarning ?? "").trim(),
    warningHeadingBold: raw.warningHeadingBold !== false,
    legible: raw.legible !== false,
    imageNotes: (raw.imageNotes ?? "").trim(),
  };
}
