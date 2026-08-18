-- CreateEnum
CREATE TYPE "Impact" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketLinkType" AS ENUM ('DUPLICATE', 'DEPENDS_ON', 'BLOCKS', 'PARENT', 'CHILD');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'BLOCKED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('COMPUTER', 'SCREEN', 'PHONE', 'LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'IN_REPAIR', 'RETIRED', 'LOST');

-- CreateEnum
CREATE TYPE "WorkflowEntityType" AS ENUM ('TICKET', 'MISSION');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketType" ADD VALUE 'PRODUCTION_TASK';
ALTER TYPE "TicketType" ADD VALUE 'CHANGE_REQUEST';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketEventType" ADD VALUE 'QUALIFIED';
ALTER TYPE "TicketEventType" ADD VALUE 'LINK_CREATED';
ALTER TYPE "TicketEventType" ADD VALUE 'SLA_EXCEPTION_CREATED';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "assetId" TEXT,
ADD COLUMN     "dossierId" TEXT,
ADD COLUMN     "impact" "Impact" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "legalDueAt" TIMESTAMP(3),
ADD COLUMN     "missionId" TEXT,
ADD COLUMN     "priorityOverrideReason" TEXT,
ADD COLUMN     "urgency" "Urgency" NOT NULL DEFAULT 'MEDIUM';

-- CreateTable
CREATE TABLE "ClientAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientDossier" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "confidential" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientDossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "departmentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "dueAt" TIMESTAMP(3),
    "budgetMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "serialNumber" TEXT,
    "departmentId" TEXT,
    "assignedToId" TEXT,
    "licenseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMovement" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "fromDepartmentId" TEXT,
    "toDepartmentId" TEXT,
    "reason" TEXT NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "AssetMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worklog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "missionId" TEXT,
    "userId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worklog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketLink" (
    "id" TEXT NOT NULL,
    "fromTicketId" TEXT NOT NULL,
    "toTicketId" TEXT NOT NULL,
    "type" "TicketLinkType" NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaException" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "addedMinutes" INTEGER NOT NULL DEFAULT 0,
    "firstResponseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlaException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" "WorkflowEntityType" NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "steps" JSONB NOT NULL,
    "transitions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "departmentId" TEXT,
    "ownerId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "reviewAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAccount_code_key" ON "ClientAccount"("code");

-- CreateIndex
CREATE INDEX "ClientAccount_isActive_name_idx" ON "ClientAccount"("isActive", "name");

-- CreateIndex
CREATE INDEX "ClientDossier_clientId_isActive_idx" ON "ClientDossier"("clientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClientDossier_clientId_code_key" ON "ClientDossier"("clientId", "code");

-- CreateIndex
CREATE INDEX "Mission_departmentId_status_dueAt_idx" ON "Mission"("departmentId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_dossierId_code_key" ON "Mission"("dossierId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetTag_key" ON "Asset"("assetTag");

-- CreateIndex
CREATE INDEX "Asset_departmentId_status_idx" ON "Asset"("departmentId", "status");

-- CreateIndex
CREATE INDEX "Asset_assignedToId_status_idx" ON "Asset"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "AssetMovement_assetId_movedAt_idx" ON "AssetMovement"("assetId", "movedAt");

-- CreateIndex
CREATE INDEX "Worklog_ticketId_createdAt_idx" ON "Worklog"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "Worklog_missionId_createdAt_idx" ON "Worklog"("missionId", "createdAt");

-- CreateIndex
CREATE INDEX "Worklog_userId_startedAt_idx" ON "Worklog"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "TicketLink_fromTicketId_type_idx" ON "TicketLink"("fromTicketId", "type");

-- CreateIndex
CREATE INDEX "TicketLink_toTicketId_type_idx" ON "TicketLink"("toTicketId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TicketLink_fromTicketId_toTicketId_type_key" ON "TicketLink"("fromTicketId", "toTicketId", "type");

-- CreateIndex
CREATE INDEX "SlaException_ticketId_createdAt_idx" ON "SlaException"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_code_key" ON "WorkflowDefinition"("code");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_entityType_status_idx" ON "WorkflowDefinition"("entityType", "status");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_departmentId_isPublished_reviewAt_idx" ON "KnowledgeArticle"("departmentId", "isPublished", "reviewAt");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_ownerId_updatedAt_idx" ON "KnowledgeArticle"("ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_eventType_channel_key" ON "NotificationPreference"("userId", "eventType", "channel");

-- AddForeignKey
ALTER TABLE "ClientDossier" ADD CONSTRAINT "ClientDossier_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "ClientDossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMovement" ADD CONSTRAINT "AssetMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worklog" ADD CONSTRAINT "Worklog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worklog" ADD CONSTRAINT "Worklog_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worklog" ADD CONSTRAINT "Worklog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "ClientDossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLink" ADD CONSTRAINT "TicketLink_fromTicketId_fkey" FOREIGN KEY ("fromTicketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLink" ADD CONSTRAINT "TicketLink_toTicketId_fkey" FOREIGN KEY ("toTicketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLink" ADD CONSTRAINT "TicketLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaException" ADD CONSTRAINT "SlaException_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaException" ADD CONSTRAINT "SlaException_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

