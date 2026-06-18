// Client-side image prep: downscale + re-encode to JPEG before upload. Keeps the
// request small (faster round-trip toward the 5s target, lower token cost) and
// normalizes phone photos to a consistent format.

export interface PreparedImage {
  base64: string;
  mediaType: "image/jpeg";
  /** Data URL for preview thumbnails. */
  dataUrl: string;
  name: string;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

export async function prepareImage(file: File, maxDim = 1600, quality = 0.9): Promise<PreparedImage> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);

  const out = canvas.toDataURL("image/jpeg", quality);
  return { base64: out.split(",")[1] ?? "", mediaType: "image/jpeg", dataUrl: out, name: file.name };
}
