import { AssetRequestStatus, AssetStatus, NotificationType } from "@prisma/client";
import { assertAssetRequestReviewer } from "@/lib/asset-access";
import { appendAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createInAppNotification } from "@/lib/notifications";
import { AuthorizationError, ResourceNotFoundError, type UserContext } from "@/lib/server-auth";
import { assetRequestReviewSchema, assetRequestSchema, type AssetRequestInput, type AssetRequestReviewInput } from "@/lib/validation";

export function listMyAssets(actor: UserContext) {
  // The requester id is taken exclusively from the authenticated server context.
  return prisma.asset.findMany({
    where: { assignedToId: actor.id },
    orderBy: [{ assignedAt: "desc" }, { assetTag: "asc" }],
    select: { id: true, assetTag: true, type: true, status: true, name: true, serialNumber: true, assignedAt: true },
  });
}

export function listMyAssetRequests(actor: UserContext) {
  return prisma.assetRequest.findMany({
    where: { requesterId: actor.id },
    orderBy: { createdAt: "desc" },
    include: { asset: { select: { id: true, assetTag: true, name: true } } },
  });
}

export async function createAssetRequest(actor: UserContext, input: AssetRequestInput) {
  const parsed = assetRequestSchema.parse(input);
  return prisma.assetRequest.create({ data: { ...parsed, comment: parsed.comment || null, requesterId: actor.id } });
}

export async function listAssetRequestsForReview(actor: UserContext) {
  assertAssetRequestReviewer(actor);
  const [requests, availableAssets] = await Promise.all([
    prisma.assetRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        asset: { select: { id: true, assetTag: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.asset.findMany({
      where: { assignedToId: null, status: AssetStatus.ACTIVE },
      orderBy: [{ type: "asc" }, { assetTag: "asc" }],
      select: { id: true, assetTag: true, name: true, type: true },
    }),
  ]);
  return { requests, availableAssets };
}

export async function reviewAssetRequest(actor: UserContext, requestId: string, input: AssetRequestReviewInput) {
  assertAssetRequestReviewer(actor);
  const parsed = assetRequestReviewSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const request = await tx.assetRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new ResourceNotFoundError("Demande d’actif introuvable.");
    if (request.status !== AssetRequestStatus.PENDING) throw new AuthorizationError("Cette demande a déjà été traitée.");

    if (parsed.decision === "APPROVE") {
      const asset = await tx.asset.findUnique({ where: { id: parsed.assetId } });
      if (!asset || asset.status !== AssetStatus.ACTIVE || asset.assignedToId || asset.type !== request.assetType) {
        throw new AuthorizationError("L’actif sélectionné n’est plus disponible ou ne correspond pas au type demandé.");
      }
      const approvedAt = new Date();
      const assignment = await tx.asset.updateMany({
        where: { id: asset.id, assignedToId: null, status: AssetStatus.ACTIVE, type: request.assetType },
        data: { assignedToId: request.requesterId, assignedAt: approvedAt },
      });
      if (assignment.count !== 1) throw new AuthorizationError("L’actif vient d’être attribué à un autre utilisateur.");
      await tx.assetMovement.create({ data: { assetId: asset.id, toUserId: request.requesterId, toDepartmentId: asset.departmentId, reason: `Attribution après validation de la demande ${request.id}`, createdById: actor.id } });
      const updated = await tx.assetRequest.update({ where: { id: request.id }, data: { status: AssetRequestStatus.APPROVED, assetId: asset.id, approvedById: actor.id, approvedAt } });
      await createInAppNotification(tx, { recipientId: request.requesterId, type: NotificationType.ADMINISTRATIVE_ACTION, title: "Demande d’actif approuvée", body: `${asset.name} (${asset.assetTag}) vous a été attribué.` });
      await appendAuditLog(tx, { actorId: actor.id, action: "ASSET_REQUEST_APPROVED", objectType: "AssetRequest", objectId: request.id, newValue: { assetId: asset.id, requesterId: request.requesterId }, reason: "Validation et attribution d’un actif." });
      return updated;
    }

    const updated = await tx.assetRequest.update({ where: { id: request.id }, data: { status: AssetRequestStatus.REJECTED, rejectedReason: parsed.rejectedReason, approvedById: actor.id, approvedAt: new Date() } });
    await createInAppNotification(tx, { recipientId: request.requesterId, type: NotificationType.ADMINISTRATIVE_ACTION, title: "Demande d’actif refusée", body: parsed.rejectedReason });
    await appendAuditLog(tx, { actorId: actor.id, action: "ASSET_REQUEST_REJECTED", objectType: "AssetRequest", objectId: request.id, newValue: { rejectedReason: parsed.rejectedReason }, reason: "Refus motivé d’une demande d’actif." });
    return updated;
  });
}
