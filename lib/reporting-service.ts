import { Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AuthorizationError, hasPermission, requireCurrentActor, type UserContext } from "@/lib/server-auth";
import { visibleTicketWhere } from "@/lib/ticket-service";

export async function getReportingSummary(actor: UserContext) {
  const current = await requireCurrentActor(actor);
  if (!hasPermission(current, "reporting:read")) {
    throw new AuthorizationError("Vous n’êtes pas habilité à consulter ces rapports.");
  }

  const where = await visibleTicketWhere(current, { mode: "REPORTING" });
  const now = new Date();
  const activeSlaWhere: Prisma.TicketWhereInput = {
    status: { notIn: [TicketStatus.CLOSED, TicketStatus.BLOCKED, TicketStatus.RESOLUTION_PENDING] },
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
  const [total, closed, overdue, firstResponseBreached, resolutionBreached, grouped] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { AND: [where, { status: TicketStatus.CLOSED }] } }),
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
    prisma.ticket.groupBy({ by: ["status"], where, _count: { _all: true } }),
  ]);
  const byStatus = Object.values(TicketStatus).map((status) => ({
    status,
    count: grouped.find((item) => item.status === status)?._count._all ?? 0,
  }));
  return {
    total,
    closed,
    overdue,
    firstResponseBreached,
    resolutionBreached,
    closureRate: total ? Math.round((closed / total) * 100) : 0,
    byStatus,
  };
}
