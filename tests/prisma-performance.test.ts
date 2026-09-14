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

  it("ajoute la pagination curseur sans supprimer le contrat de page existant", () => {
    const service = source("lib/ticket-service.ts");
    const route = source("app/api/tickets/route.ts");

    expect(service).toContain("cursor ? { cursor: { id: cursor.id }, skip: 1 }");
    expect(service).toContain("take: cursor ? pageSize + 1 : pageSize");
    expect(service).toContain("nextCursor:");
    expect(service).toContain("hasMore,");
    expect(service).toContain("totalPages:");
    expect(service).toContain("decoded.sort !== sort");
    expect(route).toContain('response.headers.set("X-Has-More"');
    expect(route).toContain('response.headers.set("X-Next-Cursor"');
    expect(route).toContain("NextResponse.json(ticketPage.tickets)");
  });

  it("utilise une recherche ticket FTS paramétrée avec retour arrière contrôlé", () => {
    const service = source("lib/ticket-service.ts");
    const migration = source("prisma/migrations/20260914100000_add_ticket_full_text_search/migration.sql");

    expect(service).toContain("Prisma.sql`");
    expect(service).toContain("plainto_tsquery(");
    expect(service).toContain('process.env.TICKET_FTS_ENABLED === "false"');
    expect(service).toContain('"reference" = ${normalizedQuery}');
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS search_vector tsvector");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS");
    expect(migration).not.toContain("CREATE INDEX CONCURRENTLY");
    expect(migration).toContain("USING GIN (search_vector)");
    expect(migration).toContain("immutable_unaccent");
  });
});
