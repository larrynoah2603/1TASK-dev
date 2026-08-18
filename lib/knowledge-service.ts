import { NotificationChannel, NotificationType, RoleCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasGlobalRole } from "@/lib/access-control";
import { AuthorizationError, permissionCodes, requireCurrentActor, toAccessSubject, type UserContext } from "@/lib/server-auth";
import { appendAuditLog } from "@/lib/audit";
import {
  knowledgeArticleSchema,
  notificationPreferenceSchema,
  type KnowledgeArticleInput,
  type NotificationPreferenceInput,
} from "@/lib/validation";

function canManage(actor: UserContext) {
  return permissionCodes(actor).includes("knowledge:manage");
}

function canRead(actor: UserContext) {
  return permissionCodes(actor).includes("knowledge:read");
}

function isGlobalAdmin(actor: UserContext) {
  return hasGlobalRole(toAccessSubject(actor), RoleCode.FUNCTIONAL_ADMIN);
}

export async function listKnowledgeArticles(actor: UserContext, query?: string) {
  actor = await requireCurrentActor(actor);
  if (!canRead(actor) && !canManage(actor)) throw new AuthorizationError("La lecture de la base de connaissances n’est pas autorisée.");
  const q = query?.trim();
  return prisma.knowledgeArticle.findMany({
    where: {
      ...(canManage(actor) ? {} : { isPublished: true }),
      ...(isGlobalAdmin(actor) ? {} : { OR: [{ departmentId: null }, { departmentId: actor.departmentId ?? "__none__" }] }),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { body: { contains: q, mode: "insensitive" as const } }, { tags: { has: q.toLowerCase() } }] } : {}),
    },
    include: { department: true, owner: { select: { id: true, name: true } } },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });
}

export async function createKnowledgeArticle(actor: UserContext, input: KnowledgeArticleInput) {
  actor = await requireCurrentActor(actor);
  if (!canManage(actor)) throw new AuthorizationError("La gestion de la base de connaissances n’est pas autorisée.");
  const parsed = knowledgeArticleSchema.parse(input);
  if (!isGlobalAdmin(actor) && parsed.departmentId && parsed.departmentId !== actor.departmentId) throw new AuthorizationError("Le département de l’article est hors de votre périmètre.");
  const article = await prisma.knowledgeArticle.create({ data: { ...parsed, ownerId: actor.id }, include: { department: true, owner: { select: { id: true, name: true } } } });
  await appendAuditLog(prisma, { actorId: actor.id, action: "KNOWLEDGE_ARTICLE_CREATED", objectType: "KnowledgeArticle", objectId: article.id, newValue: parsed, reason: "Création d’un article de connaissance." });
  return article;
}

export async function updateNotificationPreference(actor: UserContext, input: NotificationPreferenceInput) {
  actor = await requireCurrentActor(actor);
  if (!permissionCodes(actor).includes("notification:preferences")) throw new AuthorizationError("La gestion des préférences n’est pas autorisée.");
  const parsed = notificationPreferenceSchema.parse(input);
  return prisma.notificationPreference.upsert({
    where: { userId_eventType_channel: { userId: actor.id, eventType: parsed.eventType, channel: parsed.channel } },
    update: { enabled: parsed.enabled },
    create: { userId: actor.id, eventType: parsed.eventType, channel: parsed.channel, enabled: parsed.enabled },
  });
}

export async function listNotificationPreferences(actor: UserContext) {
  actor = await requireCurrentActor(actor);
  if (!permissionCodes(actor).includes("notification:preferences")) throw new AuthorizationError("La lecture des préférences n’est pas autorisée.");
  const rows = await prisma.notificationPreference.findMany({ where: { userId: actor.id }, orderBy: [{ eventType: "asc" }, { channel: "asc" }] });
  return rows.length ? rows : Object.values(NotificationType).flatMap((eventType) => Object.values(NotificationChannel).map((channel) => ({ eventType, channel, enabled: true })));
}
