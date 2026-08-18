-- Preserve the requester's authoritative Entra department separately from the
-- operational department selected by the service catalogue.
ALTER TABLE "Ticket"
ADD COLUMN "sourceDepartmentId" TEXT;

UPDATE "Ticket" AS t
SET "sourceDepartmentId" = u."departmentId"
FROM "User" AS u
WHERE u."id" = t."requesterId"
  AND u."departmentId" IS NOT NULL;

CREATE INDEX "Ticket_sourceDepartmentId_createdAt_idx"
ON "Ticket"("sourceDepartmentId", "createdAt");

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_sourceDepartmentId_fkey"
FOREIGN KEY ("sourceDepartmentId") REFERENCES "Department"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TYPE "NotificationType"
ADD VALUE IF NOT EXISTS 'ADMINISTRATIVE_ACTION';
