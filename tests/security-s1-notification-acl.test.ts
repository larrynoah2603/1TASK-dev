import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleCode, ScopeType } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  notificationFindFirst: vi.fn(),
  ticketFindUnique: vi.fn(),
  getUserContext: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    notification: { findFirst: mocks.notificationFindFirst },
    ticket: { findUnique: mocks.ticketFindUnique },
  },
}));

// Keep the REAL server-side role/scope-to-subject conversion. Only the DB
// lookup is mocked; canViewTicket and accessTarget also run for real.
vi.mock("@/lib/server-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server-auth")>()),
  getUserContext: mocks.getUserContext,
}));

import { notificationMayBeDelivered } from "@/lib/notification-authorization";

const NOW = new Date("2026-10-13T13:00:00.000Z");

function recipient() {
  return {
    id: "agent-1",
    status: "ACTIVE",
    administrativelyDisabled: false,
    departmentId: "department-1",
    authorizedQueueId: null as string | null,
    managedQueues: [] as Array<{ id: string }>,
    teamMemberships: [
      { isActive: true, team: { id: "team-1", queueId: "queue-1", isActive: true } },
    ],
    roleAssignments: [{
      role: { code: RoleCode.AGENT as RoleCode },
      scope: {
        type: ScopeType.QUEUE,
        departmentId: null,
        queueId: "queue-1",
        teamId: null,
        portfolioKey: null,
        members: [] as Array<{ userId: string }>,
      },
    }],
  };
}
function accessTicket() {
  return {
    id: "ticket-1",
    requesterId: "requester-1",
    assignedToId: null as string | null,
    assignedTo: null,
    queueId: "queue-1",
    category: null,
    confidential: false,
    queue: {
      isActive: true,
      departmentId: "department-1",
      teams: [{ id: "team-1", isActive: true }],
    },
    accessList: [] as Array<{
      userId: string;
      delegationId: string | null;
      delegation: null | {
        startsAt: Date; endsAt: Date | null; revokedAt: Date | null;
        substituteId: string; actions: string[];
      };
    }>,
    serviceCatalogItem: { code: "CAT-1", category: "SUPPORT" },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.notificationFindFirst.mockResolvedValue({
    recipientId: "agent-1", ticketId: "ticket-1",
  });
  mocks.getUserContext.mockResolvedValue(recipient());
  mocks.ticketFindUnique.mockResolvedValue(accessTicket());
});

describe("S1 — contrôle ACL à la livraison différée de notifications", () => {
  it("autorise l'agent encore membre de l'équipe et de la file ciblée", async () => {
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(true);
    expect(mocks.notificationFindFirst).toHaveBeenCalledWith({
      where: { id: "notif-1", recipient: { status: "ACTIVE", administrativelyDisabled: false } },
      select: { ticketId: true, recipientId: true },
    });
    expect(mocks.ticketFindUnique.mock.calls[0][0]).toMatchObject({
      where: { id: "ticket-1" },
      include: { accessList: expect.any(Object), queue: expect.any(Object) },
    });
  });

  it("refuse après retrait de l'équipe active, même si le push a déjà été créé", async () => {
    const user = recipient();
    user.teamMemberships = [];
    mocks.getUserContext.mockResolvedValue(user);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);
  });

  it("refuse après retrait du rôle AGENT", async () => {
    const user = recipient();
    user.roleAssignments = [];
    mocks.getUserContext.mockResolvedValue(user);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);
  });

  it("refuse après changement de file autorisée ou de portée de rôle", async () => {
    const moved = recipient();
    moved.authorizedQueueId = "queue-other";
    mocks.getUserContext.mockResolvedValueOnce(moved);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);

    const wrongScope = recipient();
    wrongScope.roleAssignments[0].scope.queueId = "queue-other";
    mocks.getUserContext.mockResolvedValueOnce(wrongScope);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);
  });

  it("autorise toujours le demandeur de son propre ticket, selon le contrôle métier V1", async () => {
    const requester = { ...recipient(), id: "requester-1", teamMemberships: [], roleAssignments: [] };
    mocks.getUserContext.mockResolvedValue(requester);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(true);
  });

  it("refuse le ticket confidentiel sans autorisation nominative, même à l'admin", async () => {
    const ticket = accessTicket();
    ticket.confidential = true;
    mocks.ticketFindUnique.mockResolvedValue(ticket);
    const manager = recipient();
    manager.roleAssignments[0].role.code = RoleCode.FUNCTIONAL_ADMIN;
    mocks.getUserContext.mockResolvedValue(manager);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);
  });

  it("autorise l'accès confidentiel nominatif et révoque immédiatement la délégation expirée", async () => {
    const ticket = accessTicket();
    ticket.confidential = true;
    ticket.accessList = [{
      userId: "agent-1",
      delegationId: "delegation-1",
      delegation: {
        startsAt: new Date("2026-10-13T12:00:00Z"),
        endsAt: new Date("2026-10-13T14:00:00Z"),
        revokedAt: null,
        substituteId: "agent-1",
        actions: ["COMMENT"],
      },
    }];
    mocks.ticketFindUnique.mockResolvedValue(ticket);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(true);
    expect(await notificationMayBeDelivered("notif-1", new Date("2026-10-13T14:00:00Z"))).toBe(false);
    ticket.accessList[0].delegation!.revokedAt = NOW;
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);
  });

  it("refuse un compte désactivé, absent, un ticket supprimé et une notification inconnue", async () => {
    const inactive = recipient();
    inactive.status = "DISABLED";
    mocks.getUserContext.mockResolvedValueOnce(inactive);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);
    const denied = recipient();
    denied.administrativelyDisabled = true;
    mocks.getUserContext.mockResolvedValueOnce(denied);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);
    mocks.getUserContext.mockResolvedValueOnce(null);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);
    mocks.ticketFindUnique.mockResolvedValueOnce(null);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);
    mocks.notificationFindFirst.mockResolvedValueOnce(null);
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(false);
  });

  it("préserve les événements sans ticket, mais exige toujours le destinataire actif", async () => {
    mocks.notificationFindFirst.mockResolvedValueOnce({ recipientId: "agent-1", ticketId: null });
    expect(await notificationMayBeDelivered("notif-1", NOW)).toBe(true);
    expect(mocks.getUserContext).not.toHaveBeenCalled();
  });
});
