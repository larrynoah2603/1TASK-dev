import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { notification: db } }));

import { buildEmailContent, deliverEmailNotification, MicrosoftGraphMailError, resetMicrosoftGraphTokenCacheForTests } from "@/lib/email-notification-service";

const notification = {
  id: "notification-1", channel: NotificationChannel.EMAIL, status: NotificationStatus.PENDING,
  title: "Ticket <important>", body: "Une mise à jour & un suivi", severity: "CRITICAL",
  actionUrl: "/tickets/ticket-1", recipient: { email: "recipient@example.com" },
};

function response(status: number, body?: object, headers?: Record<string, string>) {
  return new Response(body ? JSON.stringify(body) : null, { status, headers });
}

describe("livraison des notifications e-mail par Microsoft Graph", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    resetMicrosoftGraphTokenCacheForTests();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/1task");
    vi.stubEnv("NEXTAUTH_URL", "https://1task.example.com");
    vi.stubEnv("MICROSOFT_MAIL_TENANT_ID", "mail-tenant");
    vi.stubEnv("MICROSOFT_MAIL_CLIENT_ID", "mail-client");
    vi.stubEnv("MICROSOFT_MAIL_CLIENT_SECRET", "mail-secret");
    vi.stubEnv("MICROSOFT_MAIL_SENDER", "sender@example.com");
    db.findUnique.mockResolvedValue(notification);
    db.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("obtient un jeton app-only puis envoie au bon destinataire depuis la boîte configurée", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(200, { access_token: "token", expires_in: 3600 }))
      .mockResolvedValueOnce(response(202));

    await expect(deliverEmailNotification("notification-1")).resolves.toMatchObject({ delivered: true });
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://login.microsoftonline.com/mail-tenant/oauth2/v2.0/token");
    expect(String(tokenInit?.body)).toContain("scope=https%3A%2F%2Fgraph.microsoft.com%2F.default");
    expect(String(tokenInit?.body)).toContain("grant_type=client_credentials");
    const [mailUrl, mailInit] = fetchMock.mock.calls[1];
    expect(mailUrl).toBe("https://graph.microsoft.com/v1.0/users/sender%40example.com/sendMail");
    const payload = JSON.parse(String(mailInit?.body));
    expect(payload.message.toRecipients).toEqual([{ emailAddress: { address: "recipient@example.com" } }]);
    expect(payload.message.subject).toBe("[1TASK] Ticket <important>");
    expect(payload.message.body).toMatchObject({ contentType: "HTML" });
    expect(payload.message.body.content).toContain("Ticket &lt;important&gt;");
    expect(payload.message.body.content).not.toContain("Ticket <important>");
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "notification-1", channel: NotificationChannel.EMAIL, status: NotificationStatus.PENDING },
      data: { status: NotificationStatus.SENT, sentAt: expect.any(Date) },
    }));
  });

  it("construit aussi une version texte et refuse les liens externes", () => {
    const content = buildEmailContent({ ...notification, actionUrl: "https://evil.example/phish" }, "https://1task.example.com");
    expect(content.text).toContain("1TASK\n\nTicket <important>");
    expect(content.actionUrl).toBeNull();
    expect(content.html).not.toContain("evil.example");
  });

  it.each([401, 403, 500, 503])("laisse la notification en attente après une réponse Graph %s", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(200, { access_token: "token" })).mockResolvedValueOnce(response(status));
    await expect(deliverEmailNotification("notification-1")).rejects.toMatchObject({ status });
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it("propage Retry-After lors d'une limitation 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(200, { access_token: "token" })).mockResolvedValueOnce(response(429, undefined, { "Retry-After": "120" }));
    await expect(deliverEmailNotification("notification-1")).rejects.toMatchObject({ status: 429, retryAfterMs: 120_000 });
  });

  it("transforme une panne réseau en erreur Graph sans divulguer le détail", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("request with secret token failed"));
    await expect(deliverEmailNotification("notification-1")).rejects.toEqual(new MicrosoftGraphMailError(null));
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it("refuse un destinataire sans adresse avant tout appel réseau", async () => {
    db.findUnique.mockResolvedValue({ ...notification, recipient: { email: "" } });
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(deliverEmailNotification("notification-1")).rejects.toThrow(/no email address/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse une configuration mail incomplète avant l'acquisition du jeton", async () => {
    vi.stubEnv("MICROSOFT_MAIL_CLIENT_SECRET", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(deliverEmailNotification("notification-1")).rejects.toThrow(/quatre variables Microsoft Mail/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ne livre ni un autre canal ni une notification déjà traitée", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    db.findUnique.mockResolvedValueOnce({ ...notification, channel: NotificationChannel.PUSH });
    await expect(deliverEmailNotification("notification-1")).rejects.toThrow(/not an EMAIL/);
    db.findUnique.mockResolvedValueOnce({ ...notification, status: NotificationStatus.SENT });
    await expect(deliverEmailNotification("notification-1")).resolves.toMatchObject({ delivered: false, reason: "not-pending" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
