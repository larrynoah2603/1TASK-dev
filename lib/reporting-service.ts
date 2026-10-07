import { createHash } from "node:crypto";
import { Prisma, Priority, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AuthorizationError, hasPermission, requireCurrentActor, type UserContext } from "@/lib/server-auth";
import { visibleTicketWhere } from "@/lib/ticket-query-service";
import { cacheAside } from "@/lib/distributed-cache";

function reportingScopeFingerprint(current: UserContext) {
  const payload = {
    departmentId: current.departmentId ?? null,
    authorizedQueueId: current.authorizedQueueId ?? null,
    roles: current.roleAssignments.map((assignment) => ({
      code: assignment.role.code,
      scope: assignment.scope ? {
        type: assignment.scope.type,
        departmentId: assignment.scope.departmentId ?? null,
        queueId: assignment.scope.queueId ?? null,
        teamId: assignment.scope.teamId ?? null,
        portfolioKey: assignment.scope.portfolioKey ?? null,
        members: assignment.scope.members.map((member) => member.userId).sort(),
      } : null,
    })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    teams: current.teamMemberships
      .filter((membership) => membership.isActive && membership.team.isActive)
      .map((membership) => ({ id: membership.team.id, queueId: membership.team.queueId }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    managedQueueIds: current.managedQueues.map((queue) => queue.id).sort(),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 24);
}

export async function getReportingSummary(actor: UserContext) {
  const current = await requireCurrentActor(actor);
  if (!hasPermission(current, "reporting:read")) {
    throw new AuthorizationError("Vous n’êtes pas habilité à consulter ces rapports.");
  }

  const scopeFingerprint = reportingScopeFingerprint(current);
  return cacheAside(`reporting:v2:${current.id}:${scopeFingerprint}`, 45, () => getReportingSummaryUncached(current));
}

export type ReportingSummary = Awaited<ReturnType<typeof getReportingSummaryUncached>>;

async function getReportingSummaryUncached(current: UserContext) {
  const where = await visibleTicketWhere(current, { mode: "REPORTING" });
  const now = new Date();
  const activeSlaWhere: Prisma.TicketWhereInput = {
    status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED, TicketStatus.BLOCKED, TicketStatus.RESOLUTION_PENDING] },
    slaPausedAt: null,
  };
  const trackedActiveSlaWhere: Prisma.TicketWhereInput = {
    ...activeSlaWhere,
    OR: [
      { firstResponseDueAt: { not: null }, firstRespondedAt: null },
      { resolutionDueAt: { not: null }, resolvedAt: null },
    ],
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
    slaTracked,
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
    prisma.ticket.count({ where: { AND: [where, trackedActiveSlaWhere] } }),
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

  const slaComplianceRate = slaTracked
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(((slaTracked - overdue) / slaTracked) * 100),
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
    slaTracked,
    closureRate: completionDenominator ? Math.round((closed / completionDenominator) * 100) : 0,
    slaComplianceRate,
    resolvedCount: resolutionMetrics.count,
    averageResolutionMinutes,
    criticalCount,
    byStatus,
    byPriority,
  };
}
