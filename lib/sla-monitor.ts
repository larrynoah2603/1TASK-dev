import {
  NotificationType,
  Prisma,
  RoleCode,
  ScopeType,
  TicketEventType,
  TicketStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { createInAppNotification } from "@/lib/notifications";
import { appendAuditLog } from "@/lib/audit";
import { slaProgressPercent } from "@/lib/sla";

type SlaMetric = "FIRST_RESPONSE" | "RESOLUTION";

function metadataMatches(
  metadata: Prisma.JsonValue | null,
  metric: SlaMetric,
  thresholdPercent: number,
): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const record = metadata as { metric?: unknown; thresholdPercent?: unknown };
  return record.metric === metric && record.thresholdPercent === thresholdPercent;
}

async function queueWorkerIds(tx: Prisma.TransactionClient, queueId: string): Promise<string[]> {
  const members = await tx.teamMember.findMany({
    where: {
      isActive: true,
      team: { queueId, isActive: true },
      user: { status: "ACTIVE", roleAssignments: { some: { role: { code: RoleCode.AGENT } } } },
    },
    select: { userId: true },
  });
  return [...new Set(members.map((member) => member.userId))];
}

async function escalationRecipients(
  tx: Prisma.TransactionClient,
  input: {
    queueId: string;
    departmentId: string;
    teamIds: string[];
    assignedToId: string | null;
    managerId: string | null;
    rules: { thresholdPercent: number; targetRole: RoleCode; isActive: boolean }[];
    thresholdPercent: number;
  },
): Promise<string[]> {
  const base = new Set(
    [input.managerId, input.assignedToId].filter(Boolean) as string[],
  );
  const workerIds = await queueWorkerIds(tx, input.queueId);
  if (!input.assignedToId) {
    for (const userId of workerIds) base.add(userId);
  }
  const rules = input.rules.filter(
    (rule) => rule.isActive && rule.thresholdPercent === input.thresholdPercent,
  );
  if (!rules.length) return [...base];

  for (const rule of rules) {
    if (rule.targetRole === RoleCode.QUEUE_MANAGER && input.managerId) {
      base.add(input.managerId);
      continue;
    }
    if (rule.targetRole === RoleCode.AGENT) {
      for (const userId of workerIds) base.add(userId);
      continue;
    }

    const assignments = await tx.userRole.findMany({
      where: { role: { code: rule.targetRole }, user: { status: "ACTIVE" } },
      include: {
        user: { select: { id: true } },
        scope: {
          include: {
            members: { select: { userId: true } },
            team: { select: { id: true, queueId: true, isActive: true } },
          },
        },
      },
    });
    for (const assignment of assignments) {
      const scope = assignment.scope;
      const matches =
        !scope ||
        scope.type === ScopeType.GLOBAL ||
        (scope.type === ScopeType.DEPARTMENT && scope.departmentId === input.departmentId) ||
        (scope.type === ScopeType.QUEUE && scope.queueId === input.queueId) ||
        (scope.type === ScopeType.TEAM &&
          scope.teamId &&
          input.teamIds.includes(scope.teamId) &&
          scope.team?.isActive) ||
        (scope.type === ScopeType.USER_LIST &&
          scope.members.some((member) => member.userId === assignment.user.id));
      if (matches) base.add(assignment.user.id);
    }
  }
  return [...base];
}

