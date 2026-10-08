import { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AuthorizationError, requireAdminAccess, type UserContext } from "@/lib/server-auth";

const adminUserSelect = {
  id: true, name: true, entraDisplayName: true, managedDisplayName: true, email: true,
  status: true, administrativelyDisabled: true, entraObjectId: true,
  entraDepartmentValue: true, entraDepartmentNormalizedValue: true, jobTitle: true, lastSyncedAt: true,
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true, email: true } },
  entraManager: { select: { id: true, name: true, email: true } },
  entraManagerObjectId: true, entraManagerDisplayName: true, entraManagerEmail: true,
  primaryRoleCode: true,
  primaryTeam: { select: { id: true, name: true, queue: { select: { id: true, name: true, departmentId: true } } } },
  authorizedQueue: { select: { id: true, name: true, departmentId: true } },
  roleAssignments: { select: { id: true, role: { select: { code: true, name: true } }, scopeId: true, scope: { select: { id: true, name: true, type: true, department: { select: { name: true } }, queue: { select: { name: true } }, team: { select: { name: true } } } } }, orderBy: [{ role: { code: "asc" } }, { createdAt: "asc" }] },
  teamMemberships: { select: { isActive: true, team: { select: { id: true, name: true, queue: { select: { name: true } } } } } },
} satisfies Prisma.UserSelect;

async function requireSameFunctionalAdmin(actor: UserContext) {
  const current = await requireAdminAccess("FUNCTIONAL");
  if (current.id !== actor.id) throw new AuthorizationError("Le contexte administrateur est obsolète.");
}

export async function listAdminUsersPage(actor: UserContext, options: { q?: string; status?: UserStatus; page?: number; pageSize?: number } = {}) {
  await requireSameFunctionalAdmin(actor);
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? 10, 5), 50);
  const q = options.q?.trim() ?? "";
  const where: Prisma.UserWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { entraDisplayName: { contains: q, mode: "insensitive" } },
      { managedDisplayName: { contains: q, mode: "insensitive" } },
      { department: { name: { contains: q, mode: "insensitive" } } },
      { manager: { name: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: adminUserSelect, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);
  return { users, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminUserStatusSummary(actor: UserContext) {
  await requireSameFunctionalAdmin(actor);
  const grouped = await prisma.user.groupBy({ by: ["status"], _count: { _all: true } });
  const counts = new Map(grouped.map((row) => [row.status, row._count._all]));
  return {
    active: counts.get(UserStatus.ACTIVE) ?? 0,
    pending: (counts.get(UserStatus.PENDING_ASSIGNMENT) ?? 0) + (counts.get(UserStatus.PENDING_VALIDATION) ?? 0),
    disabled: counts.get(UserStatus.DISABLED) ?? 0,
  };
}

export async function getAdminUserFormReferences(actor: UserContext) {
  await requireSameFunctionalAdmin(actor);
  const [departments, queues, teams, roles] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true, isActive: true }, orderBy: { name: "asc" } }),
    prisma.queue.findMany({ select: { id: true, name: true, isActive: true, department: { select: { id: true, name: true } } }, orderBy: [{ department: { name: "asc" } }, { name: "asc" }] }),
    prisma.team.findMany({ select: { id: true, name: true, isActive: true, queue: { select: { id: true, name: true, departmentId: true } } }, orderBy: { name: "asc" } }),
    prisma.role.findMany({ select: { code: true, name: true }, orderBy: { code: "asc" } }),
  ]);
  return { departments, queues, teams, roles };
}

export async function searchAdminManagerOptions(actor: UserContext, options: { departmentId: string; q?: string; excludeId?: string; take?: number }) {
  await requireSameFunctionalAdmin(actor);
  const q = options.q?.trim() ?? "";
  const take = Math.min(Math.max(options.take ?? 20, 1), 30);
  return prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      departmentId: options.departmentId,
      ...(options.excludeId ? { id: { not: options.excludeId } } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" } },
        { managedDisplayName: { contains: q, mode: "insensitive" } },
        { entraDisplayName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ] } : {}),
    },
    select: { id: true, name: true, managedDisplayName: true, entraDisplayName: true, email: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take,
  });
}
