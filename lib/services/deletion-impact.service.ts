import { prisma } from "@/lib/db";

export const deletionEntityTypes = ["USER", "DEPARTMENT", "QUEUE", "TEAM", "CATALOG_ITEM"] as const;
export type DeletionEntityType = (typeof deletionEntityTypes)[number];
export type DeletionSeverity = "INFO" | "WARNING" | "BLOCKING";
export type DeletionResolution = "DETACH" | "DISABLE" | "REASSIGN" | "HISTORY_PROTECTED";
export type DeletionBlocker = { type: string; label: string; count: number; severity: DeletionSeverity; resolution: DeletionResolution; adminPath: string; protectedHistory: boolean };
export type DeletionImpact = { entityType: DeletionEntityType; entityId: string; entityName: string; canDelete: boolean; totalBlockers: number; blockers: DeletionBlocker[] };

type BlockerInput = Omit<DeletionBlocker, "count"> & { count: Promise<number> };
const blocker = (input: BlockerInput) => input;

async function resolve(entityType: DeletionEntityType, entityId: string, entityName: string, inputs: BlockerInput[]): Promise<DeletionImpact> {
  const counts = await Promise.all(inputs.map((item) => item.count));
  const blockers = inputs.map(({ count: _count, ...item }, index) => ({ ...item, count: counts[index] })).filter((item) => item.count > 0);
  return { entityType, entityId, entityName, canDelete: blockers.length === 0, totalBlockers: blockers.reduce((sum, item) => sum + item.count, 0), blockers };
}

