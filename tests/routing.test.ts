import { describe, expect, it } from "vitest";
import { Priority, TicketType } from "@prisma/client";
import { chooseAutoAssignmentCandidate, matchCatalogService, normalizeRoutingText, routeTicketFromCatalog } from "@/lib/routing";

const services = [
  { id: "wifi", code: "WIFI-CONNECTION", name: "Problème de connexion Wi-Fi", description: "Incident de connexion au réseau Wi-Fi professionnel.", ticketType: TicketType.INCIDENT, category: "Réseau", queueId: "network", priorityDefault: Priority.MEDIUM, keywords: ["wifi", "wi-fi", "connexion", "sans fil"] },
  { id: "hardware", code: "MATERIAL-FAILURE", name: "Panne de matériel", description: "Ordinateur, écran ou périphérique en panne.", ticketType: TicketType.INCIDENT, category: "Matériel", queueId: "hardware", priorityDefault: Priority.HIGH, keywords: ["ordinateur", "écran", "panne"] },
  { id: "triage", code: "TRIAGE-IT", name: "Besoin informatique à qualifier", ticketType: TicketType.SERVICE_REQUEST, category: "À qualifier", queueId: "triage", priorityDefault: Priority.MEDIUM, keywords: ["informatique", "problème"] },
];

describe("catalogue et routage", () => {
  it("utilise le service explicitement choisi et sa file catalogue", () => {
    const decision = routeTicketFromCatalog({ serviceCatalogItemId: "wifi", candidates: services });
    expect(decision).toMatchObject({ queueId: "network", type: TicketType.INCIDENT, category: "Réseau", priority: Priority.MEDIUM, matchedBy: "catalog-id" });
  });

  it("refuse un identifiant catalogue inconnu", () => {
    expect(() => routeTicketFromCatalog({ serviceCatalogItemId: "unknown", candidates: services })).toThrow();
  });

  it("normalise accents, ponctuation et espaces", () => {
    expect(normalizeRoutingText("  ÉCRAN / Wi-Fi !  ")).toBe("ecran wi fi");
  });

  it("route les mots-clés Wi-Fi vers le réseau", () => {
    expect(matchCatalogService({ requestedService: "Impossible de me connecter au Wi-Fi", candidates: services })).toMatchObject({ serviceCatalogItemId: "wifi", queueId: "network", matchedBy: "keyword" });
  });

  it("route une panne d’écran ou d’ordinateur vers le matériel", () => {
    expect(matchCatalogService({ title: "Mon écran ou mon ordinateur est en panne", candidates: services })).toMatchObject({ serviceCatalogItemId: "hardware", queueId: "hardware" });
  });

  it("ne devine pas un besoin inconnu", () => {
    expect(matchCatalogService({ requestedService: "J’ai un besoin particulier mais je ne sais pas quel service contacter", candidates: services })).toBeNull();
  });

  it("ne choisit pas entre deux services ambigus", () => {
    const duplicate = { ...services[0], id: "wifi-2", code: "WIFI-GUEST", queueId: "guest" };
    expect(matchCatalogService({ title: "Connexion wifi impossible", candidates: [...services, duplicate] })).toBeNull();
  });

  it("exclut toujours les entrées TRIAGE du classement automatique", () => {
    expect(matchCatalogService({ title: "Problème informatique", candidates: services })).toBeNull();
  });

  it("choisit l’agent actif avec la charge la plus faible", () => {
    const chosen = chooseAutoAssignmentCandidate([
      { userId: "agent-b", isActive: true, isAvailable: true, skills: ["wifi"], openTicketCount: 4 },
      { userId: "agent-a", isActive: true, isAvailable: true, skills: ["wifi"], openTicketCount: 1 },
      { userId: "agent-c", isActive: true, isAvailable: false, skills: ["wifi"], openTicketCount: 0 },
    ], ["wifi"]);
    expect(chosen?.userId).toBe("agent-a");
  });
});

describe("contrats de persistance du routage", () => {
  it("repose sur le filtrage serveur des services et files actifs du département cible", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(new URL("../lib/ticket-service.ts", import.meta.url), "utf8");
    expect(source).toContain("isActive: true");
    expect(source).toContain("departmentId: targetDepartment?.id");
    expect(source).toContain('routingMode = "AUTO_CATALOG"');
    expect(source).toContain('routingMode = "TRIAGE"');
  });

  it("qualifie et réoriente atomiquement avec le SLA et les événements adaptés", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(new URL("../lib/ticket-workflow-service.ts", import.meta.url), "utf8");
    expect(source).toContain("serviceCatalogItemId: selectedService.id");
    expect(source).toContain("slaId: selectedService.sla?.id");
    expect(source).toContain("calculateSlaDeadlines");
    expect(source).toContain("TicketEventType.QUALIFIED");
    expect(source).toContain("TicketEventType.QUEUE_CHANGED");
    expect(source).toContain("recordAssignment(tx");
  });
});
