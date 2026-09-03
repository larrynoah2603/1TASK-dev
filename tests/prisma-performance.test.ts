import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("contrats de performance Prisma", () => {
  it("charge les statistiques de toutes les files visibles en une requête", () => {
    const service = source("lib/ticket-service.ts");
    const start = service.indexOf("export async function listVisibleQueues");
    const end = service.indexOf("const MAX_TICKET_ATTACHMENT_BYTES", start);
    const implementation = service.slice(start, end);

    expect(implementation).toContain("queueId: { in: visibleQueueIds }");
    expect(implementation).toContain("ticketsByQueue");
    expect(implementation).not.toContain("visibleQueues.map(async");
  });

  it("indexe les chronologies notifications et worklogs selon leurs tris", () => {
    const schema = source("prisma/schema.prisma");

    expect(schema).toContain("@@index([recipientId, createdAt])");
    expect(schema).toContain("@@index([missionId, startedAt])");
  });
});
