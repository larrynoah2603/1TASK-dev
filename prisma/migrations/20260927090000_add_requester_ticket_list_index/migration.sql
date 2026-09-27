-- Supports the default requester ticket list predicate and stable ordering.
CREATE INDEX "Ticket_requesterId_updatedAt_id_idx"
ON "Ticket"("requesterId", "updatedAt", "id");
