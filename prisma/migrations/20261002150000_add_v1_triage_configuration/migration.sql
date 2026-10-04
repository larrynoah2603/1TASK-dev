-- Stable ownership links distinguish generated compatibility resources from
-- business catalog entries, without renaming or deleting existing data.
ALTER TABLE "Queue" ADD COLUMN IF NOT EXISTS "provisionedTriageDepartmentId" TEXT;
ALTER TABLE "ServiceCatalogItem" ADD COLUMN IF NOT EXISTS "provisionedTriageDepartmentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Queue_provisionedTriageDepartmentId_key"
  ON "Queue"("provisionedTriageDepartmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceCatalogItem_provisionedTriageDepartmentId_key"
  ON "ServiceCatalogItem"("provisionedTriageDepartmentId");

DO $$ BEGIN
  ALTER TABLE "Queue" ADD CONSTRAINT "Queue_provisionedTriageDepartmentId_fkey"
    FOREIGN KEY ("provisionedTriageDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ServiceCatalogItem" ADD CONSTRAINT "ServiceCatalogItem_provisionedTriageDepartmentId_fkey"
    FOREIGN KEY ("provisionedTriageDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "V1Configuration" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "globalTriageServiceId" TEXT,
  "defaultTriageSlaId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "V1Configuration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "V1Configuration_globalTriageServiceId_key"
  ON "V1Configuration"("globalTriageServiceId");
CREATE INDEX IF NOT EXISTS "V1Configuration_defaultTriageSlaId_idx"
  ON "V1Configuration"("defaultTriageSlaId");
DO $$ BEGIN
  ALTER TABLE "V1Configuration" ADD CONSTRAINT "V1Configuration_globalTriageServiceId_fkey"
    FOREIGN KEY ("globalTriageServiceId") REFERENCES "ServiceCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "V1Configuration" ADD CONSTRAINT "V1Configuration_defaultTriageSlaId_fkey"
    FOREIGN KEY ("defaultTriageSlaId") REFERENCES "SLA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
