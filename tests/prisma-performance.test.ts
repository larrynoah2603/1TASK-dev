import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("contrats de performance Prisma", () => {
  it("indexe le scope demandeur dans l’ordre de pagination par défaut", () => {
    const schema = source("prisma/schema.prisma");
    const migration = source("prisma/migrations/20260927090000_add_requester_ticket_list_index/migration.sql");

    expect(schema).toContain("@@index([requesterId, updatedAt, id])");
    expect(migration).toContain('ON "Ticket"("requesterId", "updatedAt", "id")');
  });

  it("agrège les statistiques des files sans charger chaque ticket en mémoire", () => {
    const service = source("lib/ticket-queue-service.ts");
    const start = service.indexOf("export async function listVisibleQueues");
    const end = service.length;
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
    const service = source("lib/ticket-query-service.ts");
    const route = source("app/api/tickets/route.ts");

    expect(service).toContain("ticketCursorBoundary(cursor)");
    expect(service).not.toContain("cursor: { id: cursor.id }");
    expect(service).toContain("updatedAt: { lt: updatedAt }");
    expect(service).toContain("createdAt: { gt: createdAt }");
    expect(service).toContain("take: cursor || !includeTotal ? pageSize + 1 : pageSize");
    expect(service).toContain("nextCursor:");
    expect(service).toContain("hasMore,");
    expect(service).toContain("totalPages:");
    expect(service).toContain("decoded.sort !== sort");
    expect(route).toContain('response.headers.set("X-Has-More"');
    expect(route).toContain('response.headers.set("X-Next-Cursor"');
    expect(route).toContain("NextResponse.json(ticketPage.tickets.map(toTicketListItemDTO))");
    expect(route).toContain("{ includeTotal: false }");
  });

  it("utilise une recherche ticket FTS paramétrée avec retour arrière contrôlé", () => {
    const service = source("lib/ticket-query-service.ts");
    const migration = source("prisma/migrations/20260914100000_add_ticket_full_text_search/migration.sql");

    expect(service).toContain("Prisma.sql`");
    expect(service).toContain("plainto_tsquery(");
    expect(service).toContain("readServerEnvironment().TICKET_FTS_ENABLED");
    expect(service).toContain('"reference" = ${normalizedQuery}');
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS search_vector tsvector");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS");
    expect(migration).not.toContain("CREATE INDEX CONCURRENTLY");
    expect(migration).toContain("USING GIN (search_vector)");
    expect(migration).toContain("immutable_unaccent");
  });

  it("borne les historiques incorporés au détail d'un ticket", () => {
    const service = source("lib/ticket-detail-service.ts");
    const start = service.indexOf("async function getTicketForViewerInternal");
    const end = service.length;
    const implementation = service.slice(start, end);

    expect(implementation).toContain("take: TICKET_MESSAGE_WINDOW");
    expect(implementation).toContain("take: TICKET_ASSIGNMENT_WINDOW");
    expect(implementation).toContain("take: TICKET_EVENT_WINDOW");
    expect(implementation).toContain("messages: [...ticket.messages].reverse()");
    expect(implementation).not.toContain("ticket.messages.toReversed()");
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
    const service = source("lib/ticket-queue-service.ts");
    const start = service.indexOf("export async function listVisibleQueueFilterOptions");
    const end = service.length;
    const implementation = service.slice(start, end);

    expect(page).toContain("listVisibleQueueFilterOptions(user)");
    expect(page).not.toContain("listVisibleQueues(user)");
    expect(implementation).not.toContain("groupBy");
    expect(implementation).not.toContain("_count");
  });

  it("mesure chaque chargement de la boîte agent et streame les données secondaires", () => {
    const page = source("app/(app)/inbox/page.tsx");

    for (const operation of [
      "inbox.queue_filters",
      "inbox.ticket_page",
      "inbox.summary",
      "inbox.sla_watch",
      "inbox.portfolio_filters",
    ]) {
      expect(page).toContain(`"${operation}"`);
    }
    expect(page).toContain("<Suspense fallback={<InboxKpiSkeleton />}>");
    expect(page).toContain("<InboxKpis user={user} />");
    expect(page).toContain("<Suspense fallback={<InboxWatchSkeleton />}>");
    expect(page).toContain("<InboxSlaWatch user={user} />");
  });

  it("réduit les six compteurs du résumé opérationnel à quatre agrégations", () => {
    const service = source("lib/ticket-query-service.ts");
    const start = service.indexOf("export async function getOperationalTicketSummary");
    const end = service.length;
    const implementation = service.slice(start, end);

    expect(implementation.match(/prisma\.ticket\.groupBy\(/g)).toHaveLength(2);
    expect(implementation.match(/prisma\.ticket\.count\(/g)).toHaveLength(2);
    expect(implementation).toContain('by: ["status"]');
    expect(implementation).toContain('by: ["assignedToId"]');
  });

  it("n'exécute pas de count exact pour les listes qui ne consomment que les tickets", () => {
    const service = source("lib/ticket-query-service.ts");
    const start = service.indexOf("export function listVisibleTicketsPage");
    const end = service.indexOf("export async function getRequesterTicketSummary", start);
    const implementation = service.slice(start, end);

    expect(implementation).toContain("includeTotal ? prisma.ticket.count({ where }) : Promise.resolve(null)");
    expect(implementation).toContain("listVisibleTicketsPageInternal(actor, options, false)");
    expect(implementation).toContain('"tickets.list_without_total"');
  });

  it("agrège les compteurs du portefeuille missions par statut", () => {
    const service = source("lib/production-service.ts");
    const start = service.indexOf("export async function getMissionPortfolioSummary");
    const end = service.indexOf("export async function listMissionsForViewer", start);
    const implementation = service.slice(start, end);

    expect(implementation).toContain('prisma.mission.groupBy({ by: ["status"]');
    expect(implementation).toContain("missionsByStatus.reduce");
    expect(implementation.match(/prisma\.mission\.count\(/g)).toHaveLength(1);
  });

  it("pagine les worklogs de mission sans modifier le corps JSON historique", () => {
    const service = source("lib/production-service.ts");
    const route = source("app/api/production/missions/[id]/worklogs/route.ts");
    const start = service.indexOf("export async function listMissionWorklogsPage");
    const end = service.indexOf("export async function completeMission", start);
    const implementation = service.slice(start, end);

    expect(implementation).toContain("take: pageSize + 1");
    expect(implementation).toContain("cursor: { id: options.cursor }, skip: 1");
    expect(implementation).toContain('orderBy: [{ startedAt: "desc" }, { id: "desc" }]');
    expect(implementation).toContain("rows.length > pageSize");
    expect(implementation).toContain("worklogs.at(-1)?.id");
    expect(implementation).not.toContain(".count(");
    expect(route).toContain('searchParams.get("limit")');
    expect(route).toContain('searchParams.get("cursor")');
    expect(route).toContain('response.headers.set("X-Has-More"');
    expect(route).toContain('response.headers.set("X-Next-Cursor"');
    expect(route).toContain("NextResponse.json({ worklogs: page.worklogs })");
  });

  it("utilise des projections spécialisées pour les détails client et dossier", () => {
    const service = source("lib/production-service.ts");
    const dossier = service.slice(
      service.indexOf("export async function getDossierForViewer"),
      service.indexOf("export async function createClientAccount"),
    );
    const client = service.slice(
      service.indexOf("export async function getClientForViewer"),
      service.indexOf("export async function getAssetForViewer"),
    );

    expect(dossier).toContain("select:");
    expect(dossier).not.toContain("include:");
    expect(dossier).toContain("_count: { select: { tickets: { where: ticketVisibility }, worklogs: true } }");
    expect(dossier).toMatch(/tickets:\\s*\\{\\s*where:\\s*ticketVisibility,/);
    expect(client).toContain("visibleTicketWhere(actor)");
    expect(client).toContain("select:");
    expect(client).not.toContain("include:");
    expect(client).toContain("_count: { _all: true }");
  });

  it("projette uniquement les champs nécessaires au moniteur SLA", () => {
    const monitor = source("lib/sla-monitor.ts");
    const implementation = monitor.slice(monitor.indexOf("export async function runSlaMonitor"));

    expect(implementation).toContain("select: {");
    expect(implementation).not.toContain("include:");
    expect(implementation).toContain("assignedToId: true");
    expect(implementation).toContain("assignedToId: ticket.assignedToId");
    expect(implementation).not.toContain("ticket.assignedTo?.id");
    expect(implementation).toContain("alertThresholds: true");
  });

  it("borne les référentiels imbriqués du contexte d'autorisation", () => {
    const auth = source("lib/server-auth.ts");
    const implementation = auth.slice(
      auth.indexOf("const userContextInclude"),
      auth.indexOf("export type UserContext"),
    );

    expect(implementation).toContain("department: { select:");
    expect(implementation).toContain("roleAssignments: {");
    expect(implementation).toContain("permissions: {");
    expect(implementation).toContain("permission: { select:");
    expect(implementation).toContain("description: true");
    expect(implementation).toContain("satisfies Prisma.UserInclude");
    expect(implementation).not.toContain("permission: { select: { id: true, code: true, name: true }");
    expect(implementation).toContain("portfolioKey: true");
    expect(implementation).toContain("members: { select: { userId: true } }");
    expect(implementation).toContain("teamMemberships: {");
    expect(implementation).not.toContain("department: true");
  });
  it("keeps ticket filter navigation client-side and removes shell notification counts", () => {
    const filters = source("components/ticket-filters.tsx");
    const appShell = source("components/app-shell.tsx");
    const adminShell = source("components/admin-shell.tsx");
    const center = source("components/notification-center.tsx");

    expect(filters).toContain('"use client"');
    expect(filters).toContain("router.replace(");
    expect(filters).toContain("useTransition()");
    expect(filters).not.toContain('method="get"');
    expect(appShell).not.toContain("prisma.notification.count");
    expect(adminShell).not.toContain("prisma.notification.count");
    expect(center).toContain("void loadNotifications()");
  });

  it("uses lightweight personal queue filters on /tickets", () => {
    const page = source("app/(app)/tickets/page.tsx");
    const service = source("lib/ticket-queue-service.ts");
    const start = service.indexOf("export async function listTicketQueueFilterOptions");
    const implementation = service.slice(start);

    expect(page).toContain("listTicketQueueFilterOptions(user, { includePersonal: true })");
    expect(page).not.toContain("listVisibleQueues(user, { includePersonal: true })");
    expect(implementation).toContain("personalQueueIds.has(queue.id)");
    expect(implementation).not.toContain("groupBy");
    expect(implementation).not.toContain("_count");
  });

  it("lazy-loads ticket links and attachments independently", () => {
    const panels = source("components/ticket-advanced-panels.tsx");

    expect(panels).toContain('onOpen={() => void loadLinks()}');
    expect(panels).toContain('onOpen={() => void loadAttachments()}');
    expect(panels).not.toContain("const loadLists");
    expect(panels).toContain('if (key === "link")');
    expect(panels).toContain("await loadLinks(true)");
  });
});
