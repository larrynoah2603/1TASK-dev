import { Priority, RoleCode, TicketStatus, TicketType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canTransitionStatus, isClaimableStatus } from "@/lib/domain";
import { chooseAutoAssignmentCandidate } from "@/lib/routing";
import { automaticAssignmentOutcome, shouldAutomaticallyAssign } from "@/lib/ticket-assignment-service";
import { ProductCapabilityDisabledError, resolveProductCapabilities, resolveQueueAutoAssignmentSetting } from "@/lib/product-policy";

const eligibleMembers = [
  { userId: "agent-eligible", isActive: true, isAvailable: true, skills: ["wifi"], openTicketCount: 0 },
];
const service = { id: "wifi", code: "WIFI", name: "Wi-Fi", ticketType: TicketType.INCIDENT, category: "Réseau", queueId: "queue", priorityDefault: Priority.MEDIUM, keywords: ["wifi"] };

describe("politique d’auto-affectation V1", () => {
  it("bloque la création et la qualification même si la file et un agent sont éligibles", () => {
    const candidate = chooseAutoAssignmentCandidate(eligibleMembers, service.keywords, new Date("2026-10-04T08:00:00Z"));
    expect(candidate?.userId).toBe("agent-eligible");
    const enabled = shouldAutomaticallyAssign(resolveProductCapabilities("v1"), true);
    expect(enabled).toBe(false);
    expect(automaticAssignmentOutcome(enabled ? candidate?.userId : null, TicketStatus.NEW)).toEqual({ status: TicketStatus.NEW, assignedToId: null });
    expect(automaticAssignmentOutcome(enabled ? candidate?.userId : null, TicketStatus.TO_ASSIGN)).toEqual({ status: TicketStatus.TO_ASSIGN, assignedToId: null });
  });

  it("préserve le comportement avancé du profil full", () => {
    const enabled = shouldAutomaticallyAssign(resolveProductCapabilities("full"), true);
    expect(enabled).toBe(true);
    expect(automaticAssignmentOutcome(enabled ? "agent-eligible" : null, TicketStatus.NEW)).toEqual({ status: TicketStatus.ASSIGNED, assignedToId: "agent-eligible" });
    expect(shouldAutomaticallyAssign(resolveProductCapabilities("full"), false)).toBe(false);
  });

  it("refuse l’activation API en V1 et conserve une valeur historique lors d’une autre modification", () => {
    const capabilities = resolveProductCapabilities("v1");
    expect(() => resolveQueueAutoAssignmentSetting(capabilities, true, false)).toThrow(ProductCapabilityDisabledError);
    expect(resolveQueueAutoAssignmentSetting(capabilities, false, true)).toBe(true);
    expect(resolveQueueAutoAssignmentSetting(capabilities, false, false)).toBe(false);
  });

  it("conserve le claim et l’affectation manuelle en V1", () => {
    const capabilities = resolveProductCapabilities("v1");
    expect(capabilities.claim).toBe(true);
    expect(capabilities.manualAssignment).toBe(true);
    expect(isClaimableStatus(TicketStatus.NEW)).toBe(true);
    expect(canTransitionStatus(TicketStatus.TO_ASSIGN, TicketStatus.ASSIGNED, [RoleCode.QUEUE_MANAGER])).toBe(true);
  });

  it("laisse le profil full administrer la valeur persistée", () => {
    const capabilities = resolveProductCapabilities("full");
    expect(resolveQueueAutoAssignmentSetting(capabilities, true, false)).toBe(true);
    expect(resolveQueueAutoAssignmentSetting(capabilities, false, true)).toBe(false);
  });
});
