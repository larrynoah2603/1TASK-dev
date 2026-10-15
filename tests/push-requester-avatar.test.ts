import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationChannel } from "@prisma/client";
import { decodePushRequesterPhoto } from "@/lib/push-requester-photo";
import { GET } from "@/app/api/notifications/push-photo/[id]/route";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const mocks = vi.hoisted(() => ({
  requireSessionUserContext: vi.fn(),
  notificationMayBeDelivered: vi.fn(),
  notificationFindFirst: vi.fn(),
  ticketFindUnique: vi.fn(),
}));
vi.mock("@/lib/server-auth", () => ({
  requireSessionUserContext: mocks.requireSessionUserContext,
}));
vi.mock("@/lib/notification-authorization", () => ({
  notificationMayBeDelivered: mocks.notificationMayBeDelivered,
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    notification: { findFirst: mocks.notificationFindFirst },
    ticket: { findUnique: mocks.ticketFindUnique },
  },
}));

const PHOTO = `data:image/png;base64,${Buffer.from("small-photo", "utf8").toString("base64")}`;
const url = "https://1task.test/api/notifications/push-photo/n123";
const get = (id = "n123") => GET(new Request(url), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireSessionUserContext.mockResolvedValue({ id: "receiver" });
  mocks.notificationFindFirst.mockResolvedValue({ ticketId: "ticket123" });
  mocks.notificationMayBeDelivered.mockResolvedValue(true);
  mocks.ticketFindUnique.mockResolvedValue({
    confidential: false,
    requester: { image: PHOTO },
  });
});

describe("Web Push avatar demandeur — stockage et sécurité", () => {
  it("n'accepte que les data URI images Graph connues, limitées à 128 Ko", () => {
    expect(decodePushRequesterPhoto(PHOTO)?.mime).toBe("image/png");
    expect(Buffer.from(decodePushRequesterPhoto(PHOTO)!.bytes).toString()).toBe("small-photo");
    expect(decodePushRequesterPhoto(null)).toBeNull();
    expect(decodePushRequesterPhoto("https://evil.test/photo.png")).toBeNull();
    expect(decodePushRequesterPhoto("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(decodePushRequesterPhoto("data:text/html;base64,PHN2Zz4=")).toBeNull();
    expect(decodePushRequesterPhoto(`data:image/png;base64,${"Y".repeat(180_000)}`)).toBeNull();
  });

  it("sert la photo uniquement au propriétaire de la notification PUSH", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("small-photo");
    expect(mocks.notificationFindFirst).toHaveBeenCalledWith({
      where: { id: "n123", recipientId: "receiver", channel: NotificationChannel.PUSH },
      select: { ticketId: true },
    });
    expect(mocks.notificationMayBeDelivered).toHaveBeenCalledWith("n123");
    expect(mocks.ticketFindUnique).toHaveBeenCalledWith({
      where: { id: "ticket123" },
      select: { confidential: true, requester: { select: { image: true } } },
    });
  });

  it("refuse les notifications d'autrui, les accès révoqués ou les tickets confidentiels", async () => {
    mocks.notificationFindFirst.mockResolvedValueOnce(null);
    expect((await get()).status).toBe(404);
    expect(mocks.ticketFindUnique).not.toHaveBeenCalled();
    mocks.notificationFindFirst.mockResolvedValueOnce({ ticketId: "ticket123" });
    mocks.notificationMayBeDelivered.mockResolvedValueOnce(false);
    expect((await get()).status).toBe(404);
    expect(mocks.ticketFindUnique).not.toHaveBeenCalled();
    mocks.ticketFindUnique.mockResolvedValueOnce({
      confidential: true, requester: { image: PHOTO },
    });
    expect((await get()).status).toBe(404);
  });

  it("refuse les sessions invalides, et les photos absentes sans exposer d'information", async () => {
    mocks.requireSessionUserContext.mockRejectedValueOnce(new Error("Not logged in"));
    const unauthorized = await get();
    expect(unauthorized.status).toBe(404);
    expect(unauthorized.headers.get("cache-control")).toContain("no-store");
    mocks.ticketFindUnique.mockResolvedValueOnce({
      confidential: false, requester: { image: null },
    });
    expect((await get()).status).toBe(404);
  });

  it("garde les photos hors du payload Web Push et conserve le lien direct", () => {
    const service = readFileSync("lib/push-notification-service.ts", "utf8");
    expect(service).toContain("decodePushRequesterPhoto(ticket.requester.image)");
    expect(service).toContain("!ticket.confidential");
    expect(service).toContain("encodeURIComponent(notification.id)");
    expect(service).toContain("requesterPhotoUrl }));");
    expect(service).not.toContain("requesterPhotoUrl: ticket.requester.image");
    expect(service).toContain("notificationMayBeDelivered(notificationId)");
    expect(readFileSync("lib/push-notification-presentation.ts", "utf8")).toContain("Ticket confidentiel");
  });
});

describe("Service worker — icône du demandeur et repli 1TASK", () => {
  type IconOptions = { icon: string; badge: string; data: { actionUrl: string } };
  async function emitPush(photoUrl?: string, response?: { ok: boolean; mime: string }) {
    const listeners: Record<string, (event: unknown) => void> = {};
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const fetchPhoto = vi.fn().mockResolvedValue({
      ok: response?.ok ?? false,
      headers: { get: () => response?.mime ?? "image/png" },
    });
    runInNewContext(readFileSync("public/push-sw.js", "utf8"), {
      self: { addEventListener: (name: string, callback: (event: unknown) => void) => { listeners[name] = callback; },
        registration: { showNotification }, location: { origin: "https://1task.test" } },
      fetch: fetchPhoto,
      AbortController,
      setTimeout,
      clearTimeout,
      URL,
      clients: {},
    });
    let settled: Promise<unknown> = Promise.resolve();
    listeners.push({
      data: { json: () => ({
        title: "1TASK · Nouveau ticket",
        body: "TCK-001 · Demandeur : Marie",
        actionUrl: "/tickets/ticket123",
        requesterPhotoUrl: photoUrl,
      }) },
      waitUntil: (promise: Promise<unknown>) => { settled = promise; },
    });
    await settled;
    const [, details] = showNotification.mock.calls[0] as [string, IconOptions];
    return { details, fetchPhoto };
  }

  it("utilise l'avatar privé lorsque le navigateur peut le récupérer", async () => {
    const url = "/api/notifications/push-photo/n123";
    const { details, fetchPhoto } = await emitPush(url, { ok: true, mime: "image/png" });
    expect(details.icon).toBe(url);
    expect(details.badge).toBe("/push-icon.svg");
    expect(details.data.actionUrl).toBe("/tickets/ticket123");
    expect(fetchPhoto).toHaveBeenCalledOnce();
    expect(fetchPhoto.mock.calls[0][1]).toEqual(expect.objectContaining({
      credentials: "include",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    }));
  });

  it("revient au logo 1TASK en l'absence d'avatar ou d'autorisation", async () => {
    expect((await emitPush()).details.icon).toBe("/push-icon.svg");
    expect((await emitPush("/api/notifications/push-photo/n123", { ok: false, mime: "image/png" })).details.icon).toBe("/push-icon.svg");
    const malformed = await emitPush("https://evil.test/image.png");
    expect(malformed.details.icon).toBe("/push-icon.svg");
    expect(malformed.fetchPhoto).not.toHaveBeenCalled();
  });
});
