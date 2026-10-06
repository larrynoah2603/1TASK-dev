import {
  AssetRequestStatus,
  AssetStatus,
  AssetType,
  NotificationType,
  Prisma,
  RoleCode,
  UserStatus,
} from "@prisma/client";
import { assertAssetRequestReviewer } from "@/lib/asset-access";
import { appendAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createInAppNotification, createInAppNotifications, notify } from "@/lib/notifications";
import { AuthorizationError, ResourceNotFoundError, type UserContext } from "@/lib/server-auth";
import {
  assetRequestReviewSchema,
  assetRequestSchema,
  type AssetRequestInput,
  type AssetRequestReviewInput,
} from "@/lib/validation";

const requesterAssetTypes = [
  AssetType.COMPUTER,
  AssetType.PHONE,
  AssetType.ACCESSORY,
  AssetType.OTHER,
] as const;

export type RequesterAssetAvailability = Record<(typeof requesterAssetTypes)[number], number>;

export function listMyAssets(actor: UserContext) {
  // The requester id is taken exclusively from the authenticated server context.
  return prisma.asset.findMany({
    where: { assignedToId: actor.id },
    orderBy: [{ assignedAt: "desc" }, { assetTag: "asc" }],
    select: {
      id: true,
      assetTag: true,
      type: true,
      status: true,
      name: true,
      serialNumber: true,
      assignedAt: true,
    },
  });
}

export function listMyAssetRequests(actor: UserContext) {
  return prisma.assetRequest.findMany({
    where: { requesterId: actor.id },
    orderBy: { createdAt: "desc" },
    include: { asset: { select: { id: true, assetTag: true, name: true } } },
  });
}

/**
 * Requesters may see only aggregate availability, never inventory identifiers.
 * A zero count never blocks a request: the admin may approve the need and wait
 * for stock before assigning a concrete inventory item.
 */
export async function getRequesterAssetAvailability(
  _actor: UserContext,
): Promise<RequesterAssetAvailability> {
  const grouped = await prisma.asset.groupBy({
    by: ["type"],
    where: {
      assignedToId: null,
      status: AssetStatus.ACTIVE,
      type: { in: [...requesterAssetTypes] },
    },
    _count: { _all: true },
  });
  return Object.fromEntries(
    requesterAssetTypes.map((type) => [
      type,
      grouped.find((row) => row.type === type)?._count._all ?? 0,
    ]),
  ) as RequesterAssetAvailability;
}

export async function createAssetRequest(actor: UserContext, input: AssetRequestInput) {
  const parsed = assetRequestSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const request = await tx.assetRequest.create({
      data: { ...parsed, comment: parsed.comment || null, requesterId: actor.id },
    });

    await createInAppNotification(tx, {
      recipientId: actor.id,
      type: NotificationType.ASSET_REQUEST,
      severity: "INFO",
      title: "Demande d’actif enregistrée",
      body: "Votre demande d’actif a été transmise pour validation.",
      entityType: "ASSET_REQUEST",
      entityId: request.id,
      actionUrl: "/my-assets",
      deduplicationKey: `ASSET_REQUEST:${request.id}`,
    });

    const reviewers = await tx.user.findMany({
      where: {
        id: { not: actor.id },
        status: UserStatus.ACTIVE,
        administrativelyDisabled: false,
        roleAssignments: {
          some: {
            role: { code: RoleCode.FUNCTIONAL_ADMIN },
            scopeId: null,
          },
        },
      },
      select: { id: true },
    });

    await createInAppNotifications(
      tx,
      reviewers.map((reviewer) => ({
        recipientId: reviewer.id,
        type: NotificationType.ASSET_REQUEST,
        severity: "INFO" as const,
        title: "Nouvelle demande d’actif",
        body: "Une demande d’actif attend votre validation et, si possible, une attribution depuis l’inventaire.",
        entityType: "ASSET_REQUEST",
        entityId: request.id,
        actionUrl: "/admin/asset-requests",
        deduplicationKey: `ASSET_REQUEST_REVIEW:${request.id}`,
      })),
    );

    return request;
  });
}

