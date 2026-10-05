import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Priority, TicketType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { matchCatalogService, routeTicketFromCatalog } from "@/lib/routing";
import { createV1TicketSchema } from "@/lib/validation";
import { isAuthorizedGlobalTriageOrigin } from "@/lib/ticket-workflow-service";

const id = "c123456789012345678901234";
const base = { title: "Connexion Wi-Fi impossible", description: "La connexion au réseau professionnel échoue depuis ce matin." };
const services = [
  { id: "wifi", code: "WIFI", name: "Connexion Wi-Fi", description: "Accès au réseau sans fil", ticketType: TicketType.INCIDENT, category: "Réseau", queueId: "network", priorityDefault: Priority.HIGH, keywords: ["wifi", "connexion"] },
  { id: "screen", code: "SCREEN", name: "Écran en panne", description: "Matériel et écrans", ticketType: TicketType.INCIDENT, category: "Matériel", queueId: "hardware", priorityDefault: Priority.MEDIUM, keywords: ["écran"] },
];

describe("création V1 à trois champs", () => {
  it("ne pré-valide pas puis ne revalide pas le payload V1 transformé", () => {
    const route = readFileSync(resolve(process.cwd(), "app/api/tickets/route.ts"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "lib/ticket-service.ts"), "utf8");
    expect(route).toContain("const body = await request.json();");
    expect(route).not.toContain("createV1TicketSchema");
    expect(route).not.toContain("createTicketSchema.parse");
    expect(service).toContain('const parsed = (v1Profile ? createV1TicketSchema : createTicketSchema).parse(input);');
  });

  it("accepte objet et description avec un service facultatif et applique les défauts serveur", () => {
    expect(createV1TicketSchema.parse(base)).toMatchObject({ confidential: false, impact: "MEDIUM", urgency: "MEDIUM" });
    expect(createV1TicketSchema.parse({ ...base, serviceCatalogItemId: id }).serviceCatalogItemId).toBe(id);
  });

  it.each([
    ["requestedService", "Besoin réseau"], ["targetDepartmentId", id], ["impact", "HIGH"],
    ["urgency", "HIGH"], ["type", "INCIDENT"], ["legalDueAt", "2026-10-10"],
    ["dossierId", id], ["missionId", id], ["confidential", true],
  ])("rejette explicitement le champ V1 interdit %s", (field, value) => {
    expect(createV1TicketSchema.safeParse({ ...base, [field]: value }).success).toBe(false);
  });

  it("route un service sélectionné et conserve sa priorité catalogue", () => {
    expect(routeTicketFromCatalog({ serviceCatalogItemId: "wifi", candidates: services })).toMatchObject({
      queueId: "network", priority: Priority.HIGH, matchedBy: "catalog-id",
    });
  });

  it("réutilise le matching conservateur sur objet et description", () => {
    expect(matchCatalogService({ ...base, candidates: services })).toMatchObject({ serviceCatalogItemId: "wifi" });
    const ambiguous = [...services, { ...services[0], id: "wifi-2", code: "WIFI-2", queueId: "other" }];
    expect(matchCatalogService({ ...base, candidates: ambiguous })).toBeNull();
    expect(matchCatalogService({ title: "Demande particulière", description: "Aucune correspondance avec les services proposés", candidates: services })).toBeNull();
  });

  it("borne la qualification transverse à la file globale et à la capacité explicite", () => {
    expect(isAuthorizedGlobalTriageOrigin("global", "global", true)).toBe(true);
    expect(isAuthorizedGlobalTriageOrigin("departmental", "global", true)).toBe(false);
    expect(isAuthorizedGlobalTriageOrigin("global", "global", false)).toBe(false);
    expect(isAuthorizedGlobalTriageOrigin("global", null, true)).toBe(false);
  });
});
