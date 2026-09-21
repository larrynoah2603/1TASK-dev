import { getServerSession } from "next-auth";
import { cache } from "react";
import { Prisma, RoleCode, ScopeType, UserStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PERMISSION_CATALOG } from "@/lib/identity";
import {
  canViewTicket,
  hasGlobalRole,
  hasScopedRole,
  roleScopeMatches,
  type AccessSubject,
  type RoleScope,
  type TicketAccessTarget,
} from "@/lib/access-control";

export class AuthenticationError extends Error {
  statusCode = 401;

  constructor(message = "Authentification requise.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;

  constructor(message = "Accès non autorisé.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ResourceNotFoundError extends Error {
  statusCode = 404;

  constructor(message = "Ressource introuvable.") {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}

const userContextInclude = {
  department: { select: { id: true, code: true, name: true, isActive: true } },
  manager: { select: { id: true, name: true, email: true, status: true, departmentId: true } },
  entraManager: { select: { id: true, name: true, email: true, status: true } },
  primaryTeam: {
    select: {
      id: true,
      name: true,
      isActive: true,
      queue: { select: { id: true, name: true, departmentId: true, isActive: true } },
    },
  },
  authorizedQueue: {
    select: { id: true, name: true, code: true, departmentId: true, isActive: true },
  },
  roleAssignments: {
    select: {
      id: true,
      userId: true,
      roleId: true,
      scopeId: true,
      assignedById: true,
      createdAt: true,
      role: {
        select: {
          id: true,
          code: true,
          name: true,
          permissions: {
            select: { permission: { select: { id: true, code: true, description: true } } },
          },
        },
      },
      scope: {
        select: {
          id: true,
          name: true,
          type: true,
          departmentId: true,
          queueId: true,
          teamId: true,
          portfolioKey: true,
          members: { select: { userId: true } },
          team: { select: { id: true, queueId: true, isActive: true } },
        },
      },
    },
  },
  managedQueues: { select: { id: true } },
  teamMemberships: {
    select: {
      id: true,
      userId: true,
      teamId: true,
      isActive: true,
      team: { select: { id: true, queueId: true, isActive: true } },
    },
  },
} as const satisfies Prisma.UserInclude;

export type UserContext = NonNullable<Awaited<ReturnType<typeof getUserContext>>>;

export async function getUserContext(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, include: userContextInclude });
}

export const getSessionUserContext = cache(async (): Promise<UserContext | null> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return getUserContext(session.user.id);
});

/**
 * The single server-side entry point for authenticated application actions.
 * A pending Entra provisioning record is deliberately not treated as active.
 */
export async function requireAuthenticatedUser(): Promise<UserContext> {
  const user = await getSessionUserContext();
  if (!user) throw new AuthenticationError();
  if (user.status === "PENDING_VALIDATION" || user.status === "PENDING_ASSIGNMENT") {
    throw new AuthorizationError(
      "Votre profil est en attente de validation par l’administrateur fonctionnel.",
    );
  }
  if (user.status !== "ACTIVE") {
    throw new AuthorizationError("Votre compte est désactivé.");
  }
  return user;
}

/** Backward-compatible name used by the existing routes and services. */
export async function requireSessionUserContext(): Promise<UserContext> {
  return requireAuthenticatedUser();
}

/**
 * Prevents a server service from trusting a stale or caller-supplied
 * UserContext. Every mutation that accepts a context object must rebind it to
 * the current Microsoft Entra-backed session before touching Prisma.
 */
export async function requireCurrentActor(actor: UserContext): Promise<UserContext> {
  const current = await requireAuthenticatedUser();
  if (current.id !== actor.id) {
    throw new AuthorizationError("Le contexte utilisateur est obsolète.");
  }
  return current;
}

export async function requireAnyPermission(
  permissions: readonly string[],
  target?: TicketAccessTarget,
): Promise<UserContext> {
  const user = await requireAuthenticatedUser();
  if (!permissions.some((permission) => hasPermission(user, permission, target))) {
    throw new AuthorizationError("Aucune des permissions requises n’est accordée.");
  }
  return user;
}

