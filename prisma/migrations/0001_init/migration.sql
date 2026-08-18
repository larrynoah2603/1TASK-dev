-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('REQUESTER', 'AGENT', 'QUEUE_MANAGER', 'FUNCTIONAL_ADMIN', 'TECHNICAL_ADMIN', 'REPORTING_READER');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('GLOBAL', 'DEPARTMENT', 'QUEUE', 'TEAM', 'PORTFOLIO', 'USER_LIST');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('INCIDENT', 'SERVICE_REQUEST', 'QUESTION', 'ACCESS_REQUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'TO_QUALIFY', 'TO_ASSIGN', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'RESOLUTION_PENDING', 'REOPENED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MessageVisibility" AS ENUM ('REQUESTER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "TicketEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'QUEUE_CHANGED', 'MESSAGE_ADDED', 'RESOLUTION_SUBMITTED', 'REOPENED', 'CLOSED', 'SLA_ALERT', 'SLA_BREACH', 'CONFIDENTIAL_ACCESS_GRANTED', 'CONFIDENTIAL_ACCESS_REVOKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TICKET_CREATED', 'QUEUE_NEW_TICKET', 'TICKET_ASSIGNED', 'INFORMATION_REQUESTED', 'TICKET_RESOLVED', 'TICKET_REOPENED', 'SLA_ALERT', 'SLA_BREACH', 'CONFIDENTIAL_ACCESS');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "SlaCalculationMode" AS ENUM ('ROLLING', 'ABSOLUTE', 'RELATIVE_MILESTONE');

