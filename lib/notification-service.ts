import { NotificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
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



export async function countUnreadNotifications(
  actor: UserContext,
) {

  const current =
    await requireCurrentActor(actor);


  return prisma.notification.count({

    where: {

      recipientId:
        current.id,

      status: {
        not: NotificationStatus.READ,
      },

    },

  });

}



export async function markNotificationAsRead(
  actor: UserContext,
  notificationId: string,
) {

  const current =
    await requireCurrentActor(actor);


  const notification =
    await prisma.notification.findFirst({

      where: {

        id: notificationId,

        recipientId:
          current.id,

      },

    });


  if (!notification) {

    throw new ResourceNotFoundError(
      "Notification introuvable.",
    );

  }


  return prisma.notification.update({

    where: {

      id:
        notification.id,

    },

    data: {

      status:
        NotificationStatus.READ,

      readAt:
        new Date(),

    },

  });

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

      readAt:
        null,

    },

    data: {

      status:
        NotificationStatus.READ,

      readAt:
        new Date(),

    },

  });

}
