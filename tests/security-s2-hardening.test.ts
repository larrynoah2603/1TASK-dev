import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "@/next.config";
import { hasMatchingAttachmentSignature } from "@/lib/attachment-signatures";
import {
  isSameOriginMutation,
  isTrustedPushEndpoint,
  MAX_PUSH_REQUEST_BYTES,
  pushSubscriptionSchema,
  readBoundedJson,
} from "@/lib/push-subscription-security";
import { sanitizeTelemetry } from "@/lib/observability";
import { readFileSync } from "node:fs";

afterEach(() => vi.unstubAllEnvs());

describe("S2 — en-têtes HTTP et protection des caches", () => {
  it("protège toutes les réponses sans contraindre les scripts de NextAuth et du service worker", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const rules = await nextConfig.headers!();
    const global = rules.find((r) => r.source === "/:path*");
    const headers = Object.fromEntries(global!.headers!.map((h) => [h.key, h.value]));
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("same-origin");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Content-Security-Policy"]).not.toContain("script-src");
    expect(headers).not.toHaveProperty("Strict-Transport-Security");
  });

  it("réserve HSTS au déploiement Production et exclut les caches publics des API", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const rules = await nextConfig.headers!();
    const global = rules.find((r) => r.source === "/:path*");
    expect(global!.headers).toContainEqual({
      key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains",
    });
    for (const route of [
      "/api/:path*", "/inbox/:path*", "/tickets/:path*", "/admin/:path*",
      "/notifications/:path*", "/my-assets/:path*",
    ]) {
      expect(rules.find((r) => r.source === route)?.headers).toContainEqual({
        key: "Cache-Control", value: "private, no-store, max-age=0",
      });
    }
    expect(rules.some((r) => r.source === "/_next/:path*")).toBe(false);
  });
});

describe("S2 — destination et requêtes d'inscription Push", () => {
  const keys = { p256dh: "A".repeat(86), auth: "b".repeat(22) };

  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/xyz",
    "https://web.push.apple.com/abc",
    "https://wns2-bl2p.notify.windows.com/w/?token=abc",
  ])("accepte un service Push public connu : %s", (endpoint) => {
    expect(isTrustedPushEndpoint(endpoint)).toBe(true);
    expect(pushSubscriptionSchema.parse({ endpoint, keys })).toEqual({ endpoint, keys });
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc",
    "http://127.0.0.1/push",
    "https://127.0.0.1/push",
    "https://localhost/push",
    "https://push.evil.invalid/push",
    "https://fcm.googleapis.com.evil.invalid/send",
    "https://user:pass@fcm.googleapis.com/send",
    "https://fcm.googleapis.com:444/send",
    "https://fcm.googleapis.com/send#secret",
  ])("refuse la destination risquée : %s", (url) => {
    expect(isTrustedPushEndpoint(url)).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ endpoint: url, keys }).success).toBe(false);
  });

  it("refuse les paramètres et clés arbitraires, tout en conservant le schéma strict", () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/abc";
    expect(pushSubscriptionSchema.safeParse({ endpoint, keys, userId: "other" }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ endpoint, keys: { p256dh: "tiny", auth: "tiny" } }).success).toBe(false);
  });

  it("refuse les origines différentes, avec ou sans header Origin", () => {
    const url = "https://1task.example/api/notifications/push-subscriptions";
    expect(isSameOriginMutation(new Request(url, { headers: { origin: "https://1task.example" } }))).toBe(true);
    expect(isSameOriginMutation(new Request(url, { headers: { origin: "https://evil.invalid" } }))).toBe(false);
    expect(isSameOriginMutation(new Request(url, { headers: { "sec-fetch-site": "cross-site" } }))).toBe(false);
  });

  it("borne les demandes JSON, y compris quand Content-Length est absent", async () => {
    const url = "https://1task.example/api/notifications/push-subscriptions";
    const valid = new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: '{"ok":true}' });
    expect(await readBoundedJson(valid)).toEqual({ ok: true });
    const tooLarge = new Request(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: "x".repeat(MAX_PUSH_REQUEST_BYTES + 1),
    });
    await expect(readBoundedJson(tooLarge)).rejects.toMatchObject({ statusCode: 413 });
    const wrongType = new Request(url, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
    await expect(readBoundedJson(wrongType)).rejects.toMatchObject({ statusCode: 415 });
  });

  it("ne renvoie plus les clés de souscription dans la réponse HTTP", () => {
    const route = readFileSync("app/api/notifications/push-subscriptions/route.ts", "utf8");
    expect(route).toContain("pushSubscriptionSchema.parse(await readBoundedJson(request))");
    expect(route).toContain("pushSubscription.upsert");
    expect(route).toContain("return NextResponse.json({ ok: true, id: subscription.id }, { status: 201 });");
    expect(route).toContain("pushSubscription.deleteMany");
    expect(route).not.toContain("NextResponse.json(subscription,");
  });
});

