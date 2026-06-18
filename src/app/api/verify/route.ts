import { extractLabel, MODEL } from "@/lib/extract";
import { verifyLabel } from "@/lib/verify";
import type { ExpectedFields } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // Vercel function ceiling (well above our ~5s target)

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const ALLOWED_MEDIA = new Set<ImageMediaType>(["image/jpeg", "image/png", "image/gif", "image/webp"]);

interface Body {
  imageBase64?: string;
  mediaType?: string;
  expected?: ExpectedFields;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to the environment to enable verification." },
      500,
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const { imageBase64, mediaType = "image/jpeg", expected = {} } = body;
  if (!imageBase64) return json({ error: "Missing 'imageBase64'." }, 400);
  if (!ALLOWED_MEDIA.has(mediaType as ImageMediaType)) {
    return json({ error: `Unsupported mediaType '${mediaType}'. Use JPEG, PNG, GIF, or WebP.` }, 400);
  }
  if (imageBase64.length > 8_500_000) {
    return json({ error: "Image too large (~6MB max). Please upload a smaller image." }, 413);
  }

  const started = Date.now();
  try {
    const extracted = await extractLabel(imageBase64, mediaType as ImageMediaType);
    const result = verifyLabel(expected, extracted, { model: MODEL, elapsedMs: Date.now() - started });
    return json({ result });
  } catch (e) {
    return json({ error: "Verification failed.", detail: e instanceof Error ? e.message : String(e) }, 502);
  }
}
