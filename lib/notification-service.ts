import { NotificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizePageSize, toCursorPage, type CursorPageOptions } from "@/lib/cursor-pagination";
import {
  requireCurrentActor,
  ResourceNotFoundError,
  type UserContext,
} from "@/lib/server-auth";


export async function listUserNotifications(
  actor: UserContext,
  take = 50,
) {

  const current =
    await requireCurrentActor(actor);


  return prisma.notification.findMany({

    where: {
      recipientId: current.id,
    },

    include: {
      ticket: {
        select: {
          id: true,
          reference: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    take: Math.min(
      Math.max(take, 1),
      100,
    ),

  });

}

export async function listUserNotificationsPage(
  actor: UserContext,
  options: CursorPageOptions = {},
) {
  const current = await requireCurrentActor(actor);
  const pageSize = normalizePageSize(options.pageSize);
  const rows = await prisma.notification.findMany({
    where: { recipientId: current.id },
    include: { ticket: { select: { id: true, reference: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });
  return toCursorPage(rows, pageSize);
}



export async function countUnreadNotifications(
  actor: UserContext,
) {

  const current =
    await requireCurrentActor(actor);


  return prisma.notification.count({

    where: {

      recipientId:
        current.id,

      readAt: null,

    },

  });

}



export async function markNotificationAsRead(
  actor: UserContext,
  notificationId: string,
) {

  const current =
    await requireCurrentActor(actor);


  // Keep ownership enforcement in the write predicate. PostgreSQL can update
  // and return the matching row in one round trip, rather than selecting it
  // first and racing a second statement.
  const [notification] =
    await prisma.notification.updateManyAndReturn({

      where: {

        id: notificationId,

        recipientId:
          current.id,

      },

      data: {

        status:
          NotificationStatus.READ,

        readAt:
          new Date(),

      },

    });


  if (!notification) {

    throw new ResourceNotFoundError(
      "Notification introuvable.",
    );

  }


  return notification;

}



export async function markAllNotificationsAsRead(
  actor: UserContext,
) {

  const current =
    await requireCurrentActor(actor);


  return prisma.notification.updateMany({

    where: {

      recipientId:
        current.id,

      status: {
        not: NotificationStatus.READ,
      },

    },

    data: {

      status:
        NotificationStatus.READ,

      readAt:
        new Date(),

    },

  });

}
