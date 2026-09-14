-- Nullable for all historical and non-SLA events. PostgreSQL permits multiple
-- NULL values while enforcing uniqueness for newly keyed SLA events.
ALTER TABLE "TicketEvent"
  ADD COLUMN IF NOT EXISTS "eventKey" TEXT;

-- Keep this compatible with transaction-wrapped deployments. PostgreSQL does
-- not allow concurrent index creation in a transaction (SQLSTATE 25001).
CREATE UNIQUE INDEX IF NOT EXISTS "TicketEvent_eventKey_key"
  ON "TicketEvent"("eventKey");
