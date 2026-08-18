import { NotificationChannel, NotificationType, RoleCode, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { appendAuditLog } from "@/lib/audit";
import {
  requireAdminAccess,
  permissionCodes,
  type UserContext,
  AuthorizationError,
} from "@/lib/server-auth";
import {
  notificationRuleAdminSchema,
  type NotificationRuleAdminInput,
} from "@/lib/validation";

export class NotificationRuleError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "NotificationRuleError";
    this.statusCode = statusCode;
  }
}

async function requireNotificationAdmin(actor: UserContext) {
  if (actor.status !== UserStatus.ACTIVE) {
    throw new AuthorizationError("Votre compte n’est pas actif.");
  }
  const current = await requireAdminAccess("FUNCTIONAL");
  if (current.id !== actor.id) {
    throw new AuthorizationError("Le contexte administrateur est obsolète.");
  }
  if (!permissionCodes(current).includes("organization:manage")) {
    throw new AuthorizationError("La permission de gérer les notifications n’est pas accordée.");
  }
  return current;
}

export async function listNotificationRules(actor: UserContext) {
  await requireNotificationAdmin(actor);
  return prisma.notificationRule.findMany({
    include: {
      department: { select: { id: true, code: true, name: true } },
      queue: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ eventType: "asc" }, { name: "asc" }],
  });
}

export async function saveNotificationRule(
  actor: UserContext,
  id: string | undefined,
  input: NotificationRuleAdminInput,
) {
  const current = await requireNotificationAdmin(actor);
  const parsed = notificationRuleAdminSchema.parse(input);
  const existing = id
    ? await prisma.notificationRule.findUnique({ where: { id } })
    : null;
  if (id && !existing) throw new NotificationRuleError("Règle de notification introuvable.", 404);

  if (parsed.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: parsed.departmentId, isActive: true },
      select: { id: true },
    });
    if (!department) throw new NotificationRuleError("Le département ciblé doit être actif.", 422);
  }
  if (parsed.queueId) {
    const queue = await prisma.queue.findFirst({
      where: { id: parsed.queueId, isActive: true, department: { isActive: true } },
      select: { id: true },
    });
    if (!queue) throw new NotificationRuleError("La file ciblée doit être active.", 422);
  }

  return prisma.$transaction(async (tx) => {
    const rule = existing
      ? await tx.notificationRule.update({
          where: { id },
          data: {
            name: parsed.name,
            eventType: parsed.eventType,
            channel: parsed.channel,
            recipientRole: parsed.recipientRole,
            departmentId: parsed.departmentId ?? null,
            queueId: parsed.queueId ?? null,
            isActive: parsed.isActive,
          },
        })
      : await tx.notificationRule.create({
          data: {
            name: parsed.name,
            eventType: parsed.eventType,
            channel: parsed.channel,
            recipientRole: parsed.recipientRole,
            departmentId: parsed.departmentId ?? null,
            queueId: parsed.queueId ?? null,
            isActive: parsed.isActive,
          },
        });

    await appendAuditLog(tx, {
      actorId: current.id,
      action: existing ? "NOTIFICATION_RULE_UPDATED" : "NOTIFICATION_RULE_CREATED",
      objectType: "NotificationRule",
      objectId: rule.id,
      oldValue: existing
        ? {
            name: existing.name,
            eventType: existing.eventType,
            channel: existing.channel,
            recipientRole: existing.recipientRole,
            departmentId: existing.departmentId,
            queueId: existing.queueId,
            isActive: existing.isActive,
          }
        : null,
      newValue: {
        name: rule.name,
        eventType: rule.eventType,
        channel: rule.channel,
        recipientRole: rule.recipientRole,
        departmentId: rule.departmentId,
        queueId: rule.queueId,
        isActive: rule.isActive,
      },
      reason: parsed.reason,
    });
    return rule;
  });
}

export const notificationRuleOptions = {
  eventTypes: Object.values(NotificationType),
  channels: Object.values(NotificationChannel),
  recipientRoles: Object.values(RoleCode),
};
