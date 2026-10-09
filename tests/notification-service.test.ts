import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  updateManyAndReturn: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    notification: {
      updateManyAndReturn: db.updateManyAndReturn,
      count: db.count,
    },
  },
}));

vi.mock("@/lib/server-auth", () => ({
  ResourceNotFoundError: class ResourceNotFoundError extends Error {
    statusCode = 404;
  },
  requireCurrentActor: vi.fn(async (actor: UserContext) => actor),
}));

import { countUnreadNotifications, markNotificationAsRead } from "@/lib/notification-service";
import { ResourceNotFoundError, type UserContext } from "@/lib/server-auth";

const actor = { id: "user-1" } as UserContext;

describe("service de notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("utilise readAt comme invariant unique de notification non lue", async () => {
    db.count.mockResolvedValue(3);
    await expect(countUnreadNotifications(actor)).resolves.toBe(3);
    expect(db.count).toHaveBeenCalledWith({
      where: { recipientId: "user-1", channel: NotificationChannel.IN_APP, readAt: null },
    });
  });

  it("ne peut lire qu'une notification appartenant à l'acteur courant", async () => {
    db.updateManyAndReturn.mockResolvedValue([{ id: "notification-1", status: NotificationStatus.READ }]);
    await markNotificationAsRead(actor, "notification-1");
    expect(db.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: "notification-1", recipientId: "user-1", channel: NotificationChannel.IN_APP },
      data: { status: NotificationStatus.READ, readAt: expect.any(Date) },
    });
  });

  it("renvoie une erreur 404 quand aucune notification de l'acteur ne correspond", async () => {
    db.updateManyAndReturn.mockResolvedValue([]);
    await expect(markNotificationAsRead(actor, "notification-other"))
      .rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(db.updateManyAndReturn).toHaveBeenCalledOnce();
  });
});