function roleScopeFromAssignment(assignment: UserContext["roleAssignments"][number]): RoleScope {
  return {
    code: assignment.role.code,
    scope: assignment.scope
      ? {
          type: assignment.scope.type,
          departmentId: assignment.scope.departmentId,
          queueId: assignment.scope.queueId,
          teamId: assignment.scope.teamId,
          portfolioKey: assignment.scope.portfolioKey,
          userIds: assignment.scope.members.map((member) => member.userId),
        }
      : { type: ScopeType.GLOBAL },
  };
}

export function toAccessSubject(user: UserContext): AccessSubject {
  return {
    id: user.id,
    departmentId: user.departmentId,
    authorizedQueueId: user.authorizedQueueId,
    managedQueueIds: user.managedQueues?.map((queue) => queue.id) ?? [],
    teamIds: user.teamMemberships
      .filter((membership) => membership.isActive && membership.team.isActive)
      .map((membership) => membership.team.id),
    roles: user.roleAssignments.map(roleScopeFromAssignment),
  };
}

export function roleCodes(user: UserContext): RoleCode[] {
  return [...new Set(user.roleAssignments.map((assignment) => assignment.role.code))];
}

/**
 * The bootstrap functional administrator must be able to open the console
 * once, while their Entra department value is still unmapped, to create that
 * mapping. This does not activate the normal workspace and does not apply to
 * scoped functional roles.
 */
export function isPendingFunctionalAdministrator(
  user: Pick<UserContext, "status" | "roleAssignments">,
): boolean {
  return (
    (user.status === UserStatus.PENDING_VALIDATION || user.status === UserStatus.PENDING_ASSIGNMENT) &&
    user.roleAssignments.some(
    (assignment) => assignment.role.code === RoleCode.FUNCTIONAL_ADMIN && assignment.scopeId === null,
    )
  );
}

export function permissionCodes(user: UserContext): string[] {
  const permissions = new Set(
    user.roleAssignments.flatMap((assignment) =>
      assignment.role.permissions.map((item) => item.permission.code),
    ),
  );
  // Keep a global functional administrator usable when an existing local
  // database predates the latest additive permission catalog migration. The
  // role is still granted only by the Entra-backed role assignment and only
  // the global (unscoped) assignment receives this fallback.
  const subject = toAccessSubject(user);
  if (hasGlobalRole(subject, RoleCode.FUNCTIONAL_ADMIN)) {
    Object.keys(PERMISSION_CATALOG).forEach((permission) => permissions.add(permission));
  }
  return [...permissions];
}

export function hasPermission(
  user: UserContext,
  permission: string,
  target?: TicketAccessTarget,
): boolean {
  const subject = toAccessSubject(user);
  if (
    Object.prototype.hasOwnProperty.call(PERMISSION_CATALOG, permission) &&
    hasGlobalRole(subject, RoleCode.FUNCTIONAL_ADMIN)
  ) {
    return !target || hasScopedRole(subject, [RoleCode.FUNCTIONAL_ADMIN], target);
  }
  return user.roleAssignments.some((assignment) => {
    if (!assignment.role.permissions.some((item) => item.permission.code === permission)) {
      return false;
    }
    if (!target) return true;
    return roleScopeMatches(subject, roleScopeFromAssignment(assignment), target);
  });
}

export async function requireRole(
  roles: RoleCode | readonly RoleCode[],
  target?: TicketAccessTarget,
): Promise<UserContext> {
  const user = await requireAuthenticatedUser();
  const expected = Array.isArray(roles) ? [...roles] : [roles];
  const subject = toAccessSubject(user);
  const allowed = target
    ? hasScopedRole(subject, expected, target)
    : subject.roles.some((role) => expected.includes(role.code));
  if (!allowed) {
    throw new AuthorizationError("Votre rôle ne permet pas cette action.");
  }
  return user;
}

export async function requirePermission(
  permission: string,
  target?: TicketAccessTarget,
): Promise<UserContext> {
  const user = await requireAuthenticatedUser();
  const allowed = hasPermission(user, permission, target);
  if (!allowed) {
    throw new AuthorizationError("La permission requise n’est pas accordée.");
  }
  return user;
}

/**
 * Central authorization policy for the department directory shown during
 * ticket creation. The API route receives an already-scoped Prisma predicate
 * and cannot accidentally turn the optional cross-department permission into
 * unrestricted access.
 */
