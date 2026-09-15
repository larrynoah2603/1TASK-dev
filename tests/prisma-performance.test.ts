import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("contrats de performance Prisma", () => {
  it("agrège les statistiques des files sans charger chaque ticket en mémoire", () => {
    const service = source("lib/ticket-service.ts");
    const start = service.indexOf("export async function listVisibleQueues");
    const end = service.indexOf("const MAX_TICKET_ATTACHMENT_BYTES", start);
    const implementation = service.slice(start, end);

    expect(implementation).toContain("queueId: { in: visibleQueueIds }");
    expect(implementation).toContain('by: ["queueId", "status", "priority"]');
    expect(implementation).toContain('by: ["queueId"]');
    expect(implementation).not.toContain("const visibleTickets");
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

  it("borne les historiques incorporés au détail d'un ticket", () => {
    const service = source("lib/ticket-service.ts");
    const start = service.indexOf("async function getTicketForViewerInternal");
    const end = service.indexOf("export function canActorClaimTicket", start);
    const implementation = service.slice(start, end);

    expect(implementation).toContain("take: TICKET_MESSAGE_WINDOW");
    expect(implementation).toContain("take: TICKET_ASSIGNMENT_WINDOW");
    expect(implementation).toContain("take: TICKET_EVENT_WINDOW");
    expect(implementation).toContain("messages: ticket.messages.toReversed()");
  });

  it("utilise des projections légères pour les filtres portefeuille de la boîte agent", () => {
    const page = source("app/(app)/inbox/page.tsx");
    const production = source("lib/production-service.ts");
    const start = production.indexOf("export async function listTicketPortfolioFilterOptions");
    const end = production.indexOf("export async function getDossierForViewer", start);
    const implementation = production.slice(start, end);

    expect(page).toContain("listTicketPortfolioFilterOptions(user)");
    expect(page).not.toContain("listDossiersForViewer(user), listMissionsForViewer(user)");
    expect(implementation).toContain("select:");
    expect(implementation).not.toContain("worklog");
    expect(implementation).not.toContain("_count");
  });

  it("ne calcule pas les statistiques des files pour afficher un simple filtre", () => {
    const page = source("app/(app)/inbox/page.tsx");
    const service = source("lib/ticket-service.ts");
    const start = service.indexOf("export async function listVisibleQueueFilterOptions");
    const end = service.indexOf("const MAX_TICKET_ATTACHMENT_BYTES", start);
    const implementation = service.slice(start, end);

    expect(page).toContain("listVisibleQueueFilterOptions(user)");
    expect(page).not.toContain("listVisibleQueues(user)");
    expect(implementation).not.toContain("groupBy");
    expect(implementation).not.toContain("_count");
  });

  it("mesure séparément chaque chargement critique de la boîte agent", () => {
    const page = source("app/(app)/inbox/page.tsx");

    for (const operation of [
      "inbox.queue_filters",
      "inbox.ticket_page",
      "inbox.summary",
      "inbox.sla_watch",
      "inbox.portfolio_filters",
    ]) {
      expect(page).toContain(`measureServerOperation("${operation}"`);
    }
  });

  it("réduit les six compteurs du résumé opérationnel à quatre agrégations", () => {
    const service = source("lib/ticket-service.ts");
    const start = service.indexOf("export async function getOperationalTicketSummary");
    const end = service.indexOf("export function getTicketForViewer", start);
    const implementation = service.slice(start, end);

    expect(implementation.match(/prisma\.ticket\.groupBy\(/g)).toHaveLength(2);
    expect(implementation.match(/prisma\.ticket\.count\(/g)).toHaveLength(2);
    expect(implementation).toContain('by: ["status"]');
    expect(implementation).toContain('by: ["assignedToId"]');
  });
});
