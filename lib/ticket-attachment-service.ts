import { randomUUID } from "node:crypto";
import { MessageVisibility } from "@prisma/client";
import { appendAuditLog } from "@/lib/audit";
import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/db";
import {
  AuthorizationError,
  hasPermission,
  requireCurrentActor,
  requireTicketAccess,
  roleCodes,
  type UserContext,
} from "@/lib/server-auth";
import { canPostInternalMessage } from "@/lib/domain";
import { privateObjectStorage } from "@/lib/private-object-storage";
import { delegationAllowsAction } from "@/lib/access-control";
import { requireProductCapability } from "@/lib/product-policy.server";

const MAX_TICKET_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_TICKET_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function safeAttachmentFileName(name: string) {
  const sanitized = name.normalize("NFKC").replace(/[\\/\u0000-\u001f]/g, "_").trim();
  return sanitized.slice(0, 180) || "piece-jointe";
}

async function authorizedAttachmentContext(actor: UserContext, ticketId: string) {
  const current = await requireCurrentActor(actor);
  const access = await requireTicketAccess(ticketId);
  if (access.actor.id !== current.id) throw new AuthorizationError("Le contexte utilisateur est obsolète.");
  return { actor: current, target: access.target };
}

export async function uploadTicketAttachment(
  actor: UserContext,
  ticketId: string,
  input: { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
) {
  requireProductCapability("attachmentUploads");
  const context = await authorizedAttachmentContext(actor, ticketId);
  const canUpload =
    delegationAllowsAction(context.actor.id, context.target, "ATTACHMENT") && (
      hasPermission(context.actor, "ticket:comment:public", context.target) ||
      hasPermission(context.actor, "ticket:update", context.target)
    );
  if (!canUpload) throw new AuthorizationError("Vous ne pouvez pas ajouter de pièce jointe à ce ticket.");
  if (!input.name.trim()) throw new DomainError("Le nom du fichier est obligatoire.", 422);
  if (!Number.isFinite(input.size) || input.size < 1 || input.size > MAX_TICKET_ATTACHMENT_BYTES) {
    throw new DomainError("La pièce jointe doit peser entre 1 octet et 10 Mo.", 422);
  }
  if (!ALLOWED_TICKET_ATTACHMENT_TYPES.has(input.type)) {
    throw new DomainError("Ce type de fichier n’est pas autorisé.", 422);
  }

  const storageKey = `${ticketId}/${randomUUID()}`;
  const content = Buffer.from(await input.arrayBuffer());
  if (content.length !== input.size) throw new DomainError("La taille réelle de la pièce jointe est invalide.", 422);
  const storage = privateObjectStorage();
  await storage.put(storageKey, content, input.type);
  try {
    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        uploadedById: context.actor.id,
        fileName: safeAttachmentFileName(input.name),
        storageKey,
        mimeType: input.type,
        sizeBytes: input.size,
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        messageId: true,
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    await appendAuditLog(prisma, {
      actorId: context.actor.id,
      action: "TICKET_ATTACHMENT_ADDED",
      objectType: "Attachment",
      objectId: attachment.id,
      newValue: { ticketId, fileName: attachment.fileName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes },
      reason: "Ajout d’une pièce jointe au ticket.",
    });
    return attachment;
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function getTicketAttachmentForViewer(actor: UserContext, ticketId: string, attachmentId: string) {
  const context = await authorizedAttachmentContext(actor, ticketId);
  if (!delegationAllowsAction(context.actor.id, context.target, "ATTACHMENT")) {
    throw new AuthorizationError("La délégation ne permet pas l’accès aux pièces jointes.");
  }
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, ticketId },
    include: { message: { select: { visibility: true } } },
  });
  if (!attachment) throw new DomainError("Pièce jointe introuvable.", 404);
  const canSeeInternal = canPostInternalMessage(roleCodes(context.actor)) &&
    hasPermission(context.actor, "ticket:internal-comment", context.target);
  if (attachment.message?.visibility === MessageVisibility.INTERNAL && !canSeeInternal) {
    throw new AuthorizationError("Cette pièce jointe est réservée à l’équipe de traitement.");
  }
  let content: Buffer;
  try {
    content = await privateObjectStorage().get(attachment.storageKey);
  } catch {
    throw new DomainError("Le fichier n’est plus disponible dans le stockage privé.", 410);
  }
  return { content, fileName: attachment.fileName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes };
}

export async function listTicketAttachmentsForViewer(actor: UserContext, ticketId: string) {
  const context = await authorizedAttachmentContext(actor, ticketId);
  if (!delegationAllowsAction(context.actor.id, context.target, "ATTACHMENT")) return [];
  const canSeeInternal = canPostInternalMessage(roleCodes(context.actor)) &&
    hasPermission(context.actor, "ticket:internal-comment", context.target);
  return prisma.attachment.findMany({
    where: {
      ticketId,
      ...(canSeeInternal
        ? {}
        : { OR: [{ messageId: null }, { message: { visibility: MessageVisibility.REQUESTER } }] }),
    },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
      messageId: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
