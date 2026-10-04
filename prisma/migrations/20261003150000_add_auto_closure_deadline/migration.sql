ALTER TABLE "Ticket"
  ADD COLUMN IF NOT EXISTS "autoClosureDueAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Ticket_status_autoClosureDueAt_idx"
  ON "Ticket"("status", "autoClosureDueAt");
