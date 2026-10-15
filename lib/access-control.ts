import { RoleCode, ScopeType } from "@prisma/client";

export interface RoleScope {
  code: RoleCode;
  scope?: {
    type: ScopeType;
    departmentId?: string | null;
    queueId?: string | null;
    teamId?: string | null;
    portfolioKey?: string | null;
    userIds?: string[];
  } | null;
}

export interface AccessSubject {
  id: string;
  departmentId?: string | null;
  authorizedQueueId?: string | null;
  managedQueueIds?: string[];
  teamIds?: string[];
  roles: RoleScope[];
}

export interface TicketAccessTarget {
  requesterId: string;
  assignedToId?: string | null;
  queueId: string;
  departmentId: string;
  confidential: boolean;
  assignedToTeamIds?: string[];
  authorizedUserIds?: string[];
  teamIds?: string[];
  portfolioKeys?: string[];
  /** Active delegation actions, keyed by the user that owns the grant. Keeping
   * identity and actions together prevents permissions from two substitutes
   * being accidentally combined. */
  delegatedActionsByUser?: Record<string, string[]>;
}

export function subjectRoleCodes(subject: AccessSubject): RoleCode[] {
  return [...new Set(subject.roles.map((role) => role.code))];
}

export function roleScopeMatches(
  subject: AccessSubject,
  role: RoleScope,
  target: TicketAccessTarget,
): boolean {
  const scope = role.scope;
  if (!scope || scope.type === ScopeType.GLOBAL) return true;

  switch (scope.type) {
    case ScopeType.DEPARTMENT:
      return scope.departmentId === target.departmentId;
    case ScopeType.QUEUE:
      return scope.queueId === target.queueId;
    case ScopeType.TEAM:
      return Boolean(
        scope.teamId &&
          target.teamIds?.includes(scope.teamId) &&
          // An AGENT role is additionally bounded by the user's active team
          // membership. For managers, reporting readers and administrators,
          // the explicit role scope is the authorization boundary.
          (role.code !== RoleCode.AGENT || subject.teamIds?.includes(scope.teamId)),
      );
    case ScopeType.PORTFOLIO:
      return Boolean(
        scope.portfolioKey && target.portfolioKeys?.includes(scope.portfolioKey),
      );
    case ScopeType.USER_LIST:
      return Boolean(
        scope.userIds?.some(
          (userId) => userId === target.requesterId || userId === target.assignedToId,
        ),
      );
    default:
      return false;
  }
}

export function hasScopedRole(
  subject: AccessSubject,
  codes: RoleCode[],
  target: TicketAccessTarget,
): boolean {
  return subject.roles.some(
    (role) => codes.includes(role.code) && roleScopeMatches(subject, role, target),
  );
}

export function canViewTicket(subject: AccessSubject, target: TicketAccessTarget): boolean {
  if (subject.id === target.requesterId) return true;

  // Assignment is an operational state, not an authorization grant. In
  // particular, an expired substitute may remain assigned while immediately
  // losing access. Ordinary tickets retain the historical assignee rule.
  if (!target.confidential && subject.id === target.assignedToId) return true;

  // TicketAccess grants appear in list queries as a personal visibility
  // clause. Honor those SAME active, named grants in the detail view for both
  // ordinary and confidential tickets, even across an operational queue
  // boundary. The grant is ticket-specific and adds no workflow permission.
  // Revoked/expired delegations are excluded by accessTarget(), not here.
  if (target.authorizedUserIds?.includes(subject.id)) return true;

  // An administrator-assigned queue is an additional operational boundary for
  // every non-personal ticket action, not only for AGENT rows.
  if (subject.authorizedQueueId && subject.authorizedQueueId !== target.queueId) return false;

  // A broad operational role never grants implicit access to a confidential
  // ticket. Only the requester or an explicit active grant can pass above.
  if (target.confidential) return false;

  // Queue managers explicitly attached to a queue have the same operational
  // visibility in ticket details as in ticket lists.
  if (subject.managedQueueIds?.includes(target.queueId)) return true;

  const hasOperationalScope = hasScopedRole(
    subject,
    [
      RoleCode.QUEUE_MANAGER,
      RoleCode.FUNCTIONAL_ADMIN,
    ],
    target,
  );
  if (hasOperationalScope) return true;

  // An agent is never global by virtue of the AGENT role alone. The active
  // team membership is the operational boundary for queue work.
  const agentTeamBoundary = target.assignedToId
    ? target.assignedToTeamIds ?? target.teamIds
    : target.teamIds;
  return (
    hasScopedRole(subject, [RoleCode.AGENT], target) &&
    Boolean(
      agentTeamBoundary?.some((teamId) => subject.teamIds?.includes(teamId)),
    )
  );
}

export function delegationAllowsAction(
  subjectId: string,
  target: TicketAccessTarget,
  action: string,
): boolean {
  const actions = target.delegatedActionsByUser?.[subjectId];
  return !actions || actions.includes(action);
}

export function canManageQueue(subject: AccessSubject, target: TicketAccessTarget): boolean {
  return (
    (!subject.authorizedQueueId || subject.authorizedQueueId === target.queueId) &&
    hasScopedRole(subject, [RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN], target)
  );
}

export function canAssignTicket(subject: AccessSubject, target: TicketAccessTarget): boolean {
  return canManageQueue(subject, target);
}

export function canAgentClaimTicket(subject: AccessSubject, target: TicketAccessTarget): boolean {
  return (
    (!subject.authorizedQueueId || subject.authorizedQueueId === target.queueId) &&
    hasScopedRole(subject, [RoleCode.AGENT], target)
  );
}

export function canManagerClaimTicket(subject: AccessSubject, target: TicketAccessTarget): boolean {
  if (subject.authorizedQueueId && subject.authorizedQueueId !== target.queueId) return false;
  const managerRoles = subject.roles.filter((role) => role.code === RoleCode.QUEUE_MANAGER);
  if (!managerRoles.length) return false;
  const explicitlyManaged = subject.managedQueueIds?.includes(target.queueId) ?? false;
  const explicitlyAuthorized = subject.authorizedQueueId === target.queueId;
  const explicitlyScoped = managerRoles.some((role) =>
    Boolean(role.scope && role.scope.type !== ScopeType.GLOBAL && roleScopeMatches(subject, role, target)),
  );
  return explicitlyManaged || explicitlyAuthorized || explicitlyScoped;
}

/** Agents require team membership in the service layer; managers require an
 * explicit managed queue or non-global authorized scope. */
export function canClaimTicket(subject: AccessSubject, target: TicketAccessTarget): boolean {
  return canAgentClaimTicket(subject, target) || canManagerClaimTicket(subject, target);
}

export function canReadReporting(subject: AccessSubject, target: TicketAccessTarget): boolean {
  if (target.confidential || (subject.authorizedQueueId && subject.authorizedQueueId !== target.queueId)) return false;
  return hasScopedRole(
    subject,
    [RoleCode.REPORTING_READER, RoleCode.QUEUE_MANAGER, RoleCode.FUNCTIONAL_ADMIN],
    target,
  );
}

export function canAccessSensitiveTechnicalData(
  subject: AccessSubject,
  target: TicketAccessTarget,
): boolean {
  return target.confidential && canViewTicket(subject, target);
}

export function hasGlobalRole(subject: AccessSubject, code: RoleCode): boolean {
  return subject.roles.some(
    (role) => role.code === code && (!role.scope || role.scope.type === ScopeType.GLOBAL),
  );
}
