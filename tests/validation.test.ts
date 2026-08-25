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

  it("accepte une demande libre avec un département cible", () => {
    const result = createTicketSchema.safeParse({
      requestedService: "Création d’un compte client",
      targetDepartmentId: "c123456789012345678901234",
      type: "SERVICE_REQUEST",
      title: "Créer un compte client",
      description: "Le nouveau collaborateur doit disposer d’un compte client pour commencer sa mission.",
      confidential: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepte un token d’idempotence stable pour les retries", () => {
    const result = createTicketSchema.safeParse({
      creationIdempotencyToken: "web-1234567890abcdef",
      requestedService: "Création d’un compte client",
      targetDepartmentId: "c123456789012345678901234",
      title: "Créer un compte client",
      description: "Le nouveau collaborateur doit disposer d’un compte client pour commencer sa mission.",
    });
    expect(result.success).toBe(true);
  });

  it("refuse un token d’idempotence trop court ou contenant des caractères ambigus", () => {
    const result = createTicketSchema.safeParse({
      creationIdempotencyToken: "bad token",
      requestedService: "Création d’un compte client",
      targetDepartmentId: "c123456789012345678901234",
      title: "Créer un compte client",
      description: "Le nouveau collaborateur doit disposer d’un compte client pour commencer sa mission.",
    });
    expect(result.success).toBe(false);
  });

  it("refuse une demande libre sans département cible", () => {
    const result = createTicketSchema.safeParse({
      requestedService: "Création d’un compte client",
      title: "Créer un compte client",
      description: "Le nouveau collaborateur doit disposer d’un compte client pour commencer sa mission.",
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
