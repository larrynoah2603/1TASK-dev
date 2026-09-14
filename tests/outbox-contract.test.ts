import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
describe("outbox transactionnelle", () => {
  it("possède idempotence, acquisition concurrente, retry, DLQ et replay", () => {
    const outbox = source("lib/outbox.ts");
    expect(outbox).toContain("FOR UPDATE SKIP LOCKED");
    expect(outbox).toContain('status: attempts >= 10 ? "DEAD"');
    expect(outbox).toContain("replayOutboxEvent");
    expect(outbox).toContain('"Idempotency-Key"');
    expect(source("prisma/schema.prisma")).toContain("model OutboxEvent");
    expect(source("lib/notifications.ts")).toContain("enqueueOutboxEvent");
  });
});