-- CreateEnum
CREATE TYPE "BlockReason" AS ENUM ('REQUESTER_WAITING', 'SUPPLIER_WAITING', 'OTHER_TEAM_WAITING', 'VALIDATION_REQUIRED', 'EXTERNAL_PROBLEM', 'MISSING_INFORMATION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "entraObjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "jobTitle" TEXT,
    "departmentId" TEXT,
    "managerId" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoAssignment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "leadId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scopeId" TEXT,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionScope" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ScopeType" NOT NULL,
    "description" TEXT,
    "departmentId" TEXT,
    "queueId" TEXT,
    "teamId" TEXT,
    "portfolioKey" TEXT,

    CONSTRAINT "PermissionScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeMember" (
    "scopeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ScopeMember_pkey" PRIMARY KEY ("scopeId","userId")
);

-- CreateTable
CREATE TABLE "ServiceCatalogItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ticketType" "TicketType" NOT NULL,
    "category" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "queueId" TEXT NOT NULL,
    "priorityDefault" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "slaId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLA" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstResponseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "calendarId" TEXT NOT NULL,
    "calculationMode" "SlaCalculationMode" NOT NULL DEFAULT 'ROLLING',
    "alertThresholds" INTEGER[] DEFAULT ARRAY[50, 80, 100]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCalendar" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Indian/Antananarivo',
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "workdayStartMinute" INTEGER NOT NULL DEFAULT 480,
    "workdayEndMinute" INTEGER NOT NULL DEFAULT 1020,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BusinessCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thresholdPercent" INTEGER NOT NULL,
    "queueId" TEXT,
    "serviceItemId" TEXT,
    "targetRole" "RoleCode" NOT NULL DEFAULT 'QUEUE_MANAGER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EscalationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "requesterId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "queueId" TEXT NOT NULL,
    "serviceCatalogItemId" TEXT NOT NULL,
    "slaId" TEXT,
    "confidential" BOOLEAN NOT NULL DEFAULT false,
    "firstResponseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "firstRespondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "slaPausedAt" TIMESTAMP(3),
    "totalPausedMinutes" INTEGER NOT NULL DEFAULT 0,
    "blockReason" "BlockReason",
    "blockDetails" TEXT,
    "resolutionCause" TEXT,
    "resolutionAction" TEXT,
    "resolutionSolution" TEXT,
    "preventiveAction" TEXT,
    "reopenedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "MessageVisibility" NOT NULL DEFAULT 'REQUESTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAssignment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "previousAssigneeId" TEXT,
    "newAssigneeId" TEXT,
    "assignedById" TEXT,
    "reason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEvent" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT,
    "queueId" TEXT,
    "eventType" "TicketEventType" NOT NULL,
    "fromStatus" "TicketStatus",
    "toStatus" "TicketStatus",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "ticketId" TEXT,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "messageId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAccess" (
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAccess_pkey" PRIMARY KEY ("ticketId","userId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_entraObjectId_key" ON "User"("entraObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_departmentId_status_idx" ON "User"("departmentId", "status");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Department_isActive_idx" ON "Department"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Queue_code_key" ON "Queue"("code");

-- CreateIndex
CREATE INDEX "Queue_departmentId_isActive_idx" ON "Queue"("departmentId", "isActive");

-- CreateIndex
CREATE INDEX "Queue_managerId_isActive_idx" ON "Queue"("managerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Queue_departmentId_name_key" ON "Queue"("departmentId", "name");

-- CreateIndex
CREATE INDEX "Team_queueId_isActive_idx" ON "Team"("queueId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Team_queueId_name_key" ON "Team"("queueId", "name");

-- CreateIndex
CREATE INDEX "TeamMember_userId_isActive_isAvailable_idx" ON "TeamMember"("userId", "isActive", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "UserRole_roleId_scopeId_idx" ON "UserRole"("roleId", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_scopeId_key" ON "UserRole"("userId", "roleId", "scopeId");

-- CreateIndex
CREATE INDEX "PermissionScope_type_departmentId_queueId_teamId_idx" ON "PermissionScope"("type", "departmentId", "queueId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalogItem_code_key" ON "ServiceCatalogItem"("code");

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_queueId_isActive_idx" ON "ServiceCatalogItem"("queueId", "isActive");

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_category_isActive_idx" ON "ServiceCatalogItem"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SLA_code_key" ON "SLA"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCalendar_code_key" ON "BusinessCalendar"("code");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_calendarId_date_key" ON "Holiday"("calendarId", "date");

-- CreateIndex
CREATE INDEX "EscalationRule_queueId_thresholdPercent_isActive_idx" ON "EscalationRule"("queueId", "thresholdPercent", "isActive");

-- CreateIndex
CREATE INDEX "EscalationRule_serviceItemId_thresholdPercent_isActive_idx" ON "EscalationRule"("serviceItemId", "thresholdPercent", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_reference_key" ON "Ticket"("reference");

-- CreateIndex
CREATE INDEX "Ticket_requesterId_status_updatedAt_idx" ON "Ticket"("requesterId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Ticket_queueId_status_priority_updatedAt_idx" ON "Ticket"("queueId", "status", "priority", "updatedAt");

-- CreateIndex
CREATE INDEX "Ticket_assignedToId_status_updatedAt_idx" ON "Ticket"("assignedToId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Ticket_status_resolutionDueAt_idx" ON "Ticket"("status", "resolutionDueAt");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_visibility_createdAt_idx" ON "TicketMessage"("ticketId", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "TicketAssignment_ticketId_assignedAt_idx" ON "TicketAssignment"("ticketId", "assignedAt");

-- CreateIndex
CREATE INDEX "TicketAssignment_queueId_assignedAt_idx" ON "TicketAssignment"("queueId", "assignedAt");

-- CreateIndex
CREATE INDEX "TicketEvent_ticketId_createdAt_idx" ON "TicketEvent"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketEvent_queueId_eventType_createdAt_idx" ON "TicketEvent"("queueId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_status_createdAt_idx" ON "Notification"("recipientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_ticketId_type_createdAt_idx" ON "Notification"("ticketId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

-- CreateIndex
CREATE INDEX "Attachment_ticketId_createdAt_idx" ON "Attachment"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketAccess_userId_grantedAt_idx" ON "TicketAccess"("userId", "grantedAt");

-- CreateIndex
CREATE INDEX "AuditLog_objectType_objectId_createdAt_idx" ON "AuditLog"("objectType", "objectId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "PermissionScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionScope" ADD CONSTRAINT "PermissionScope_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionScope" ADD CONSTRAINT "PermissionScope_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionScope" ADD CONSTRAINT "PermissionScope_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeMember" ADD CONSTRAINT "ScopeMember_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "PermissionScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeMember" ADD CONSTRAINT "ScopeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogItem" ADD CONSTRAINT "ServiceCatalogItem_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogItem" ADD CONSTRAINT "ServiceCatalogItem_slaId_fkey" FOREIGN KEY ("slaId") REFERENCES "SLA"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLA" ADD CONSTRAINT "SLA_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "BusinessCalendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "BusinessCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationRule" ADD CONSTRAINT "EscalationRule_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationRule" ADD CONSTRAINT "EscalationRule_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_serviceCatalogItemId_fkey" FOREIGN KEY ("serviceCatalogItemId") REFERENCES "ServiceCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_slaId_fkey" FOREIGN KEY ("slaId") REFERENCES "SLA"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_previousAssigneeId_fkey" FOREIGN KEY ("previousAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_newAssigneeId_fkey" FOREIGN KEY ("newAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAccess" ADD CONSTRAINT "TicketAccess_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAccess" ADD CONSTRAINT "TicketAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Audit log is append-only at database level.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is immutable';
END;
$$;

CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

