CREATE INDEX IF NOT EXISTS "Ticket_queueId_createdAt_idx"
ON "Ticket"("queueId", "createdAt");

CREATE INDEX IF NOT EXISTS "Ticket_assignedToId_createdAt_idx"
ON "Ticket"("assignedToId", "createdAt");

CREATE INDEX IF NOT EXISTS "Ticket_requesterId_createdAt_idx"
ON "Ticket"("requesterId", "createdAt");

CREATE INDEX IF NOT EXISTS "Ticket_status_createdAt_idx"
ON "Ticket"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "TeamMember_teamId_isActive_userId_idx"
ON "TeamMember"("teamId", "isActive", "userId");