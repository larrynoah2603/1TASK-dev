import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserStatus } from "@prisma/client";
const db = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: {
  user: { findMany: db.findMany, count: db.count, groupBy: db.groupBy },
  department: { findMany: vi.fn() }, queue: { findMany: vi.fn() }, team: { findMany: vi.fn() }, role: { findMany: vi.fn() },
} }));
vi.mock("@/lib/server-auth", () => ({
  AuthorizationError: class AuthorizationError extends Error {},
  requireAdminAccess: vi.fn(async () => ({ id: "admin-1" })),
}));
import { listAdminUsersPage } from "@/lib/admin-user-query-service";
describe("pagination et recherche admin utilisateurs", () => {
  beforeEach(() => { vi.clearAllMocks(); db.findMany.mockResolvedValue([]); db.count.mockResolvedValue(0); });
  it("recherche dans toute la base et non dans une tranche de 50", async () => {
    await listAdminUsersPage({ id: "admin-1" } as never, { q: "user-120@example.test", status: UserStatus.ACTIVE, page: 3, pageSize: 50 });
    expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: UserStatus.ACTIVE, OR: expect.any(Array) }),
      skip: 100,
      take: 50,
    }));
    expect(db.count).toHaveBeenCalledWith({ where: expect.objectContaining({ status: UserStatus.ACTIVE, OR: expect.any(Array) }) });
  });
});
