import { Prisma } from "@prisma/client";

export async function appendAuditLog(
  db: Prisma.TransactionClient,
  input: {
    actorId?: string;
    action: string;
    objectType: string;
    objectId: string;
    oldValue?: Prisma.InputJsonValue | null;
    newValue?: Prisma.InputJsonValue | null;
    reason?: string;
    ipAddress?: string;
  },
) {
  return db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      oldValue: input.oldValue === null ? Prisma.JsonNull : input.oldValue,
      newValue: input.newValue === null ? Prisma.JsonNull : input.newValue,
      reason: input.reason,
      ipAddress: input.ipAddress,
    },
  });
}
