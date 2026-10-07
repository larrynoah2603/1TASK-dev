import { Prisma, Priority, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AuthorizationError, hasPermission, requireCurrentActor, type UserContext } from "@/lib/server-auth";
import { visibleTicketWhere } from "@/lib/ticket-query-service";
import { cacheAside } from "@/lib/distributed-cache";

export async function getReportingSummary(actor: UserContext) {
  const current = await requireCurrentActor(actor);
  if (!hasPermission(current, "reporting:read")) {
    throw new AuthorizationError("Vous n’êtes pas habilité à consulter ces rapports.");
  }

  return cacheAside(`reporting:v1:${current.id}`, 45, () => getReportingSummaryUncached(current));
}

export type ReportingSummary = Awaited<ReturnType<typeof getReportingSummaryUncached>>;

async function getReportingSummaryUncached(current: UserContext) {
  const where = await visibleTicketWhere(current, { mode: "REPORTING" });
  const now = new Date();
  const activeSlaWhere: Prisma.TicketWhereInput = {
    status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED, TicketStatus.BLOCKED, TicketStatus.RESOLUTION_PENDING] },
    slaPausedAt: null,
  };
  const firstResponseBreachedWhere: Prisma.TicketWhereInput = {
    firstResponseDueAt: { not: null, lt: now },
    firstRespondedAt: null,
  };
  const resolutionBreachedWhere: Prisma.TicketWhereInput = {
    resolutionDueAt: { not: null, lt: now },
    resolvedAt: null,
  };

  const [
    overdue,
    firstResponseBreached,
    resolutionBreached,
    pendingConfirmationDue,
    pendingConfirmationOverdue,
    grouped,
    resolutionSamples,
  ] = await Promise.all([
    prisma.ticket.count({
      where: {
        AND: [
          where,
          activeSlaWhere,
          { OR: [firstResponseBreachedWhere, resolutionBreachedWhere] },
        ],
      },
    }),
    prisma.ticket.count({ where: { AND: [where, activeSlaWhere, firstResponseBreachedWhere] } }),
    prisma.ticket.count({ where: { AND: [where, activeSlaWhere, resolutionBreachedWhere] } }),
    prisma.ticket.count({
      where: {
        AND: [
          where,
          {
            status: TicketStatus.RESOLUTION_PENDING,
            autoClosureDueAt: { not: null, lte: new Date(now.getTime() + 60 * 60_000) },
          },
        ],
      },
    }),
    prisma.ticket.count({
      where: {
        AND: [
          where,
          { status: TicketStatus.RESOLUTION_PENDING, autoClosureDueAt: { not: null, lt: now } },
        ],
      },
    }),
    // A single grouped read feeds both status and priority distributions.
    prisma.ticket.groupBy({
      by: ["status", "priority"],
      where,
      _count: { _all: true },
    }),
    // Keep the reporting contract aggregation-only: group the two timestamps
    // instead of loading ticket records into memory.
    prisma.ticket.groupBy({
      by: ["createdAt", "resolvedAt"],
      where: { AND: [where, { resolvedAt: { not: null } }] },
      _count: { _all: true },
    }),
  ]);

  const total = grouped.reduce((sum, item) => sum + item._count._all, 0);
  const closed = grouped
    .filter((item) => item.status === TicketStatus.CLOSED)
    .reduce((sum, item) => sum + item._count._all, 0);
  const cancelled = grouped
    .filter((item) => item.status === TicketStatus.CANCELLED)
    .reduce((sum, item) => sum + item._count._all, 0);
  const completionDenominator = total - cancelled;

  const byStatus = Object.values(TicketStatus).map((status) => ({
    status,
    count: grouped
      .filter((item) => item.status === status)
      .reduce((sum, item) => sum + item._count._all, 0),
  }));
  const byPriority = Object.values(Priority).map((priority) => ({
    priority,
    count: grouped
      .filter((item) => item.priority === priority)
      .reduce((sum, item) => sum + item._count._all, 0),
  }));
  const criticalCount = byPriority.find((item) => item.priority === Priority.CRITICAL)?.count ?? 0;

  const resolutionMetrics = resolutionSamples.reduce(
    (metrics, sample) => {
      if (!sample.resolvedAt) return metrics;
      const duration = Math.max(0, sample.resolvedAt.getTime() - sample.createdAt.getTime());
      metrics.totalDurationMs += duration * sample._count._all;
      metrics.count += sample._count._all;
      return metrics;
    },
    { totalDurationMs: 0, count: 0 },
  );
  const averageResolutionMinutes = resolutionMetrics.count
    ? Math.round(resolutionMetrics.totalDurationMs / resolutionMetrics.count / 60_000)
    : null;

  const slaComplianceRate = completionDenominator
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(((completionDenominator - overdue) / completionDenominator) * 100),
        ),
      )
    : 0;

  return {
    total,
    closed,
    cancelled,
    completionDenominator,
    overdue,
    firstResponseBreached,
    resolutionBreached,
    pendingConfirmationDue,
    pendingConfirmationOverdue,
    closureRate: completionDenominator ? Math.round((closed / completionDenominator) * 100) : 0,
    slaComplianceRate,
    resolvedCount: resolutionMetrics.count,
    averageResolutionMinutes,
    criticalCount,
    byStatus,
    byPriority,
  };
}
