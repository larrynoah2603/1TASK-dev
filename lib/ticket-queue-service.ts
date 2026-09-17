import { Priority, TicketStatus } from "@prisma/client";
import { canViewTicket } from "@/lib/access-control";
import { prisma } from "@/lib/db";
import { toAccessSubject, requireCurrentActor, type UserContext } from "@/lib/server-auth";
import { SLA_RISK_WINDOW_MINUTES } from "@/lib/sla";
import { visibleTicketWhere } from "@/lib/ticket-query-service";

export async function listVisibleQueues(
  actor: UserContext,
  options: { includePersonal?: boolean } = {},
) {
  actor = await requireCurrentActor(actor);
  const subject = toAccessSubject(actor);
  const queues = await prisma.queue.findMany({
    where: { isActive: true, department: { isActive: true } },
    include: {
      department: true,
      manager: { select: { id: true, name: true } },
      teams: { select: { id: true, isActive: true } },
      _count: { select: { tickets: true, teams: true } },
    },
    orderBy: { name: "asc" },
  });
  const personalQueueIds = options.includePersonal
    ? new Set(
        (
          await prisma.ticket.findMany({
            where: await visibleTicketWhere(actor),
            select: { queueId: true },
            distinct: ["queueId"],
          })
        ).map((ticket) => ticket.queueId),
      )
    : new Set<string>();
  const visibleQueues = queues.filter((queue) =>
    personalQueueIds.has(queue.id) ||
    canViewTicket(subject, {
      requesterId: "",
      assignedToId: null,
      queueId: queue.id,
      departmentId: queue.departmentId,
      confidential: false,
      teamIds: queue.teams.filter((team) => team.isActive).map((team) => team.id),
    }),
  );
  const visibleWhere = await visibleTicketWhere(actor, { workQueue: true });
  const visibleQueueIds = visibleQueues.map((queue) => queue.id);
  const riskDeadline = new Date(Date.now() + SLA_RISK_WINDOW_MINUTES * 60_000);
  const [ticketStats, slaStats] = visibleQueueIds.length
    ? await Promise.all([
      prisma.ticket.groupBy({
        by: ["queueId", "status", "priority"],
        where: { AND: [visibleWhere, { queueId: { in: visibleQueueIds } }] },
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ["queueId"],
        where: {
          AND: [
            visibleWhere,
            { queueId: { in: visibleQueueIds } },
            { status: { notIn: [TicketStatus.CLOSED, TicketStatus.BLOCKED] }, slaPausedAt: null },
            {
              OR: [
                { firstResponseDueAt: { not: null, lte: riskDeadline }, firstRespondedAt: null },
                {
                  resolutionDueAt: { not: null, lte: riskDeadline },
                  resolvedAt: null,
                  status: { not: TicketStatus.RESOLUTION_PENDING },
                },
              ],
            },
          ],
        },
        _count: { _all: true },
      }),
    ])
    : [[], []];
  const ticketStatsByQueue = new Map<string, typeof ticketStats>();
  for (const row of ticketStats) {
    const rows = ticketStatsByQueue.get(row.queueId) ?? [];
    rows.push(row);
    ticketStatsByQueue.set(row.queueId, rows);
  }
  const slaByQueue = new Map(slaStats.map((row) => [row.queueId, row._count._all]));

  return visibleQueues.map((queue) => {
    const queueStats = ticketStatsByQueue.get(queue.id) ?? [];
    const ticketCount = queueStats.reduce((sum, row) => sum + row._count._all, 0);
    const activeStats = queueStats.filter((row) => row.status !== TicketStatus.CLOSED);
    return {
      ...queue,
      _count: {
        ...queue._count,
        tickets: ticketCount,
      },
      operationalStats: {
        urgent: activeStats
          .filter((row) => row.priority === Priority.HIGH || row.priority === Priority.CRITICAL)
          .reduce((sum, row) => sum + row._count._all, 0),
        blocked: activeStats
          .filter((row) => row.status === TicketStatus.BLOCKED)
          .reduce((sum, row) => sum + row._count._all, 0),
        slaAtRisk: slaByQueue.get(queue.id) ?? 0,
      },
    };
  });
}

/** Queue metadata for ticket filters, without dashboard counters or SLA scans. */
export async function listVisibleQueueFilterOptions(actor: UserContext) {
  actor = await requireCurrentActor(actor);
  const subject = toAccessSubject(actor);
  const queues = await prisma.queue.findMany({
    where: { isActive: true, department: { isActive: true } },
    select: {
      id: true,
      name: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      teams: { select: { id: true, isActive: true } },
    },
    orderBy: { name: "asc" },
  });

  return queues
    .filter((queue) => canViewTicket(subject, {
      requesterId: "",
      assignedToId: null,
      queueId: queue.id,
      departmentId: queue.departmentId,
      confidential: false,
      teamIds: queue.teams.filter((team) => team.isActive).map((team) => team.id),
    }))
    .map(({ id, name, department }) => ({ id, name, department }));
}
