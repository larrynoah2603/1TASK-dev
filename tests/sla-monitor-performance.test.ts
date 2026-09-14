import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const monitor = readFileSync(resolve(process.cwd(), "lib/sla-monitor.ts"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20260914110000_add_sla_event_idempotency_key/migration.sql"), "utf8");

describe("performance du moniteur SLA", () => {
  it("parcourt tous les tickets éligibles par lots déterministes", () => {
    expect(monitor).toContain("SLA_MONITOR_BATCH_SIZE");
    expect(monitor).toContain('orderBy: { id: "asc" }');
    expect(monitor).toContain("cursor: { id: cursor }");
    expect(monitor).toContain("scanned += tickets.length");
    expect(monitor).toContain("slaPausedAt: null");
  });

  it("groupe les lectures et écritures du lot SLA", () => {
    expect(monitor).toContain("processSlaAlertBatch");
    expect(monitor).toContain("ticketEvent.createManyAndReturn");
    expect(monitor).toContain("auditLog.createMany");
    expect(monitor).toContain("notification.createMany");
    expect(monitor).not.toContain("for (const recipientId of recipients)");
  });

  it("indexe l'échéance de première réponse utilisée par le moniteur", () => {
    expect(schema).toContain("@@index([status, firstResponseDueAt])");
  });

  it("garantit en base l'idempotence métier des alertes SLA", () => {
    expect(schema).toContain("eventKey");
    expect(schema).toContain("@unique");
    expect(monitor).toContain("makeSlaEventKey");
    expect(monitor).toContain("eventKey,");
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "eventKey" TEXT');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "TicketEvent_eventKey_key"');
    expect(migration).not.toContain("CREATE UNIQUE INDEX CONCURRENTLY");
  });
});
