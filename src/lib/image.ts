/**
 * @file image.ts
 * Client-side image preparation: downscale and re-encode to JPEG before upload.
 *
 * Why pre-process on the client?
 *   1. **Latency.** Reducing image size lowers the base64 payload sent to the
 *      server, which reduces the prompt token count, both of which shave time
 *      off the Claude call — critical for the ≤5-second SLA.
 *   2. **Format normalization.** Mobile phones often produce HEIC, WebP, or very
 *      high-resolution JPEG files.  Re-encoding to JPEG 90% via Canvas
 *      normalizes all of these without a server-side native-image dependency.
 *   3. **No server storage.** Images never touch the server's disk — they are
 *      converted to base64 client-side and submitted as JSON body, processed
 *      in memory, and discarded.
 *
 * This module is browser-only (`document`, `HTMLImageElement`, `canvas` APIs).
 * It must not be imported in server-side code.
 */

/**
 * The result of preparing a label image for upload.
 * Holds the data in the forms needed by both the API call and the UI preview.
 */
export interface PreparedImage {
  /** Base64-encoded JPEG data, without the `data:image/jpeg;base64,` prefix. */
  base64: string;

  /** Always `"image/jpeg"` after re-encoding. */
  mediaType: "image/jpeg";

  /** Full `data:image/jpeg;base64,...` URL, suitable for use in `<img src>`. */
  dataUrl: string;

  /** Original filename, e.g. "bourbon-label.png". Used for display and CSV matching. */
  name: string;
}

/**
 * Read a `File` as a `data:` URL using the FileReader API.
 * Wrapped in a Promise to allow `await`.
 *
 * @param file - The file to read.
 * @returns    A data URL string, e.g. `"data:image/jpeg;base64,/9j/..."`.
 */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

/**
 * Load an image from a `src` URL into an `HTMLImageElement`.
 * Wrapped in a Promise to allow `await`.
 *
 * @param src - A URL or data URL to load.
 * @returns   A fully-loaded `HTMLImageElement` (dimensions are available).
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

/**
 * Prepare a label image file for upload to the `/api/verify` endpoint.
 *
 * Steps:
 *   1. Read the file into a data URL.
 *   2. Decode into an `HTMLImageElement` to get natural dimensions.
 *   3. Compute a uniform scale factor so the longest dimension does not exceed
 *      `maxDim` pixels (1600 by default).  Images already smaller than `maxDim`
 *      are not upscaled (scale is clamped to 1.0).
 *   4. Draw to an off-screen canvas at the scaled dimensions.
 *   5. Export the canvas as a JPEG data URL at the specified quality.
 *   6. Strip the data-URL prefix to get the raw base64 payload.
 *
 * @param file   - The image file chosen by the user.
 * @param maxDim - Maximum length of either dimension in pixels. Default 1600.
 * @param quality - JPEG encode quality, 0.0–1.0. Default 0.9 (high quality).
 * @returns      A `PreparedImage` ready to POST to `/api/verify`.
 * @throws       If the browser does not support Canvas 2D, or if the file
 *               cannot be read or decoded.
 */
export async function prepareImage(
  file: File,
  maxDim = 1600,
  quality = 0.9,
): Promise<PreparedImage> {
  const dataUrl = await readAsDataURL(file);
  const img     = await loadImage(dataUrl);

  // Compute scale: shrink to fit maxDim; never enlarge a small image.
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width  * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);

  const out = canvas.toDataURL("image/jpeg", quality);

  return {
    base64:    out.split(",")[1] ?? "", // strip "data:image/jpeg;base64,"
    mediaType: "image/jpeg",
    dataUrl:   out,
    name:      file.name,
  };
}