export async function requirePermissionForTicketCreationDepartments(): Promise<Prisma.DepartmentWhereInput> {
  const actor = await requirePermission("ticket:create");
  const canCreateCrossDepartment = hasPermission(actor, "ticket:create:cross-department");
  return {
    isActive: true,
    ...(canCreateCrossDepartment ? {} : { id: actor.departmentId ?? "__none__" }),
  };
}

export async function requireTicketAccess(ticketId: string): Promise<{
  actor: UserContext;
  target: TicketAccessTarget;
  ticket: {
    id: string;
    requesterId: string;
    assignedToId: string | null;
    assignedTo: { teamMemberships: { teamId: string; isActive: boolean; team: { isActive: boolean } }[] } | null;
    queueId: string;
    confidential: boolean;
    queue: { departmentId: string; teams: { id: string; isActive: boolean }[] };
    accessList: { userId: string }[];
  };
}> {
  const actor = await requireAuthenticatedUser();
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      requesterId: true,
      assignedToId: true,
      assignedTo: {
        select: {
          teamMemberships: {
            select: { teamId: true, isActive: true, team: { select: { isActive: true } } },
          },
        },
      },
      queueId: true,
      confidential: true,
      queue: {
        select: {
          departmentId: true,
          teams: { select: { id: true, isActive: true } },
        },
      },
      accessList: { select: { userId: true } },
    },
  });
  if (!ticket) throw new ResourceNotFoundError("Ticket introuvable.");

  const target: TicketAccessTarget = {
    requesterId: ticket.requesterId,
    assignedToId: ticket.assignedToId,
    queueId: ticket.queueId,
    departmentId: ticket.queue.departmentId,
    confidential: ticket.confidential,
    assignedToTeamIds: ticket.assignedTo?.teamMemberships
      .filter((membership) => membership.isActive && membership.team.isActive)
      .map((membership) => membership.teamId),
    authorizedUserIds: ticket.accessList.map((entry) => entry.userId),
    teamIds: ticket.queue.teams.filter((team) => team.isActive).map((team) => team.id),
  };
  if (!canViewTicket(toAccessSubject(actor), target)) {
    throw new AuthorizationError("Vous n’avez pas accès à ce ticket.");
  }
  return { actor, target, ticket };
}

export type AdminArea = "FUNCTIONAL" | "TECHNICAL" | "ANY";

export async function requireAdminAccess(area: AdminArea = "ANY"): Promise<UserContext> {
  const user = await getSessionUserContext();
  if (!user) throw new AuthenticationError();
  const subject = toAccessSubject(user);
  const pendingFunctionalAdministrator = isPendingFunctionalAdministrator(user);

  if (user.status !== UserStatus.ACTIVE && !pendingFunctionalAdministrator) {
    throw new AuthorizationError(
      user.status === UserStatus.PENDING_VALIDATION || user.status === UserStatus.PENDING_ASSIGNMENT
        ? "Votre profil est en attente de validation par l’administrateur fonctionnel."
        : "Votre compte est désactivé.",
    );
  }
  if (area === "TECHNICAL" && user.status !== UserStatus.ACTIVE) {
    throw new AuthorizationError("L’administration technique exige un compte actif.");
  }

  const allowedRoles = area === "FUNCTIONAL"
    ? [RoleCode.FUNCTIONAL_ADMIN]
    : area === "TECHNICAL"
      ? [RoleCode.TECHNICAL_ADMIN]
      : [RoleCode.FUNCTIONAL_ADMIN, RoleCode.TECHNICAL_ADMIN];
  if (!allowedRoles.some((role) => hasGlobalRole(subject, role))) {
    throw new AuthorizationError("Cette zone est réservée à un administrateur habilité.");
  }
  if (area === "TECHNICAL" && !hasPermission(user, "technical:manage")) {
    throw new AuthorizationError("La permission d’administration technique n’est pas accordée.");
  }
  if (
    area === "FUNCTIONAL" &&
    ![
      "organization:manage",
      "catalog:manage",
      "role:manage",
      "sla:manage",
      "entra-department:manage",
    ].some((permission) => hasPermission(user, permission))
  ) {
    throw new AuthorizationError("Aucune permission d’administration fonctionnelle n’est accordée.");
  }
  return user;
}
