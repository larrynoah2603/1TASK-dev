import { describe, expect, it } from "vitest";
import { Impact, Priority, RoleCode, TicketStatus, Urgency } from "@prisma/client";
import { calculatePriorityFromImpactUrgency, canTransitionStatus, getV1WorkflowPresentation, isClaimableStatus, v1RequesterAllowedNextStatuses } from "@/lib/domain";

describe("workflow des tickets", () => {
  it("simplifie la présentation V1 en quatre étapes publiques", () => {
    expect(getV1WorkflowPresentation(TicketStatus.NEW)).toEqual({ step: "RECEIVED", label: "Reçue", position: 0 });
    expect(getV1WorkflowPresentation(TicketStatus.TO_ASSIGN)).toEqual({ step: "RECEIVED", label: "Reçue", position: 0 });
    expect(getV1WorkflowPresentation(TicketStatus.ASSIGNED)).toEqual({ step: "IN_PROGRESS", label: "En traitement", position: 1 });
    expect(getV1WorkflowPresentation(TicketStatus.BLOCKED)).toEqual({ step: "IN_PROGRESS", label: "En attente", position: 1 });
    expect(getV1WorkflowPresentation(TicketStatus.RESOLUTION_PENDING)).toEqual({ step: "RESOLUTION", label: "Résolution proposée", position: 2 });
    expect(getV1WorkflowPresentation(TicketStatus.CLOSED)).toEqual({ step: "CLOSED", label: "Fermée", position: 3 });
    expect(getV1WorkflowPresentation(TicketStatus.CANCELLED).label).toBe("Annulée");
  });

  it("borne le demandeur V1 à annuler avant traitement puis confirmer ou rouvrir une résolution", () => {
    expect(v1RequesterAllowedNextStatuses(TicketStatus.NEW)).toEqual([TicketStatus.CANCELLED]);
    expect(v1RequesterAllowedNextStatuses(TicketStatus.TO_QUALIFY)).toEqual([TicketStatus.CANCELLED]);
    expect(v1RequesterAllowedNextStatuses(TicketStatus.TO_ASSIGN)).toEqual([TicketStatus.CANCELLED]);
    expect(v1RequesterAllowedNextStatuses(TicketStatus.ASSIGNED)).toEqual([]);
    expect(v1RequesterAllowedNextStatuses(TicketStatus.IN_PROGRESS)).toEqual([]);
    expect(v1RequesterAllowedNextStatuses(TicketStatus.RESOLUTION_PENDING)).toEqual([
      TicketStatus.CLOSED,
      TicketStatus.REOPENED,
    ]);
  });

  it("autorise le demandeur à confirmer ou refuser une résolution", () => {
    expect(canTransitionStatus(TicketStatus.RESOLUTION_PENDING, TicketStatus.CLOSED, [RoleCode.REQUESTER], true)).toBe(true);
    expect(canTransitionStatus(TicketStatus.RESOLUTION_PENDING, TicketStatus.REOPENED, [RoleCode.REQUESTER], true)).toBe(true);
    expect(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED, [RoleCode.REQUESTER], true)).toBe(false);
  });

  it("exige une transition progressive pour l’équipe de traitement", () => {
    expect(canTransitionStatus(TicketStatus.NEW, TicketStatus.TO_QUALIFY, [RoleCode.AGENT])).toBe(true);
    expect(canTransitionStatus(TicketStatus.NEW, TicketStatus.CLOSED, [RoleCode.AGENT])).toBe(false);
    expect(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.BLOCKED, [RoleCode.AGENT])).toBe(true);
    expect(canTransitionStatus(TicketStatus.TO_QUALIFY, TicketStatus.IN_PROGRESS, [RoleCode.AGENT])).toBe(false);
  });

  it("calcule la priorité à partir de l’impact et de l’urgence", () => {
    expect(calculatePriorityFromImpactUrgency(Impact.LOW, Urgency.LOW)).toBe(Priority.LOW);
    expect(calculatePriorityFromImpactUrgency(Impact.MEDIUM, Urgency.MEDIUM)).toBe(Priority.MEDIUM);
    expect(calculatePriorityFromImpactUrgency(Impact.HIGH, Urgency.HIGH)).toBe(Priority.HIGH);
    expect(calculatePriorityFromImpactUrgency(Impact.CRITICAL, Urgency.HIGH)).toBe(Priority.CRITICAL);
  });

  it("limite le Claim aux quatre statuts contractuels", () => {
    expect(isClaimableStatus(TicketStatus.NEW)).toBe(true);
    expect(isClaimableStatus(TicketStatus.TO_QUALIFY)).toBe(true);
    expect(isClaimableStatus(TicketStatus.TO_ASSIGN)).toBe(true);
    expect(isClaimableStatus(TicketStatus.REOPENED)).toBe(true);
    expect(isClaimableStatus(TicketStatus.ASSIGNED)).toBe(false);
    expect(isClaimableStatus(TicketStatus.IN_PROGRESS)).toBe(false);
    expect(isClaimableStatus(TicketStatus.BLOCKED)).toBe(false);
    expect(isClaimableStatus(TicketStatus.RESOLUTION_PENDING)).toBe(false);
    expect(isClaimableStatus(TicketStatus.CLOSED)).toBe(false);
  });
});
