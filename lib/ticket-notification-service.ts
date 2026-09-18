import { NotificationType, Prisma, RoleCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createInAppNotifications } from "@/lib/notifications";

export async function queueWorkerIds(db: Prisma.TransactionClient | typeof prisma, queueId: string): Promise<string[]> {
  const members = await db.teamMember.findMany({
    where: {
      isActive: true,
      team: { queueId, isActive: true },
      user: {
        status: "ACTIVE",
        administrativelyDisabled: false,
        OR: [{ authorizedQueueId: null }, { authorizedQueueId: queueId }],
        roleAssignments: { some: { role: { code: RoleCode.AGENT } } },
      },
    },
    select: { userId: true },
  });
  return [...new Set(members.map((member) => member.userId))];
}

export async function notifyQueueWorkers(
  db: Prisma.TransactionClient | typeof prisma,
  input: {
    queueId: string;
    managerId?: string | null;
    ticketId: string;
    type: NotificationType;
    title: string;
    body: string;
    excludeUserIds?: string[];
  },
) {
  const manager = input.managerId
    ? await db.user.findFirst({
        where: {
          id: input.managerId,
          status: "ACTIVE",
          administrativelyDisabled: false,
          OR: [{ authorizedQueueId: null }, { authorizedQueueId: input.queueId }],
          roleAssignments: {
            some: { role: { code: { in: [RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN] } } },
          },
        },
        select: { id: true },
      })
    : null;
  const recipients = new Set([
    manager?.id,
    ...(await queueWorkerIds(db, input.queueId)),
  ].filter(Boolean) as string[]);
  for (const recipientId of input.excludeUserIds ?? []) recipients.delete(recipientId);
  await createInAppNotifications(db, [...recipients].map((recipientId) => ({
    recipientId,
    ticketId: input.ticketId,
    type: input.type,
    title: input.title,
    body: input.body,
  })));
}
