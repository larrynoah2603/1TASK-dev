-- Nullable for all historical and non-SLA events. PostgreSQL permits multiple
-- NULL values while enforcing uniqueness for newly keyed SLA events.
ALTER TABLE "TicketEvent"
  ADD COLUMN IF NOT EXISTS "eventKey" TEXT;

-- Keep this compatible with Prisma Migrate's transaction. PostgreSQL does not
-- allow CREATE INDEX CONCURRENTLY in a transaction.
CREATE UNIQUE INDEX IF NOT EXISTS "TicketEvent_eventKey_key"
  ON "TicketEvent"("eventKey");
