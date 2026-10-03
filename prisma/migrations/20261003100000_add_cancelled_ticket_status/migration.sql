ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "TicketEventType" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "Ticket"
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

INSERT INTO "Permission" ("id", "code", "description")
VALUES ('v1_ticket_cancel', 'ticket:cancel', 'Annuler une demande invalide avant traitement')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" = 'ticket:cancel'
WHERE r."code" IN ('AGENT', 'QUEUE_MANAGER', 'FUNCTIONAL_ADMIN')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
