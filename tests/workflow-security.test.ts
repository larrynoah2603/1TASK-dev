import { describe, expect, it } from "vitest";
import { RoleCode, TicketStatus } from "@prisma/client";
import {
  assignmentSchema,
  escalationRuleAdminSchema,
  transitionTicketSchema,
} from "@/lib/validation";
import { canTransitionStatus } from "@/lib/domain";

describe("garde-fous du workflow ticketing", () => {
  it("exige un motif pour toute affectation manuelle", () => {
    expect(assignmentSchema.safeParse({ assignedToId: "c123456789012345678901234" }).success).toBe(false);
    expect(assignmentSchema.safeParse({ assignedToId: "c123456789012345678901234", reason: "Réaffectation validée par le responsable" }).success).toBe(true);
  });

  it("ne valide qu’une cible d’escalade à la fois", () => {
    const base = { name: "Alerte", thresholdPercent: 80, targetRole: RoleCode.QUEUE_MANAGER, isActive: true, reason: "Règle métier documentée" };
    expect(escalationRuleAdminSchema.safeParse({ ...base }).success).toBe(false);
    expect(escalationRuleAdminSchema.safeParse({ ...base, queueId: "c123456789012345678901234" }).success).toBe(true);
    expect(escalationRuleAdminSchema.safeParse({ ...base, queueId: "c123456789012345678901234", serviceItemId: "c123456789012345678901235" }).success).toBe(false);
  });

  it("n’autorise pas un saut direct vers la résolution", () => {
    expect(canTransitionStatus(TicketStatus.NEW, TicketStatus.RESOLUTION_PENDING, [RoleCode.FUNCTIONAL_ADMIN])).toBe(false);
    expect(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.RESOLUTION_PENDING, [RoleCode.AGENT])).toBe(true);
  });

  it("conserve les champs obligatoires du blocage côté contrat serveur", () => {
    expect(transitionTicketSchema.safeParse({ status: TicketStatus.BLOCKED }).success).toBe(false);
    expect(transitionTicketSchema.safeParse({ status: TicketStatus.BLOCKED, blockReason: "MISSING_INFORMATION", blockDetails: "Informations complémentaires attendues." }).success).toBe(true);
  });
});
