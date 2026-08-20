import { NotificationChannel, NotificationType, RoleCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasGlobalRole } from "@/lib/access-control";
import { AuthorizationError, permissionCodes, requireCurrentActor, toAccessSubject, type UserContext } from "@/lib/server-auth";
import { appendAuditLog } from "@/lib/audit";
import {
  knowledgeArticleSchema,
  knowledgeArticleStatusSchema,
  notificationPreferenceSchema,
  type KnowledgeArticleInput,
  type KnowledgeArticleStatusInput,
  type NotificationPreferenceInput,
} from "@/lib/validation";
import { KnowledgeArticleStatus } from "@prisma/client";

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
      ...(canManage(actor)
        ? {}
        : { status: KnowledgeArticleStatus.PUBLISHED, isPublished: true }),
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
  const status = parsed.status ?? (parsed.isPublished ? KnowledgeArticleStatus.PUBLISHED : KnowledgeArticleStatus.DRAFT);
  const article = await prisma.knowledgeArticle.create({
    data: {
      title: parsed.title,
      body: parsed.body,
      departmentId: parsed.departmentId ?? null,
      reviewAt: parsed.reviewAt ?? null,
      tags: parsed.tags,
      status,
      isPublished: status === KnowledgeArticleStatus.PUBLISHED,
      ownerId: actor.id,
    },
    include: { department: true, owner: { select: { id: true, name: true } } },
  });
  await appendAuditLog(prisma, { actorId: actor.id, action: "KNOWLEDGE_ARTICLE_CREATED", objectType: "KnowledgeArticle", objectId: article.id, newValue: { ...parsed, status }, reason: "Création d’un article de connaissance." });
  return article;
}

export async function transitionKnowledgeArticle(
  actor: UserContext,
  articleId: string,
  input: KnowledgeArticleStatusInput,
) {
  actor = await requireCurrentActor(actor);
  if (!canManage(actor)) throw new AuthorizationError("La gestion de la base de connaissances n’est pas autorisée.");
  const parsed = knowledgeArticleStatusSchema.parse(input);
  const article = await prisma.knowledgeArticle.findUnique({ where: { id: articleId } });
  if (!article) throw new AuthorizationError("Article de connaissance introuvable.");
  if (!isGlobalAdmin(actor) && article.departmentId && article.departmentId !== actor.departmentId) {
    throw new AuthorizationError("Le département de l’article est hors de votre périmètre.");
  }

  const allowedTransitions: Record<KnowledgeArticleStatus, KnowledgeArticleStatus[]> = {
    [KnowledgeArticleStatus.DRAFT]: [KnowledgeArticleStatus.REVIEW, KnowledgeArticleStatus.ARCHIVED],
    [KnowledgeArticleStatus.REVIEW]: [KnowledgeArticleStatus.DRAFT, KnowledgeArticleStatus.PUBLISHED, KnowledgeArticleStatus.ARCHIVED],
    [KnowledgeArticleStatus.PUBLISHED]: [KnowledgeArticleStatus.REVIEW, KnowledgeArticleStatus.ARCHIVED],
    [KnowledgeArticleStatus.ARCHIVED]: [KnowledgeArticleStatus.DRAFT],
  };
  if (!allowedTransitions[article.status].includes(parsed.status as KnowledgeArticleStatus)) {
    throw new AuthorizationError(`Transition ${article.status} → ${parsed.status} non autorisée.`);
  }

  const updated = await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: {
      status: parsed.status as KnowledgeArticleStatus,
      isPublished: parsed.status === KnowledgeArticleStatus.PUBLISHED,
    },
    include: { department: true, owner: { select: { id: true, name: true } } },
  });
  await appendAuditLog(prisma, {
    actorId: actor.id,
    action: "KNOWLEDGE_ARTICLE_STATUS_CHANGED",
    objectType: "KnowledgeArticle",
    objectId: articleId,
    oldValue: { status: article.status, isPublished: article.isPublished },
    newValue: { status: updated.status, isPublished: updated.isPublished },
    reason: parsed.reason,
  });
  return updated;
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
