import {
  NotificationType,
  Prisma,
  RoleCode,
  ScopeType,
  TicketEventType,
  TicketStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { readServerEnvironment } from "@/lib/env";
import { slaProgressPercent } from "@/lib/sla";

type SlaMetric = "FIRST_RESPONSE" | "RESOLUTION";

export function makeSlaEventKey(
  ticketId: string,
  eventType: TicketEventType,
  metric: SlaMetric,
  thresholdPercent: number,
): string {
  return `sla:${ticketId}:${eventType}:${metric}:${thresholdPercent}`;
}

type SlaAlert = {
  ticketId: string;
  queueId: string;
  departmentId: string;
  teamIds: string[];
  managerId: string | null;
  assignedToId: string | null;
  confidential: boolean;
  authorizedUserIds: string[];
  reference: string;
  metric: SlaMetric;
  thresholdPercent: number;
  progressPercent: number;
  rules: { thresholdPercent: number; targetRole: RoleCode; isActive: boolean }[];
};

function metadataMatches(metadata: Prisma.JsonValue | null, alert: SlaAlert): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const value = metadata as { metric?: unknown; thresholdPercent?: unknown };
  return value.metric === alert.metric && value.thresholdPercent === alert.thresholdPercent;
}

async function processSlaAlertBatch(alerts: SlaAlert[]) {
  if (!alerts.length) return { alerts: 0, breaches: 0 };
  const keyed = alerts.map((alert) => ({
    ...alert,
    eventType: alert.thresholdPercent >= 100 ? TicketEventType.SLA_BREACH : TicketEventType.SLA_ALERT,
  })).map((alert) => ({ ...alert, eventKey: makeSlaEventKey(alert.ticketId, alert.eventType, alert.metric, alert.thresholdPercent) }));
  const queueIds = [...new Set(keyed.map((alert) => alert.queueId))];
  const ticketIds = [...new Set(keyed.map((alert) => alert.ticketId))];
  const roleCodes = [...new Set(keyed.flatMap((alert) => alert.rules.map((rule) => rule.targetRole)))];
  const [existingEvents, members, assignments] = await Promise.all([
    prisma.ticketEvent.findMany({
      where: { ticketId: { in: ticketIds }, eventType: { in: [TicketEventType.SLA_ALERT, TicketEventType.SLA_BREACH] } },
      select: { eventKey: true, ticketId: true, eventType: true, metadata: true },
    }),
    prisma.teamMember.findMany({
      where: { isActive: true, team: { queueId: { in: queueIds }, isActive: true }, user: { status: "ACTIVE", roleAssignments: { some: { role: { code: RoleCode.AGENT } } } } },
      select: { userId: true, team: { select: { queueId: true } } },
    }),
    prisma.userRole.findMany({
      where: { role: { code: { in: roleCodes } }, user: { status: "ACTIVE" } },
      select: { user: { select: { id: true } }, role: { select: { code: true } }, scope: { select: { type: true, departmentId: true, queueId: true, teamId: true, members: { select: { userId: true } }, team: { select: { isActive: true } } } } },
    }),
  ]);
  const existingKeys = new Set(existingEvents.flatMap((event) => event.eventKey ? [event.eventKey] : []));
  const pending = keyed.filter((alert) => !existingKeys.has(alert.eventKey) && !existingEvents.some((event) => event.ticketId === alert.ticketId && event.eventType === alert.eventType && metadataMatches(event.metadata, alert)));
  if (!pending.length) return { alerts: 0, breaches: 0 };
  const workersByQueue = new Map<string, Set<string>>();
  for (const member of members) {
    const recipients = workersByQueue.get(member.team.queueId) ?? new Set<string>();
    recipients.add(member.userId);
    workersByQueue.set(member.team.queueId, recipients);
  }
  const recipientsByKey = new Map<string, string[]>();
  for (const alert of pending) {
    const workers = workersByQueue.get(alert.queueId) ?? new Set<string>();
    const recipients = new Set([alert.managerId, alert.assignedToId].filter(Boolean) as string[]);
    if (!alert.assignedToId) workers.forEach((id) => recipients.add(id));
    for (const rule of alert.rules.filter((rule) => rule.isActive && rule.thresholdPercent === alert.thresholdPercent)) {
      if (rule.targetRole === RoleCode.QUEUE_MANAGER && alert.managerId) recipients.add(alert.managerId);
      else if (rule.targetRole === RoleCode.AGENT) workers.forEach((id) => recipients.add(id));
      else for (const assignment of assignments.filter((item) => item.role.code === rule.targetRole)) {
        const scope = assignment.scope;
        if (!scope || scope.type === ScopeType.GLOBAL ||
          (scope.type === ScopeType.DEPARTMENT && scope.departmentId === alert.departmentId) ||
          (scope.type === ScopeType.QUEUE && scope.queueId === alert.queueId) ||
          (scope.type === ScopeType.TEAM && !!scope.teamId && alert.teamIds.includes(scope.teamId) && scope.team?.isActive) ||
          (scope.type === ScopeType.USER_LIST && scope.members.some((member) => member.userId === assignment.user.id))) recipients.add(assignment.user.id);
      }
    }
    recipientsByKey.set(alert.eventKey, alert.confidential
      ? [...recipients].filter((id) => alert.authorizedUserIds.includes(id))
      : [...recipients]);
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const inserted = await tx.ticketEvent.createManyAndReturn({
          data: pending.map((alert) => ({ eventKey: alert.eventKey, ticketId: alert.ticketId, queueId: alert.queueId, eventType: alert.eventType, metadata: { metric: alert.metric, thresholdPercent: alert.thresholdPercent, progressPercent: alert.progressPercent } })),
          skipDuplicates: true,
          select: { eventKey: true },
        });
        const insertedKeys = new Set(inserted.flatMap((event) => event.eventKey ? [event.eventKey] : []));
        const acquired = pending.filter((alert) => insertedKeys.has(alert.eventKey));
        if (acquired.length) await tx.auditLog.createMany({ data: acquired.map((alert) => ({ action: alert.eventType, objectType: "Ticket", objectId: alert.ticketId, newValue: { metric: alert.metric, thresholdPercent: alert.thresholdPercent, progressPercent: alert.progressPercent }, reason: "Surveillance SLA" })) });
        const notifications = acquired.flatMap((alert) => {
          const breached = alert.thresholdPercent >= 100;
          return (recipientsByKey.get(alert.eventKey) ?? []).map((recipientId) => ({
            recipientId,
            ticketId: alert.ticketId,
            type: breached ? NotificationType.SLA_BREACHED : NotificationType.SLA_WARNING,
            severity: breached ? "CRITICAL" as const : "WARNING" as const,
            title: breached ? `SLA dépassé — ${alert.metric === "FIRST_RESPONSE" ? "première réponse" : "résolution"}` : `Alerte SLA à ${alert.thresholdPercent} %`,
            body: `${alert.reference} a atteint ${Math.round(alert.progressPercent)} % de son délai de ${alert.metric === "FIRST_RESPONSE" ? "première réponse" : "résolution"}.`,
            entityType: "TICKET",
            entityId: alert.ticketId,
            actionUrl: `/tickets/${alert.ticketId}`,
            deduplicationKey: `SLA_${breached ? "BREACHED" : "WARNING"}:${alert.ticketId}:${alert.metric}:${alert.thresholdPercent}`,
          }));
        });
        if (notifications.length) await tx.notification.createMany({ data: notifications, skipDuplicates: true });
        return { alerts: acquired.filter((alert) => alert.thresholdPercent < 100).length, breaches: acquired.filter((alert) => alert.thresholdPercent >= 100).length };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt === 0) continue;
      throw error;
    }
  }
  return { alerts: 0, breaches: 0 };
}

