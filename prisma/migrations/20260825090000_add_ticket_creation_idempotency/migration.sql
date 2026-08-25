-- Add a retry-safe client token for ticket creation.
-- Existing tickets remain valid because the column is nullable.
ALTER TABLE "Ticket" ADD COLUMN "creationIdempotencyToken" TEXT;

CREATE UNIQUE INDEX "Ticket_createdById_creationIdempotencyToken_key"
  ON "Ticket"("createdById", "creationIdempotencyToken");