async function emitSlaEvent(input: {
  ticketId: string;
  queueId: string;
  departmentId: string;
  teamIds: string[];
  managerId: string | null;
  assignedToId: string | null;
  reference: string;
  metric: SlaMetric;
  thresholdPercent: number;
  progressPercent: number;
  rules: { thresholdPercent: number; targetRole: RoleCode; isActive: boolean }[];
}): Promise<boolean> {
  const eventType = input.thresholdPercent >= 100
    ? TicketEventType.SLA_BREACH
    : TicketEventType.SLA_ALERT;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.ticketEvent.findMany({
          where: { ticketId: input.ticketId, eventType },
          select: { metadata: true },
        });
        if (
          existing.some((event) =>
            metadataMatches(event.metadata, input.metric, input.thresholdPercent),
          )
        ) {
          return false;
        }

        const recipients = await escalationRecipients(tx, {
          queueId: input.queueId,
          departmentId: input.departmentId,
          teamIds: input.teamIds,
          assignedToId: input.assignedToId,
          managerId: input.managerId,
          rules: input.rules,
          thresholdPercent: input.thresholdPercent,
        });
        await tx.ticketEvent.create({
          data: {
            ticketId: input.ticketId,
            queueId: input.queueId,
            eventType,
            metadata: {
              metric: input.metric,
              thresholdPercent: input.thresholdPercent,
              progressPercent: input.progressPercent,
            },
          },
        });
        await appendAuditLog(tx, {
          action: eventType,
          objectType: "Ticket",
          objectId: input.ticketId,
          newValue: {
            metric: input.metric,
            thresholdPercent: input.thresholdPercent,
            progressPercent: input.progressPercent,
          },
          reason: "Surveillance SLA",
        });
        for (const recipientId of recipients) {
          await createInAppNotification(tx, {
            recipientId,
            ticketId: input.ticketId,
            type: input.thresholdPercent >= 100
              ? NotificationType.SLA_BREACH
              : NotificationType.SLA_ALERT,
            title: input.thresholdPercent >= 100
              ? `SLA dépassé — ${input.metric === "FIRST_RESPONSE" ? "première réponse" : "résolution"}`
              : `Alerte SLA à ${input.thresholdPercent} %`,
            body: `${input.reference} a atteint ${Math.round(input.progressPercent)} % de son délai de ${input.metric === "FIRST_RESPONSE" ? "première réponse" : "résolution"}.`,
          });
        }
        return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      // PostgreSQL can abort one of two concurrent serializable monitors. The
      // second attempt rechecks the event before creating a duplicate alert.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt === 0) {
        continue;
      }
      throw error;
    }
  }
  return false;
}

export async function runSlaMonitor(now = new Date()) {
  const batchSize = 500;
  let cursor: string | undefined;
  let scanned = 0;
  let alerts = 0;
  let breaches = 0;

  do {
    const tickets = await prisma.ticket.findMany({
      where: {
        status: { notIn: [TicketStatus.CLOSED, TicketStatus.BLOCKED, TicketStatus.RESOLUTION_PENDING] },
        slaPausedAt: null,
        OR: [
          { firstResponseDueAt: { not: null }, firstRespondedAt: null },
          { resolutionDueAt: { not: null }, resolvedAt: null },
        ],
      },
      include: {
        queue: {
          select: {
            id: true,
            name: true,
            managerId: true,
            departmentId: true,
            teams: { select: { id: true, isActive: true } },
            escalationRules: {
              where: { isActive: true },
              select: { thresholdPercent: true, targetRole: true, isActive: true },
            },
          },
        },
        serviceCatalogItem: {
          select: {
            escalationRules: {
              where: { isActive: true },
              select: { thresholdPercent: true, targetRole: true, isActive: true },
            },
          },
        },
        sla: { select: { alertThresholds: true } },
        assignedTo: { select: { id: true } },
      },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    scanned += tickets.length;

    for (const ticket of tickets) {

      const pausedMinutes = ticket.totalPausedMinutes;
      const metrics: { metric: SlaMetric; dueAt: Date; start: Date }[] = [];
      if (ticket.firstResponseDueAt && !ticket.firstRespondedAt) {
        metrics.push({ metric: "FIRST_RESPONSE", dueAt: ticket.firstResponseDueAt, start: ticket.createdAt });
      }
      if (ticket.resolutionDueAt && !ticket.resolvedAt) {
        metrics.push({ metric: "RESOLUTION", dueAt: ticket.resolutionDueAt, start: ticket.createdAt });
      }
      const rules = [
        ...ticket.queue.escalationRules,
        ...ticket.serviceCatalogItem.escalationRules,
      ];
      const thresholds = [...new Set(ticket.sla?.alertThresholds ?? [50, 80, 100])]
        .sort((left, right) => left - right);
      for (const metric of metrics) {
        const progress = slaProgressPercent(now, metric.start, metric.dueAt, pausedMinutes);
        for (const threshold of thresholds.filter((value) => progress >= value)) {
          const created = await emitSlaEvent({
            ticketId: ticket.id,
            queueId: ticket.queue.id,
            departmentId: ticket.queue.departmentId,
            teamIds: ticket.queue.teams.filter((team) => team.isActive).map((team) => team.id),
            managerId: ticket.queue.managerId,
            assignedToId: ticket.assignedTo?.id ?? null,
            reference: ticket.reference,
            metric: metric.metric,
            thresholdPercent: threshold,
            progressPercent: progress,
            rules,
          });
          if (!created) continue;
          if (threshold >= 100) breaches += 1;
          else alerts += 1;
        }
      }
    }
    cursor = tickets.at(-1)?.id;
    if (tickets.length < batchSize) break;
  } while (cursor);

  return { scanned, alerts, breaches };
}
