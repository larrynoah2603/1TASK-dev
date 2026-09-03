-- Support the mission worklog timeline without an extra sort.
CREATE INDEX "Worklog_missionId_startedAt_idx" ON "Worklog"("missionId", "startedAt");

-- Support the per-recipient notification feed ordered by recency.
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");