export async function runSlaMonitor(now = new Date()) {
  const batchSize = readServerEnvironment().SLA_MONITOR_BATCH_SIZE;
  let cursor: string | undefined;
  let scanned = 0;
  let alerts = 0;
  let breaches = 0;

  do {
    const tickets = await prisma.ticket.findMany({
      where: {
        status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED, TicketStatus.BLOCKED, TicketStatus.RESOLUTION_PENDING] },
        slaPausedAt: null,
        OR: [
          { firstResponseDueAt: { not: null }, firstRespondedAt: null },
          { resolutionDueAt: { not: null }, resolvedAt: null },
        ],
      },
      select: {
        id: true,
        reference: true,
        createdAt: true,
        firstResponseDueAt: true,
        firstRespondedAt: true,
        resolutionDueAt: true,
        resolvedAt: true,
        totalPausedMinutes: true,
        assignedToId: true,
        confidential: true,
        accessList: {
          where: {
            OR: [
              { delegationId: null },
              { delegation: { startsAt: { lte: now }, revokedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] } },
            ],
          },
          select: { userId: true },
        },
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
      },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    scanned += tickets.length;

    const pendingAlerts: SlaAlert[] = [];
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
          pendingAlerts.push({
            ticketId: ticket.id,
            queueId: ticket.queue.id,
            departmentId: ticket.queue.departmentId,
            teamIds: ticket.queue.teams.filter((team) => team.isActive).map((team) => team.id),
            managerId: ticket.queue.managerId,
            assignedToId: ticket.assignedToId,
            confidential: ticket.confidential,
            authorizedUserIds: ticket.accessList.map((grant) => grant.userId),
            reference: ticket.reference,
            metric: metric.metric,
            thresholdPercent: threshold,
            progressPercent: progress,
            rules,
          });
        }
      }
    }
    const emitted = await processSlaAlertBatch(pendingAlerts);
    alerts += emitted.alerts;
    breaches += emitted.breaches;
    cursor = tickets.at(-1)?.id;
    if (tickets.length < batchSize) break;
  } while (cursor);

  return { scanned, alerts, breaches };
}
