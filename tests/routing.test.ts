import { describe, expect, it } from "vitest";
import { Priority, TicketType } from "@prisma/client";
import { chooseAutoAssignmentCandidate, routeTicketFromCatalog } from "@/lib/routing";

const services = [
  { id: "wifi", code: "WIFI-CONNECTION", name: "Problème de connexion Wi-Fi", ticketType: TicketType.INCIDENT, category: "Réseau", queueId: "network", priorityDefault: Priority.MEDIUM, keywords: ["wifi", "connexion"] },
  { id: "hardware", code: "MATERIAL-FAILURE", name: "Panne de matériel", ticketType: TicketType.INCIDENT, category: "Matériel", queueId: "hardware", priorityDefault: Priority.HIGH, keywords: ["ordinateur", "panne"] },
];

describe("catalogue et routage", () => {
  it("utilise uniquement le service explicitement choisi dans le catalogue", () => {
    const decision = routeTicketFromCatalog({ serviceCatalogItemId: "wifi", candidates: services });
    expect(decision.queueId).toBe("network");
    expect(decision.type).toBe(TicketType.INCIDENT);
    expect(decision.category).toBe("Réseau");
    expect(decision.priority).toBe(Priority.MEDIUM);
  });

  it("refuse un routage déduit du texte sans service choisi", () => {
    expect(() => routeTicketFromCatalog({ serviceCatalogItemId: "unknown", candidates: services })).toThrow();
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
