import { Prisma, RoleCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasGlobalRole } from "@/lib/access-control";
import {
  AuthorizationError,
  hasPermission,
  requireCurrentActor,
  toAccessSubject,
  type UserContext,
} from "@/lib/server-auth";

export async function listAuditLogsForViewer(actor: UserContext, take = 100) {
  const current = await requireCurrentActor(actor);
  if (
    !hasGlobalRole(toAccessSubject(current), RoleCode.FUNCTIONAL_ADMIN) ||
    !hasPermission(current, "audit:read")
  ) {
    throw new AuthorizationError("Le journal d’audit est réservé à l’administrateur fonctionnel global.");
  }
  return prisma.auditLog.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take, 1), 200),
  });
}

export async function listAuditLogsForViewerPage(actor: UserContext, options: { query?: string; page?: number; pageSize?: number } = {}) {
  const current = await requireCurrentActor(actor);
  if (
    !hasGlobalRole(toAccessSubject(current), RoleCode.FUNCTIONAL_ADMIN) ||
    !hasPermission(current, "audit:read")
  ) {
    throw new AuthorizationError("Le journal d’audit est réservé à l’administrateur fonctionnel global.");
  }
  const query = options.query?.trim();
  const where: Prisma.AuditLogWhereInput = query ? {
    OR: [
      { action: { contains: query, mode: "insensitive" } },
      { objectType: { contains: query, mode: "insensitive" } },
      { objectId: { contains: query, mode: "insensitive" } },
      { reason: { contains: query, mode: "insensitive" } },
      { actor: { name: { contains: query, mode: "insensitive" } } },
      { actor: { email: { contains: query, mode: "insensitive" } } },
    ],
  } : {};
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 5), 100);
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.count({ where }),
  ]);
  return { logs, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
