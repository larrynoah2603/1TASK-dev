import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
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

function ticketAttachmentRoot() {
  return path.join(process.cwd(), "var", "ticket-attachments");
}

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
  const context = await authorizedAttachmentContext(actor, ticketId);
  const canUpload =
    hasPermission(context.actor, "ticket:comment:public", context.target) ||
    hasPermission(context.actor, "ticket:update", context.target);
  if (!canUpload) throw new AuthorizationError("Vous ne pouvez pas ajouter de pièce jointe à ce ticket.");
  if (!input.name.trim()) throw new DomainError("Le nom du fichier est obligatoire.", 422);
  if (!Number.isFinite(input.size) || input.size < 1 || input.size > MAX_TICKET_ATTACHMENT_BYTES) {
    throw new DomainError("La pièce jointe doit peser entre 1 octet et 10 Mo.", 422);
  }
  if (!ALLOWED_TICKET_ATTACHMENT_TYPES.has(input.type)) {
    throw new DomainError("Ce type de fichier n’est pas autorisé.", 422);
  }

  const storageKey = `${ticketId}/${randomUUID()}`;
  const storagePath = path.join(ticketAttachmentRoot(), storageKey);
  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(storagePath, Buffer.from(await input.arrayBuffer()));
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
    await unlink(storagePath).catch(() => undefined);
    throw error;
  }
}

export async function getTicketAttachmentForViewer(actor: UserContext, ticketId: string, attachmentId: string) {
  const context = await authorizedAttachmentContext(actor, ticketId);
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
  const storagePath = path.join(ticketAttachmentRoot(), attachment.storageKey);
  let content: Buffer;
  try {
    content = await readFile(storagePath);
  } catch {
    throw new DomainError("Le fichier n’est plus disponible dans le stockage local.", 410);
  }
  return { content, fileName: attachment.fileName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes };
}

export async function listTicketAttachmentsForViewer(actor: UserContext, ticketId: string) {
  const context = await authorizedAttachmentContext(actor, ticketId);
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
