import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleCode, ScopeType, UserStatus } from "@prisma/client";

const mock = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mock.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: mock.userFindUnique } },
}));

import {
  AuthorizationError, requireAdminAccess, requireAuthenticatedUser,
  requirePermission, requireRole, requireSessionUserContext, requireTicketAccess,
} from "@/lib/server-auth";

function actor(options: {
  status?: UserStatus;
  administrativelyDisabled?: boolean;
  role?: RoleCode;
  pending?: boolean;
} = {}) {
  return {
    id: "suspended-admin",
    status: options.status ?? UserStatus.ACTIVE,
    administrativelyDisabled: options.administrativelyDisabled ?? false,
    departmentId: "department-1",
    roleAssignments: options.role ? [{
      role: {
        code: options.role,
        permissions: [{ permission: { code: "organization:manage" } }],
      },
      scope: null,
      scopeId: null,
    }] : [],
    teamMemberships: [],
    managedQueues: [],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mock.getServerSession.mockResolvedValue({ user: { id: "suspended-admin" } });
});

describe("S3 — révocation immédiate d'un compte Entra administrativement suspendu", () => {
  it("refuse la session active immédiatement après suspension administrative", async () => {
    mock.userFindUnique.mockResolvedValue(actor({ administrativelyDisabled: true, role: RoleCode.AGENT }));
    await expect(requireAuthenticatedUser()).rejects.toBeInstanceOf(AuthorizationError);
    await expect(requireSessionUserContext()).rejects.toBeInstanceOf(AuthorizationError);
    await expect(requireRole(RoleCode.AGENT)).rejects.toBeInstanceOf(AuthorizationError);
    await expect(requirePermission("ticket:create")).rejects.toBeInstanceOf(AuthorizationError);
    await expect(requireTicketAccess("ticket-1")).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("interdit toute la console fonctionnelle même si le rôle global est conservé", async () => {
    mock.userFindUnique.mockResolvedValue(actor({ administrativelyDisabled: true, role: RoleCode.FUNCTIONAL_ADMIN }));
    await expect(requireAdminAccess("FUNCTIONAL")).rejects.toBeInstanceOf(AuthorizationError);
    await expect(requireAdminAccess("ANY")).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("interdit le bootstrap administrateur suspendu et préserve la validation manuelle", async () => {
    mock.userFindUnique.mockResolvedValue(actor({
      status: UserStatus.PENDING_ASSIGNMENT,
      administrativelyDisabled: true,
      role: RoleCode.FUNCTIONAL_ADMIN,
    }));
    await expect(requireAdminAccess("FUNCTIONAL")).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("préserve la session, les rôles autorisés et l'administration des comptes actifs", async () => {
    mock.userFindUnique.mockResolvedValue(actor({ role: RoleCode.FUNCTIONAL_ADMIN }));
    await expect(requireAuthenticatedUser()).resolves.toMatchObject({ status: UserStatus.ACTIVE });
    await expect(requireAdminAccess("FUNCTIONAL")).resolves.toMatchObject({ id: "suspended-admin" });
    await expect(requireRole(RoleCode.FUNCTIONAL_ADMIN)).resolves.toMatchObject({ id: "suspended-admin" });
  });

  it("refuse un compte DISABLED même sans suspension administrative", async () => {
    mock.userFindUnique.mockResolvedValue(actor({ status: UserStatus.DISABLED }));
    await expect(requireAuthenticatedUser()).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("exige une session Entra et ne se contente pas d'un identifiant client", async () => {
    mock.getServerSession.mockResolvedValue(null);
    await expect(requireAuthenticatedUser()).rejects.toThrow();
    expect(mock.userFindUnique).not.toHaveBeenCalled();
  });
});