describe("S2 — pièces jointes Full et télémétrie", () => {
  it("vérifie les signatures MIME sans scanner ni activer les uploads V1", () => {
    const text = (s: string) => new TextEncoder().encode(s);
    const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1]);
    const jpeg = new Uint8Array([0xff,0xd8,0xff,0x00]);
    const webp = text("RIFF1234WEBP");
    const zip = new Uint8Array([0x50,0x4b,0x03,0x04,0,0]);
    expect(hasMatchingAttachmentSignature(text("%PDF-1.7"), "application/pdf")).toBe(true);
    expect(hasMatchingAttachmentSignature(text("<script>1</script>"), "application/pdf")).toBe(false);
    expect(hasMatchingAttachmentSignature(png, "image/png")).toBe(true);
    expect(hasMatchingAttachmentSignature(text("fake"), "image/png")).toBe(false);
    expect(hasMatchingAttachmentSignature(jpeg, "image/jpeg")).toBe(true);
    expect(hasMatchingAttachmentSignature(webp, "image/webp")).toBe(true);
    expect(hasMatchingAttachmentSignature(zip, "application/zip")).toBe(true);
    expect(hasMatchingAttachmentSignature(zip, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
    expect(hasMatchingAttachmentSignature(text("Bonjour"), "text/plain")).toBe(true);
    expect(hasMatchingAttachmentSignature(new Uint8Array([0,1,2]), "text/plain")).toBe(false);
    const service = readFileSync("lib/ticket-attachment-service.ts", "utf8");
    expect(service).toContain("requireProductCapability(\"attachmentUploads\")");
    expect(service).toContain("hasMatchingAttachmentSignature(content, input.type)");
    const download = readFileSync("app/api/tickets/[id]/attachments/[attachmentId]/route.ts", "utf8");
    expect(download).toContain('"Content-Security-Policy": "sandbox"');
    expect(download).toContain('"X-Content-Type-Options": "nosniff"');
  });

  it("retire les informations nominatives des logs sans perdre la trace", () => {
    const context = sanitizeTelemetry({
      traceId: "a1b2c3d4",
      operation: "ticket.update",
      requesterEmail: "private@example.test",
      ticketTitle: "Personnel",
      photoUrl: "/api/private/photo",
      fileName: "confidentiel.pdf",
      messageBody: "Secret",
      nested: { password: "hidden", endpoint: "https://push.example/private" },
    }) as Record<string, unknown>;
    expect(context.traceId).toBe("a1b2c3d4");
    expect(context.operation).toBe("ticket.update");
    expect(context.requesterEmail).toBe("[REDACTED]");
    expect(context.ticketTitle).toBe("[REDACTED]");
    expect(context.photoUrl).toBe("[REDACTED]");
    expect(context.fileName).toBe("[REDACTED]");
    expect(context.messageBody).toBe("[REDACTED]");
    expect(context.nested).toEqual({ password: "[REDACTED]", endpoint: "[REDACTED]" });
  });
});
