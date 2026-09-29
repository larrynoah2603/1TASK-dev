CREATE TYPE "AssetRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TYPE "AssetType" ADD VALUE 'ACCESSORY';
ALTER TABLE "Asset" ADD COLUMN "assignedAt" TIMESTAMP(3);

CREATE TABLE "AssetRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "assetId" TEXT,
  "assetType" "AssetType" NOT NULL,
  "reason" TEXT NOT NULL,
  "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
  "comment" TEXT,
  "status" "AssetRequestStatus" NOT NULL DEFAULT 'PENDING',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AssetRequest_requesterId_createdAt_idx" ON "AssetRequest"("requesterId", "createdAt");
CREATE INDEX "AssetRequest_status_createdAt_idx" ON "AssetRequest"("status", "createdAt");
CREATE INDEX "AssetRequest_assetId_idx" ON "AssetRequest"("assetId");
CREATE INDEX "AssetRequest_approvedById_idx" ON "AssetRequest"("approvedById");
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
