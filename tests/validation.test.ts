import { describe, expect, it } from "vitest";
import { calendarAdminSchema, createTicketSchema, holidayAdminSchema, organizationAdminSchema, ticketListQuerySchema } from "@/lib/validation";

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

  it("valide une organisation et un calendrier SLA configurables", () => {
    const organization = organizationAdminSchema.safeParse({ code: "BIOS-MADA", name: "BIOS Expertise Madagascar", isActive: true, reason: "Création du périmètre organisationnel." });
    const calendar = calendarAdminSchema.safeParse({ code: "BIOS-MADA-OUVRE", name: "Horaires ouvrés Madagascar", organizationId: "c123456789012345678901234", timezone: "Indian/Antananarivo", workingDays: [1, 2, 3, 4, 5], workdayStartMinute: 480, workdayEndMinute: 1020, isActive: true, reason: "Configuration des horaires de service." });
    expect(organization.success).toBe(true);
    expect(calendar.success).toBe(true);
  });

  it("refuse un calendrier dont la fin précède le début et un jour férié sans motif", () => {
    const calendar = calendarAdminSchema.safeParse({ code: "BAD-CALENDAR", name: "Calendrier invalide", organizationId: "c123456789012345678901234", timezone: "Indian/Antananarivo", workingDays: [1], workdayStartMinute: 1_020, workdayEndMinute: 480, isActive: true, reason: "Configuration volontairement invalide." });
    const holiday = holidayAdminSchema.safeParse({ date: "2026-12-25", name: "Noël", reason: "court" });
    expect(calendar.success).toBe(false);
    expect(holiday.success).toBe(false);
  });

  it("accepte les filtres de file opérationnelle", () => {
    const result = ticketListQuerySchema.parse({
      scope: "team",
      priority: "CRITICAL",
      sla: "attention",
      take: "20",
      cursor: "eyJpZCI6ImMxMjMiLCJzb3J0IjoidXBkYXRlZF9kZXNjIn0",
    });
    expect(result.scope).toBe("team");
    expect(result.priority).toBe("CRITICAL");
    expect(result.sla).toBe("attention");
    expect(result.take).toBe(20);
    expect(result.cursor).toBe("eyJpZCI6ImMxMjMiLCJzb3J0IjoidXBkYXRlZF9kZXNjIn0");
  });
});
