-- Add organization ownership to business calendars without deleting existing SLA data.
CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");
CREATE INDEX "Organization_isActive_name_idx" ON "Organization"("isActive", "name");

ALTER TABLE "BusinessCalendar" ADD COLUMN "organizationId" TEXT;

INSERT INTO "Organization" ("id", "code", "name", "isActive")
VALUES ('corg1task0000000000000001', 'DEFAULT', 'Organisation principale 1TASK', true)
ON CONFLICT ("code") DO NOTHING;

UPDATE "BusinessCalendar"
SET "organizationId" = 'corg1task0000000000000001'
WHERE "organizationId" IS NULL;

ALTER TABLE "BusinessCalendar" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "BusinessCalendar_organizationId_isActive_idx" ON "BusinessCalendar"("organizationId", "isActive");

ALTER TABLE "BusinessCalendar"
ADD CONSTRAINT "BusinessCalendar_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
