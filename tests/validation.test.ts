import { describe, expect, it } from "vitest";
import { createTicketSchema, ticketListQuerySchema } from "@/lib/validation";

describe("contrats de création et de filtrage", () => {
  it("ignore toute tentative de fournir un routage hors catalogue", () => {
    const result = createTicketSchema.safeParse({
      serviceCatalogItemId: "c123456789012345678901234",
      title: "Demande de support",
      description: "Une description suffisamment détaillée pour le ticket.",
      queueId: "queue-forced-by-client",
    });
    expect(result.success).toBe(false);
  });

  it("accepte les filtres de file opérationnelle", () => {
    const result = ticketListQuerySchema.parse({
      scope: "team",
      priority: "CRITICAL",
      sla: "attention",
      take: "20",
    });
    expect(result.scope).toBe("team");
    expect(result.priority).toBe("CRITICAL");
    expect(result.sla).toBe("attention");
    expect(result.take).toBe(20);
  });
});
