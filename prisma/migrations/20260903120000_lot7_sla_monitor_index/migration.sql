-- Supports SLA monitor and reporting predicates for unanswered tickets.
CREATE INDEX "Ticket_status_firstResponseDueAt_idx" ON "Ticket"("status", "firstResponseDueAt");
