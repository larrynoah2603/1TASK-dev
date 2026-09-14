-- Nullable for all historical and non-SLA events. PostgreSQL permits multiple
-- NULL values while enforcing uniqueness for newly keyed SLA events.
ALTER TABLE "TicketEvent"
  ADD COLUMN IF NOT EXISTS "eventKey" TEXT;

-- Must run outside an explicit transaction, like the FTS concurrent index.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "TicketEvent_eventKey_key"
  ON "TicketEvent"("eventKey");
