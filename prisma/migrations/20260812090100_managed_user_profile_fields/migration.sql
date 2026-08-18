-- Managed user profiles for 1TASK.
-- This migration runs after 20260812090000 has committed the new enum value.
-- Microsoft Entra identity data and application-owned profile data are kept
-- in separate columns. Existing manager links are preserved as the Entra
-- manager relationship before managerId becomes application-managed.

-- Auth.js/Prisma creates the row before Microsoft Graph synchronization. A
-- fresh identity must therefore be denied application access by default.
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'PENDING_ASSIGNMENT';

ALTER TABLE "User"
  ADD COLUMN "entraDisplayName" TEXT,
  ADD COLUMN "managedDisplayName" TEXT,
  ADD COLUMN "entraManagerId" TEXT,
  ADD COLUMN "entraManagerObjectId" TEXT,
  ADD COLUMN "entraManagerDisplayName" TEXT,
  ADD COLUMN "entraManagerEmail" VARCHAR(320),
  ADD COLUMN "primaryRoleCode" "RoleCode",
  ADD COLUMN "primaryTeamId" TEXT,
  ADD COLUMN "authorizedQueueId" TEXT;

-- Before the application starts treating managerId as the managed manager,
-- preserve all manager relationships created by the previous Entra sync.
UPDATE "User"
SET "entraManagerId" = "managerId"
WHERE "managerId" IS NOT NULL
  AND "entraManagerId" IS NULL;

UPDATE "User" child
SET
  "entraManagerObjectId" = parent."entraObjectId",
  "entraManagerDisplayName" = parent."name",
  "entraManagerEmail" = parent."email"
FROM "User" parent
WHERE child."entraManagerId" = parent."id";

UPDATE "User"
SET "managerId" = NULL;

-- Existing names were the effective Entra names in the previous model. Keep
-- them visible through the compatibility name column and retain a distinct
-- source column for future synchronizations.
UPDATE "User"
SET "entraDisplayName" = "name"
WHERE "entraDisplayName" IS NULL;

CREATE TABLE "UserProfileChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "field" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfileChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "User_entraManagerId_idx" ON "User"("entraManagerId");
CREATE INDEX "User_entraManagerObjectId_idx" ON "User"("entraManagerObjectId");
CREATE INDEX "User_primaryTeamId_idx" ON "User"("primaryTeamId");
CREATE INDEX "User_authorizedQueueId_idx" ON "User"("authorizedQueueId");
CREATE INDEX "UserProfileChange_userId_createdAt_idx" ON "UserProfileChange"("userId", "createdAt");
CREATE INDEX "UserProfileChange_actorId_createdAt_idx" ON "UserProfileChange"("actorId", "createdAt");
CREATE INDEX "UserProfileChange_field_createdAt_idx" ON "UserProfileChange"("field", "createdAt");

-- Profile history is append-only, just like AuditLog and ticket history.
CREATE OR REPLACE FUNCTION prevent_user_profile_change_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'User profile history is append-only';
END;
$$;

CREATE TRIGGER user_profile_change_append_only
BEFORE UPDATE OR DELETE ON "UserProfileChange"
FOR EACH ROW EXECUTE FUNCTION prevent_user_profile_change_mutation();

ALTER TABLE "User"
  ADD CONSTRAINT "User_entraManagerId_fkey"
  FOREIGN KEY ("entraManagerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "User_primaryTeamId_fkey"
  FOREIGN KEY ("primaryTeamId") REFERENCES "Team"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "User_authorizedQueueId_fkey"
  FOREIGN KEY ("authorizedQueueId") REFERENCES "Queue"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserProfileChange"
  ADD CONSTRAINT "UserProfileChange_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "UserProfileChange_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
