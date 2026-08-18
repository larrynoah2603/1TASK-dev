import { describe, expect, it } from "vitest";
import { RoleCode, ScopeType, TicketStatus } from "@prisma/client";
import { errorResponse } from "@/lib/http";
import { AuthenticationError, AuthorizationError } from "@/lib/server-auth";
import { canConfirmResolution, canPostInternalMessage, canReopenResolution, canTransitionStatus } from "@/lib/domain";
import { canViewTicket } from "@/lib/access-control";

describe("contrat des réponses d’accès serveur", () => {
  it("renvoie 401 quand la session Entra est absente", async () => {
    const response = errorResponse(new AuthenticationError());
    expect(response.status).toBe(401);
    expect((await response.json()).error).toContain("Authentification");
  });

  it("renvoie 403 quand la session existe mais que le périmètre interdit l’action", async () => {
    const response = errorResponse(new AuthorizationError());
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("Accès");
  });

  it("ne transforme pas un identifiant de ticket connu en droit d’accès", () => {
    expect(canViewTicket(
      { id: "intrus", departmentId: "dsi", roles: [{ code: RoleCode.REQUESTER }] },
      {
        requesterId: "demandeur",
        assignedToId: "agent",
        queueId: "queue",
        departmentId: "dsi",
        confidential: false,
        teamIds: ["team"],
      },
    )).toBe(false);
  });

  it("refuse au lecteur reporting et à l’administrateur technique les mutations de workflow", () => {
    expect(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.BLOCKED, [RoleCode.TECHNICAL_ADMIN])).toBe(false);
    expect(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.BLOCKED, [RoleCode.REPORTING_READER])).toBe(false);
    expect(canPostInternalMessage([RoleCode.TECHNICAL_ADMIN])).toBe(false);
  });

  it("ne laisse pas un agent clôturer directement une résolution", () => {
    expect(canConfirmResolution([RoleCode.AGENT], false)).toBe(false);
    expect(canReopenResolution([RoleCode.AGENT], false)).toBe(false);
    expect(canConfirmResolution([RoleCode.REQUESTER], true)).toBe(true);
    expect(canReopenResolution([RoleCode.FUNCTIONAL_ADMIN], false)).toBe(true);
    expect(canTransitionStatus(TicketStatus.RESOLUTION_PENDING, TicketStatus.CLOSED, [RoleCode.REPORTING_READER])).toBe(false);
  });

  it("respecte une portée équipe explicite pour le reporting sans donner une fiche ticket", () => {
    const scope = { type: ScopeType.TEAM, teamId: "team-a" } as const;
    expect(canViewTicket(
      { id: "reader", roles: [{ code: RoleCode.REPORTING_READER, scope }] },
      {
        requesterId: "requester",
        assignedToId: null,
        queueId: "queue",
        departmentId: "department",
        confidential: false,
        teamIds: ["team-a"],
      },
    )).toBe(false);
  });
});
