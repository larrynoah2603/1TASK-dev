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


async function queueSupervisorIds(
  db: Prisma.TransactionClient | typeof prisma,
  queueId: string,
): Promise<string[]> {
  const queue = await db.queue.findUnique({
    where: { id: queueId },
    select: {
      departmentId: true,
      teams: { where: { isActive: true }, select: { id: true } },
    },
  });
  if (!queue) return [];

  const teamIds = queue.teams.map((team) => team.id);
  const supervisors = await db.user.findMany({
    where: {
      status: "ACTIVE",
      administrativelyDisabled: false,
      OR: [{ authorizedQueueId: null }, { authorizedQueueId: queueId }],
      roleAssignments: {
        some: {
          role: { code: { in: [RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN] } },
          OR: [
            { scopeId: null },
            { scope: { type: "GLOBAL" } },
            { scope: { type: "QUEUE", queueId } },
            { scope: { type: "DEPARTMENT", departmentId: queue.departmentId } },
            ...(teamIds.length ? [{ scope: { type: "TEAM" as const, teamId: { in: teamIds } } }] : []),
          ],
        },
      },
    },
    select: { id: true },
  });
  return supervisors.map((user) => user.id);
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
  const [workerIds, supervisorIds] = await Promise.all([
    queueWorkerIds(db, input.queueId),
    queueSupervisorIds(db, input.queueId),
  ]);
  const recipients = new Set([
    manager?.id,
    ...workerIds,
    ...supervisorIds,
  ].filter(Boolean) as string[]);
  for (const recipientId of input.excludeUserIds ?? []) recipients.delete(recipientId);
  const recipientIds = [...recipients];
  await createInAppNotifications(db, recipientIds.map((recipientId) => ({
    recipientId,
    ticketId: input.ticketId,
    type: input.type,
    title: input.title,
    body: input.body,
    deduplicationKey: `queue-notification:${input.type}:${input.ticketId}`,
  })));
  return recipientIds;
}
