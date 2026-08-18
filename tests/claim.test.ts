import { describe, expect, it } from "vitest";
import { RoleCode, ScopeType, TicketStatus } from "@prisma/client";
import { canClaimTicket } from "@/lib/access-control";
import { CLAIMABLE_STATUSES } from "@/lib/domain";

describe("contrat Claim", () => {
  const target = {
    requesterId: "requester",
    assignedToId: null,
    queueId: "queue-network",
    departmentId: "dsi",
    confidential: false,
    teamIds: ["team-network"],
  };

  it("exige le rôle agent et une portée compatible", () => {
    const agent = {
      id: "agent",
      teamIds: ["team-network"],
      roles: [{ code: RoleCode.AGENT, scope: { type: ScopeType.TEAM, teamId: "team-network" } }],
    };
    expect(canClaimTicket(agent, target)).toBe(true);
    expect(canClaimTicket({ ...agent, teamIds: ["team-other"] }, target)).toBe(false);
    expect(canClaimTicket({ id: "manager", roles: [{ code: RoleCode.QUEUE_MANAGER }] }, target)).toBe(false);
  });

  it("conserve exactement les quatre statuts pris en charge", () => {
    expect(CLAIMABLE_STATUSES).toEqual([
      TicketStatus.NEW,
      TicketStatus.TO_QUALIFY,
      TicketStatus.TO_ASSIGN,
      TicketStatus.REOPENED,
    ]);
  });
});
