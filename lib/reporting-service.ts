import { RoleCode, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AuthorizationError, requireCurrentActor, type UserContext } from "@/lib/server-auth";
import { visibleTicketWhere } from "@/lib/ticket-service";

export async function getReportingSummary(actor: UserContext) {
  const current = await requireCurrentActor(actor);
  const reportingRoleCodes: RoleCode[] = [
    RoleCode.REPORTING_READER,
    RoleCode.QUEUE_MANAGER,
    RoleCode.FUNCTIONAL_ADMIN,
  ];
  const hasReportingRole = current.roleAssignments.some((assignment) =>
    reportingRoleCodes.includes(assignment.role.code),
  );
  if (!hasReportingRole) throw new AuthorizationError("Vous n’êtes pas habilité à consulter ces rapports.");

  const where = await visibleTicketWhere(current, { mode: "REPORTING" });
  const now = new Date();
  const [total, closed, overdue, grouped] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { AND: [where, { status: TicketStatus.CLOSED }] } }),
    prisma.ticket.count({
      where: {
        AND: [
          where,
          { status: { not: TicketStatus.CLOSED } },
          { resolutionDueAt: { not: null, lt: now } },
        ],
      },
    }),
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
    closureRate: total ? Math.round((closed / total) * 100) : 0,
    byStatus,
  };
}
