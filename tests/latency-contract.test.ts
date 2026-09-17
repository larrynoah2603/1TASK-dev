import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("contrats de stabilisation des chargements serveur", () => {
  it("conserve la configuration admin sectionnée et le résumé utilisateur", () => {
    const admin = source("lib/admin-service.ts");
    const page = source("app/admin/sla/page.tsx");
    const usersPage = source("app/admin/users/page.tsx");

    expect(admin).toContain("getAdminConfiguration(");
    expect(admin).toContain("sections?: readonly AdminConfigurationSection[]");
    expect(admin).toContain('measureServerOperation("admin.configuration"');
    expect(admin).toContain("getAdminUserSummary");
    expect(page).toContain('["sla"]');
    expect(usersPage).toContain('["users"]');
  });

  it("utilise les compteurs tickets ciblés pour l’inbox", () => {
    const ticketService = source("lib/ticket-query-service.ts");
    const inbox = source("app/(app)/inbox/page.tsx");

    expect(ticketService).toContain("getOperationalTicketSummary");
    expect(ticketService).toContain('measureServerOperation("tickets.list"');
    expect(inbox).toContain("getOperationalTicketSummary(user)");
    expect(inbox).toContain('sla: "attention"');
    expect(inbox).toContain("take: 6");
  });

  it("ne charge pas le portefeuille complet du dashboard responsable", () => {
    const production = source("lib/production-service.ts");
    const responsible = source("app/(app)/dashboard/responsible/page.tsx");
    const visuals = source("components/dashboard-visuals.tsx");

    expect(production).toContain("getMissionPortfolioSummary");
    expect(production).toContain("take?: number");
    expect(responsible).toContain("getMissionPortfolioSummary(user)");
    expect(responsible).toContain("listMissionsForViewer(user, { take: 12 })");
    expect(visuals).toContain("missionSummary");
  });

  it("fournit un état de chargement aux deux espaces dynamiques", () => {
    expect(source("app/(app)/loading.tsx")).toContain('aria-busy="true"');
    expect(source("app/admin/loading.tsx")).toContain('aria-busy="true"');
    expect(source("app/globals.css")).toContain(".loading-grid");
  });
});