export async function listAssetRequestsForReview(actor: UserContext) {
  assertAssetRequestReviewer(actor);
  const [requests, availableAssets] = await Promise.all([
    prisma.assetRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            department: { select: { name: true } },
          },
        },
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

async function assignAvailableAsset(
  tx: Prisma.TransactionClient,
  input: {
    requestId: string;
    requesterId: string;
    assetType: AssetType;
    assetId: string;
    actorId: string;
    approvedById: string;
    approvedAt: Date;
  },
) {
  const asset = await tx.asset.findUnique({ where: { id: input.assetId } });
  if (
    !asset ||
    asset.status !== AssetStatus.ACTIVE ||
    asset.assignedToId ||
    asset.type !== input.assetType
  ) {
    throw new AuthorizationError(
      "L’actif sélectionné n’est plus disponible ou ne correspond pas au type demandé.",
    );
  }

  const assignment = await tx.asset.updateMany({
    where: {
      id: asset.id,
      assignedToId: null,
      status: AssetStatus.ACTIVE,
      type: input.assetType,
    },
    data: {
      assignedToId: input.requesterId,
      assignedAt: input.approvedAt,
    },
  });
  if (assignment.count !== 1) {
    throw new AuthorizationError("L’actif vient d’être attribué à un autre utilisateur.");
  }

  await tx.assetMovement.create({
    data: {
      assetId: asset.id,
      toUserId: input.requesterId,
      toDepartmentId: asset.departmentId,
      reason: `Attribution après validation de la demande ${input.requestId}`,
      createdById: input.actorId,
    },
  });

  const updated = await tx.assetRequest.update({
    where: { id: input.requestId },
    data: {
      status: AssetRequestStatus.APPROVED,
      assetId: asset.id,
      approvedById: input.approvedById,
      approvedAt: input.approvedAt,
    },
  });

  return { updated, asset };
}

async function notifyRequesterAssetSuccess(
  tx: Prisma.TransactionClient,
  input: {
    requesterId: string;
    requestId: string;
    title: string;
    message: string;
    deduplicationKey: string;
  },
) {
  return notify(tx, {
    recipientId: input.requesterId,
    type: NotificationType.ASSET_APPROVED,
    severity: "SUCCESS",
    title: input.title,
    message: input.message,
    entityType: "ASSET_REQUEST",
    entityId: input.requestId,
    actionUrl: "/my-assets",
    deduplicationKey: input.deduplicationKey,
  });
}

export async function reviewAssetRequest(
  actor: UserContext,
  requestId: string,
  input: AssetRequestReviewInput,
) {
  assertAssetRequestReviewer(actor);
  const parsed = assetRequestReviewSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const request = await tx.assetRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new ResourceNotFoundError("Demande d’actif introuvable.");

    if (parsed.decision === "ASSIGN") {
      if (request.status !== AssetRequestStatus.APPROVED || request.assetId) {
        throw new AuthorizationError(
          "Seule une demande approuvée sans actif peut recevoir une attribution ultérieure.",
        );
      }

      const asset = await tx.asset.findUnique({ where: { id: parsed.assetId } });
      if (
        !asset ||
        asset.status !== AssetStatus.ACTIVE ||
        asset.assignedToId ||
        asset.type !== request.assetType
      ) {
        throw new AuthorizationError(
          "L’actif sélectionné n’est plus disponible ou ne correspond pas au type demandé.",
        );
      }

      const assignedAt = new Date();
      const assignment = await tx.asset.updateMany({
        where: {
          id: asset.id,
          assignedToId: null,
          status: AssetStatus.ACTIVE,
          type: request.assetType,
        },
        data: {
          assignedToId: request.requesterId,
          assignedAt,
        },
      });
      if (assignment.count !== 1) {
        throw new AuthorizationError("L’actif vient d’être attribué à un autre utilisateur.");
      }

      await tx.assetMovement.create({
        data: {
          assetId: asset.id,
          toUserId: request.requesterId,
          toDepartmentId: asset.departmentId,
          reason: `Attribution après validation de la demande ${request.id}`,
          createdById: actor.id,
        },
      });

      const updated = await tx.assetRequest.update({
        where: { id: request.id },
        data: {
          status: AssetRequestStatus.APPROVED,
          assetId: asset.id,
          approvedById: request.approvedById ?? actor.id,
          approvedAt: request.approvedAt ?? assignedAt,
        },
      });

      await notifyRequesterAssetSuccess(tx, {
        requesterId: request.requesterId,
        requestId: request.id,
        title: "Actif attribué",
        message: `${asset.name} (${asset.assetTag}) vous a été attribué et apparaît maintenant dans Mes actifs.`,
        deduplicationKey: `ASSET_ASSIGNED:${request.id}:${asset.id}`,
      });

      await appendAuditLog(tx, {
        actorId: actor.id,
        action: "ASSET_REQUEST_ASSIGNED",
        objectType: "AssetRequest",
        objectId: request.id,
        oldValue: { assetId: null, status: request.status },
        newValue: { assetId: asset.id, status: AssetRequestStatus.APPROVED },
        reason: "Attribution depuis l’inventaire après approbation préalable.",
      });
      return updated;
    }

    if (parsed.decision === "APPROVE") {
      if (request.status !== AssetRequestStatus.PENDING) {
        throw new AuthorizationError("Cette demande a déjà été validée ou refusée.");
      }

      const approvedAt = new Date();
      if (parsed.assetId) {
        const { updated, asset } = await assignAvailableAsset(tx, {
          requestId: request.id,
          requesterId: request.requesterId,
          assetType: request.assetType,
          assetId: parsed.assetId,
          actorId: actor.id,
          approvedById: actor.id,
          approvedAt,
        });

        await notifyRequesterAssetSuccess(tx, {
          requesterId: request.requesterId,
          requestId: request.id,
          title: "Actif attribué",
          message: `${asset.name} (${asset.assetTag}) vous a été attribué et apparaît maintenant dans Mes actifs.`,
          deduplicationKey: `ASSET_ASSIGNED:${request.id}:${asset.id}`,
        });

        await appendAuditLog(tx, {
          actorId: actor.id,
          action: "ASSET_REQUEST_APPROVED",
          objectType: "AssetRequest",
          objectId: request.id,
          newValue: {
            assetId: asset.id,
            requesterId: request.requesterId,
            assignment: "IMMEDIATE",
          },
          reason: "Validation du besoin et attribution immédiate depuis l’inventaire.",
        });
        return updated;
      }

      const updated = await tx.assetRequest.update({
        where: { id: request.id },
        data: {
          status: AssetRequestStatus.APPROVED,
          approvedById: actor.id,
          approvedAt,
          assetId: null,
        },
      });

      await notifyRequesterAssetSuccess(tx, {
        requesterId: request.requesterId,
        requestId: request.id,
        title: "Demande d’actif approuvée",
        message: "Votre besoin est approuvé. Aucun actif n’est encore attribué ; la demande reste en attente de stock ou d’attribution.",
        deduplicationKey: `ASSET_APPROVED_WAITING:${request.id}`,
      });

      await appendAuditLog(tx, {
        actorId: actor.id,
        action: "ASSET_REQUEST_APPROVED",
        objectType: "AssetRequest",
        objectId: request.id,
        newValue: {
          assetId: null,
          requesterId: request.requesterId,
          assignment: "WAITING_STOCK",
        },
        reason: "Validation du besoin sans actif disponible à attribuer immédiatement.",
      });
      return updated;
    }

    if (parsed.decision === "REJECT") {
      if (request.status !== AssetRequestStatus.PENDING) {
        throw new AuthorizationError("Seule une demande encore en validation peut être refusée.");
      }
      const updated = await tx.assetRequest.update({
        where: { id: request.id },
        data: {
          status: AssetRequestStatus.REJECTED,
          rejectedReason: parsed.rejectedReason,
          approvedById: actor.id,
          approvedAt: new Date(),
        },
      });
      await notify(tx, {
        recipientId: request.requesterId,
        type: NotificationType.ASSET_REJECTED,
        severity: "WARNING",
        title: "Demande d’actif refusée",
        message: parsed.rejectedReason,
        entityType: "ASSET_REQUEST",
        entityId: request.id,
        actionUrl: "/my-assets",
        deduplicationKey: `ASSET_REJECTED:${request.id}`,
      });
      await appendAuditLog(tx, {
        actorId: actor.id,
        action: "ASSET_REQUEST_REJECTED",
        objectType: "AssetRequest",
        objectId: request.id,
        newValue: { rejectedReason: parsed.rejectedReason },
        reason: "Refus motivé d’une demande d’actif.",
      });
      return updated;
    }

    throw new AuthorizationError("Décision de demande d’actif non prise en charge.");
  });
}
