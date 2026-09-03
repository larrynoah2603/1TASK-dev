import { MissionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  appendAuditLog: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    mission: { findUnique: mocks.findUnique, update: mocks.update },
  },
}));
vi.mock("@/lib/audit", () => ({ appendAuditLog: mocks.appendAuditLog }));
vi.mock("@/lib/server-auth", () => ({
  AuthorizationError: class AuthorizationError extends Error {
    statusCode = 403;
  },
  ResourceNotFoundError: class ResourceNotFoundError extends Error {
    statusCode = 404;
  },
  requireCurrentActor: vi.fn(async (actor: UserContext) => actor),
  requireTicketAccess: vi.fn(),
  toAccessSubject: (actor: UserContext) => ({
    id: actor.id,
    departmentId: actor.departmentId,
    roles: actor.roleAssignments.map((assignment) => ({
      code: assignment.role.code,
      scope: { type: "GLOBAL" },
    })),
  }),
}));

import { completeMission } from "@/lib/production-service";
import { AuthorizationError, type UserContext } from "@/lib/server-auth";

function actor(departmentId = "department-1") {
  return {
    id: "manager-1",
    departmentId,
    roleAssignments: [{
      role: { code: "QUEUE_MANAGER", permissions: [{ permission: { code: "portfolio:manage" } }] },
      scope: null,
    }],
  } as unknown as UserContext;
}

describe("service de production", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clôture une mission autorisée et journalise le changement", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "mission-1",
      departmentId: "department-1",
      status: MissionStatus.ACTIVE,
    });
    mocks.update.mockResolvedValue({ id: "mission-1", status: MissionStatus.COMPLETED });

    const result = await completeMission(actor(), "mission-1");

    expect(result.status).toBe(MissionStatus.COMPLETED);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "mission-1" },
      data: { status: MissionStatus.COMPLETED },
    });
    expect(mocks.appendAuditLog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      actorId: "manager-1",
      action: "MISSION_COMPLETED",
      objectId: "mission-1",
    }));
  });

  it("refuse une mission d'un autre département avant toute mutation", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "mission-2",
      departmentId: "department-2",
      status: MissionStatus.ACTIVE,
    });

    await expect(completeMission(actor(), "mission-2"))
      .rejects.toBeInstanceOf(AuthorizationError);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.appendAuditLog).not.toHaveBeenCalled();
  });
});