export async function getDeletionImpact(input: { entityType: DeletionEntityType; entityId: string }): Promise<DeletionImpact | null> {
  const id = input.entityId;
  if (input.entityType === "DEPARTMENT") {
    const entity = await prisma.department.findUnique({ where: { id }, select: { name: true } });
    if (!entity) return null;
    return resolve(input.entityType, id, entity.name, [
      blocker({ type: "USER", label: "Utilisateurs", count: prisma.user.count({ where: { departmentId: id } }), severity: "BLOCKING", resolution: "REASSIGN", adminPath: `/admin/users?departmentId=${id}`, protectedHistory: false }),
      blocker({ type: "QUEUE", label: "Files", count: prisma.queue.count({ where: { departmentId: id } }), severity: "BLOCKING", resolution: "DETACH", adminPath: `/admin/queues?departmentId=${id}`, protectedHistory: false }),
      blocker({ type: "TICKET", label: "Tickets source", count: prisma.ticket.count({ where: { sourceDepartmentId: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/tickets?departmentId=${id}`, protectedHistory: true }),
      blocker({ type: "ENTRA_MAPPING", label: "Correspondances Entra", count: prisma.entraDepartmentMapping.count({ where: { departmentId: id } }), severity: "BLOCKING", resolution: "DETACH", adminPath: `/admin/departments?departmentId=${id}#entra-mappings`, protectedHistory: false }),
      blocker({ type: "PERMISSION_SCOPE", label: "Périmètres d’autorisation", count: prisma.permissionScope.count({ where: { departmentId: id } }), severity: "BLOCKING", resolution: "DETACH", adminPath: `/admin/dependencies/department/${id}`, protectedHistory: false }),
      blocker({ type: "NOTIFICATION_RULE", label: "Règles de notification", count: prisma.notificationRule.count({ where: { departmentId: id } }), severity: "BLOCKING", resolution: "DETACH", adminPath: `/admin/notifications?departmentId=${id}`, protectedHistory: false }),
      blocker({ type: "MISSION", label: "Missions", count: prisma.mission.count({ where: { departmentId: id } }), severity: "BLOCKING", resolution: "REASSIGN", adminPath: `/missions?departmentId=${id}`, protectedHistory: false }),
      blocker({ type: "ASSET", label: "Actifs", count: prisma.asset.count({ where: { departmentId: id } }), severity: "BLOCKING", resolution: "REASSIGN", adminPath: `/assets?departmentId=${id}`, protectedHistory: false }),
      blocker({ type: "ASSET_HISTORY", label: "Historique des mouvements d’actifs", count: prisma.assetMovement.count({ where: { OR: [{ fromDepartmentId: id }, { toDepartmentId: id }] } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/assets?departmentId=${id}`, protectedHistory: true }),
      blocker({ type: "KNOWLEDGE", label: "Articles de connaissance", count: prisma.knowledgeArticle.count({ where: { departmentId: id } }), severity: "BLOCKING", resolution: "REASSIGN", adminPath: `/knowledge?departmentId=${id}`, protectedHistory: false }),
      blocker({ type: "V1_GLOBAL_TRIAGE", label: "Destination globale TRIAGE V1", count: prisma.v1Configuration.count({ where: { globalTriageService: { queue: { departmentId: id } } } }), severity: "BLOCKING", resolution: "REASSIGN", adminPath: "/admin/sla#v1-triage", protectedHistory: false }),
    ]);
  }
  if (input.entityType === "QUEUE") {
    const entity = await prisma.queue.findUnique({ where: { id }, select: { name: true } }); if (!entity) return null;
    return resolve(input.entityType, id, entity.name, [
      blocker({ type: "TICKET", label: "Tickets historiques", count: prisma.ticket.count({ where: { queueId: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/tickets?queueId=${id}`, protectedHistory: true }),
      blocker({ type: "CATALOG_ITEM", label: "Services catalogue", count: prisma.serviceCatalogItem.count({ where: { queueId: id } }), severity: "BLOCKING", resolution: "REASSIGN", adminPath: `/admin/catalog?queueId=${id}`, protectedHistory: false }),
      blocker({ type: "TEAM", label: "Équipes", count: prisma.team.count({ where: { queueId: id } }), severity: "BLOCKING", resolution: "REASSIGN", adminPath: `/admin/teams?queueId=${id}`, protectedHistory: false }),
      blocker({ type: "ASSIGNMENT_HISTORY", label: "Historique des affectations", count: prisma.ticketAssignment.count({ where: { queueId: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/queue/${id}`, protectedHistory: true }),
      blocker({ type: "EVENT_HISTORY", label: "Historique des événements", count: prisma.ticketEvent.count({ where: { queueId: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/queue/${id}`, protectedHistory: true }),
      blocker({ type: "V1_GLOBAL_TRIAGE", label: "Destination globale TRIAGE V1", count: prisma.v1Configuration.count({ where: { globalTriageService: { queueId: id } } }), severity: "BLOCKING", resolution: "REASSIGN", adminPath: "/admin/sla#v1-triage", protectedHistory: false }),
      blocker({ type: "PROVISIONED_TRIAGE", label: "File TRIAGE interne gérée", count: prisma.queue.count({ where: { id, provisionedTriageDepartmentId: { not: null } } }), severity: "BLOCKING", resolution: "DISABLE", adminPath: "/admin/departments", protectedHistory: false }),
    ]);
  }
  if (input.entityType === "CATALOG_ITEM") {
    const entity = await prisma.serviceCatalogItem.findUnique({ where: { id }, select: { name: true } }); if (!entity) return null;
    return resolve(input.entityType, id, entity.name, [
      blocker({ type: "TICKET", label: "Tickets historiques", count: prisma.ticket.count({ where: { serviceCatalogItemId: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/tickets?serviceCatalogItemId=${id}`, protectedHistory: true }),
      blocker({ type: "V1_GLOBAL_TRIAGE", label: "Destination globale TRIAGE V1", count: prisma.v1Configuration.count({ where: { globalTriageServiceId: id } }), severity: "BLOCKING", resolution: "REASSIGN", adminPath: "/admin/sla#v1-triage", protectedHistory: false }),
      blocker({ type: "PROVISIONED_TRIAGE", label: "Service TRIAGE interne géré", count: prisma.serviceCatalogItem.count({ where: { id, provisionedTriageDepartmentId: { not: null } } }), severity: "BLOCKING", resolution: "DISABLE", adminPath: "/admin/departments", protectedHistory: false }),
    ]);
  }
  if (input.entityType === "TEAM") {
    const entity = await prisma.team.findUnique({ where: { id }, select: { name: true } }); if (!entity) return null;
    return resolve(input.entityType, id, entity.name, []);
  }
  const entity = await prisma.user.findUnique({ where: { id }, select: { name: true } }); if (!entity) return null;
  return resolve(input.entityType, id, entity.name, [
    blocker({ type: "TICKET", label: "Tickets", count: prisma.ticket.count({ where: { OR: [{ requesterId: id }, { createdById: id }, { assignedToId: id }] } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/tickets?userId=${id}`, protectedHistory: true }),
    blocker({ type: "MESSAGE", label: "Messages", count: prisma.ticketMessage.count({ where: { authorId: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/user/${id}`, protectedHistory: true }),
    blocker({ type: "EVENT", label: "Événements", count: prisma.ticketEvent.count({ where: { actorId: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/user/${id}`, protectedHistory: true }),
    blocker({ type: "AUDIT", label: "Journaux d’audit", count: prisma.auditLog.count({ where: { actorId: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/audit?actorId=${id}`, protectedHistory: true }),
    blocker({ type: "ASSIGNMENT", label: "Affectations", count: prisma.ticketAssignment.count({ where: { OR: [{ assignedById: id }, { previousAssigneeId: id }, { newAssigneeId: id }] } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/user/${id}`, protectedHistory: true }),
    blocker({ type: "WORKLOG", label: "Temps saisis", count: prisma.worklog.count({ where: { userId: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/user/${id}`, protectedHistory: true }),
    blocker({ type: "ASSET_HISTORY", label: "Historique des actifs", count: prisma.assetMovement.count({ where: { OR: [{ createdById: id }, { fromUserId: id }, { toUserId: id }] } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/user/${id}`, protectedHistory: true }),
    blocker({ type: "ASSET_REQUEST", label: "Demandes d’actifs", count: prisma.assetRequest.count({ where: { OR: [{ requesterId: id }, { approvedById: id }] } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/asset-requests?userId=${id}`, protectedHistory: true }),
    blocker({ type: "ATTACHMENT", label: "Pièces jointes", count: prisma.attachment.count({ where: { uploadedById: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/user/${id}`, protectedHistory: true }),
    blocker({ type: "KNOWLEDGE", label: "Articles", count: prisma.knowledgeArticle.count({ where: { ownerId: id } }), severity: "BLOCKING", resolution: "REASSIGN", adminPath: `/knowledge?ownerId=${id}`, protectedHistory: false }),
    blocker({ type: "SLA_HISTORY", label: "Dérogations SLA", count: prisma.slaException.count({ where: { createdById: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/user/${id}`, protectedHistory: true }),
    blocker({ type: "PROFILE_HISTORY", label: "Historique du profil", count: prisma.userProfileChange.count({ where: { OR: [{ userId: id }, { actorId: id }] } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/user/${id}`, protectedHistory: true }),
    blocker({ type: "NOTIFICATION", label: "Notifications", count: prisma.notification.count({ where: { recipientId: id } }), severity: "BLOCKING", resolution: "HISTORY_PROTECTED", adminPath: `/admin/dependencies/user/${id}`, protectedHistory: true }),
  ]);
}
