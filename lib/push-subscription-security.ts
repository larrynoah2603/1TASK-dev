import { z } from "zod";

/** RFC 8030 endpoints used by supported Chrome, Firefox, Safari and Edge.
 * Never send a VAPID request to an arbitrary subscriber-supplied URL (SSRF). */
const PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
]);

export function isTrustedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const trusted = PUSH_HOSTS.has(hostname)
      || hostname.endsWith(".notify.windows.com")
      || hostname.endsWith(".push.apple.com");
    return url.protocol === "https:" &&
      (url.port === "" || url.port === "443") &&
      trusted && !url.username && !url.password && !url.hash &&
      value.length <= 2048;
  } catch {
    return false;
  }
}

export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(2048).refine(isTrustedPushEndpoint, "Service Push non reconnu."),
  keys: z.object({
    p256dh: z.string().min(40).max(256).regex(/^[A-Za-z0-9_-]+={0,2}$/),
    auth: z.string().min(12).max(128).regex(/^[A-Za-z0-9_-]+={0,2}$/),
  }).strict(),
}).strict();

export const MAX_PUSH_REQUEST_BYTES = 4096;

export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return false;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_PUSH_REQUEST_BYTES)) {
    throw Object.assign(new Error("Requête trop volumineuse."), { statusCode: 413 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw Object.assign(new Error("Format JSON requis."), { statusCode: 415 });
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_PUSH_REQUEST_BYTES) {
    throw Object.assign(new Error("Requête trop volumineuse."), { statusCode: 413 });
  }
  return JSON.parse(text);
}
