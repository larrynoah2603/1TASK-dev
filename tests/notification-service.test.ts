import { NotificationStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    notification: {
      findFirst: db.findFirst,
      update: db.update,
    },
  },
}));

vi.mock("@/lib/server-auth", () => ({
  ResourceNotFoundError: class ResourceNotFoundError extends Error {
    statusCode = 404;
  },
  requireCurrentActor: vi.fn(async (actor: UserContext) => actor),
}));

import { markNotificationAsRead } from "@/lib/notification-service";
import { ResourceNotFoundError, type UserContext } from "@/lib/server-auth";

const actor = { id: "user-1" } as UserContext;

describe("service de notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ne peut lire qu'une notification appartenant à l'acteur courant", async () => {
    db.findFirst.mockResolvedValue({ id: "notification-1" });
    db.update.mockResolvedValue({ id: "notification-1", status: NotificationStatus.READ });

    await markNotificationAsRead(actor, "notification-1");

    expect(db.findFirst).toHaveBeenCalledWith({
      where: { id: "notification-1", recipientId: "user-1" },
    });
    expect(db.update).toHaveBeenCalledWith({
      where: { id: "notification-1" },
      data: { status: NotificationStatus.READ, readAt: expect.any(Date) },
    });
  });

  it("renvoie une erreur 404 sans tenter de modifier une notification absente", async () => {
    db.findFirst.mockResolvedValue(null);

    await expect(markNotificationAsRead(actor, "notification-other"))
      .rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(db.update).not.toHaveBeenCalled();
  });
});
