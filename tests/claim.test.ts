import { describe, expect, it, vi } from "vitest";
import { RoleCode, ScopeType, TicketStatus } from "@prisma/client";
import { canClaimTicket } from "@/lib/access-control";
import { canActorClaimTicket } from "@/lib/ticket-service";
import { canTransitionStatus } from "@/lib/domain";
import { ROLE_PERMISSION_CODES } from "@/lib/identity";
import { tryAcquireTicketClaim } from "@/lib/ticket-assignment-service";
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

  it("autorise un responsable uniquement dans une file explicitement gérée ou bornée", () => {
    const manager = { id: "manager", managedQueueIds: ["queue-network"], roles: [{ code: RoleCode.QUEUE_MANAGER }] };
    expect(canClaimTicket(manager, target)).toBe(true);
    expect(canClaimTicket({ ...manager, managedQueueIds: ["queue-other"] }, target)).toBe(false);
    expect(canClaimTicket({ ...manager, authorizedQueueId: "queue-other" }, target)).toBe(false);
    expect(canClaimTicket({ id: "manager", authorizedQueueId: "queue-network", roles: [{ code: RoleCode.QUEUE_MANAGER }] }, target)).toBe(true);
    expect(canClaimTicket({ id: "manager", roles: [{ code: RoleCode.QUEUE_MANAGER, scope: { type: ScopeType.QUEUE, queueId: "queue-network" } }] }, target)).toBe(true);
  });

  it("aligne le bouton Claim sur l’identité active, la permission, la confidentialité et le périmètre", () => {
    const role = (code: RoleCode, permissions: string[]) => ({ role: { code, permissions: permissions.map((permission) => ({ permission: { code: permission } })) }, scopeId: null, scope: null });
    const manager = {
      id: "manager", name: "Manager", status: "ACTIVE", departmentId: "dsi", authorizedQueueId: null,
      managedQueues: [{ id: "queue-network" }], teamMemberships: [], roleAssignments: [role(RoleCode.QUEUE_MANAGER, ["ticket:claim"])],
    };
    const ticket = { ...target, status: TicketStatus.NEW, queue: { isActive: true, departmentId: "dsi", department: { isActive: true }, teams: [] }, accessList: [] };
    expect(canActorClaimTicket(manager as never, ticket)).toBe(true);
    expect(canActorClaimTicket({ ...manager, status: "DISABLED" } as never, ticket)).toBe(false);
    expect(canActorClaimTicket({ ...manager, authorizedQueueId: "queue-other" } as never, ticket)).toBe(false);
    expect(canActorClaimTicket(manager as never, { ...ticket, confidential: true, authorizedUserIds: [] } as never)).toBe(false);
    expect(canActorClaimTicket({ ...manager, managedQueues: [] } as never, ticket)).toBe(false);
  });

  it("préserve l’agent membre et permet au responsable de traiter puis résoudre", () => {
    const agentRole = { role: { code: RoleCode.AGENT, permissions: [{ permission: { code: "ticket:claim" } }] }, scopeId: null, scope: null };
    const agent = { id: "agent", name: "Agent", status: "ACTIVE", departmentId: "dsi", authorizedQueueId: null, managedQueues: [], roleAssignments: [agentRole], teamMemberships: [{ isActive: true, team: { id: "team-network", queueId: "queue-network", isActive: true } }] };
    const ticket = { ...target, status: TicketStatus.NEW, queue: { isActive: true, departmentId: "dsi", department: { isActive: true }, teams: [{ id: "team-network", isActive: true }] }, accessList: [] };
    expect(canActorClaimTicket(agent as never, ticket)).toBe(true);
    expect(ROLE_PERMISSION_CODES[RoleCode.QUEUE_MANAGER]).toEqual(expect.arrayContaining(["ticket:claim", "ticket:process", "ticket:resolve"]));
    expect(canTransitionStatus(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, [RoleCode.QUEUE_MANAGER])).toBe(true);
    expect(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.RESOLUTION_PENDING, [RoleCode.QUEUE_MANAGER])).toBe(true);
  });

  it("ne laisse qu’un gagnant entre un claim agent et responsable", async () => {
    let available = true;
    const updateMany = async () => {
      if (!available) return { count: 0 };
      available = false;
      return { count: 1 };
    };
    const tx = { ticket: { updateMany } } as never;
    const [agentWon, managerWon] = await Promise.all([
      tryAcquireTicketClaim(tx, { ticketId: "ticket", queueId: "queue-network", actorId: "agent" }),
      tryAcquireTicketClaim(tx, { ticketId: "ticket", queueId: "queue-network", actorId: "manager" }),
    ]);
    expect([agentWon, managerWon].filter(Boolean)).toHaveLength(1);
  });

  it("permet au profil V1 de passer directement en traitement lors du claim", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { ticket: { updateMany } } as never;
    await expect(tryAcquireTicketClaim(tx, {
      ticketId: "ticket",
      queueId: "queue-network",
      actorId: "agent",
      targetStatus: TicketStatus.IN_PROGRESS,
    })).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { assignedToId: "agent", status: TicketStatus.IN_PROGRESS },
    }));
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
