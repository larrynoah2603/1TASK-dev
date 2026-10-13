/**
 * Microsoft Graph synchronisation stores user photos as bounded data URIs.
 * This helper accepts only the image formats and size already allowed by
 * lib/entra.ts; never send these bytes in the Web Push payload.
 */
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_PHOTO_BYTES = 128_000;

export function decodePushRequesterPhoto(source: string | null | undefined): {
  mime: string;
  bytes: Uint8Array;
} | null {
  if (!source) return null;
  const match = /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(source);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) return null;
  // Reject oversized payloads before allocating a Buffer.
  if (match[2].length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) return null;
  return { mime, bytes: new Uint8Array(bytes) };
}
