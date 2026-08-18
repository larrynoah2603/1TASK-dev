-- Keep an administrative disable decision separate from the official Entra
-- account and department values. Entra synchronization must not silently
-- re-enable an account disabled by an application administrator.
ALTER TABLE "User"
ADD COLUMN "administrativelyDisabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "recipientRole" "RoleCode" NOT NULL,
    "departmentId" TEXT,
    "queueId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationRule_eventType_isActive_idx"
ON "NotificationRule"("eventType", "isActive");

CREATE INDEX "NotificationRule_departmentId_isActive_idx"
ON "NotificationRule"("departmentId", "isActive");

CREATE INDEX "NotificationRule_queueId_isActive_idx"
ON "NotificationRule"("queueId", "isActive");

ALTER TABLE "NotificationRule"
ADD CONSTRAINT "NotificationRule_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NotificationRule"
ADD CONSTRAINT "NotificationRule_queueId_fkey"
FOREIGN KEY ("queueId") REFERENCES "Queue"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
