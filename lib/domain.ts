import {
  BlockReason,
  Impact,
  Priority,
  RoleCode,
  TicketLinkType,
  TicketStatus,
  TicketType,
  Urgency,
} from "@prisma/client";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.NEW]: "Nouveau",
  [TicketStatus.TO_QUALIFY]: "À qualifier",
  [TicketStatus.TO_ASSIGN]: "À affecter",
  [TicketStatus.ASSIGNED]: "Affecté",
  [TicketStatus.IN_PROGRESS]: "En cours",
  [TicketStatus.BLOCKED]: "En attente ou bloqué",
  [TicketStatus.RESOLUTION_PENDING]: "Résolution en attente",
  [TicketStatus.REOPENED]: "Réouvert",
  [TicketStatus.CLOSED]: "Clôturé",
  [TicketStatus.CANCELLED]: "Annulé",
};

export const IMPACT_LABELS: Record<Impact, string> = {
  [Impact.LOW]: "Faible",
  [Impact.MEDIUM]: "Moyen",
  [Impact.HIGH]: "Élevé",
  [Impact.CRITICAL]: "Critique",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  [Urgency.LOW]: "Faible",
  [Urgency.MEDIUM]: "Moyenne",
  [Urgency.HIGH]: "Élevée",
  [Urgency.CRITICAL]: "Critique",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: "Basse",
  [Priority.MEDIUM]: "Normale",
  [Priority.HIGH]: "Haute",
  [Priority.CRITICAL]: "Critique",
};

export const TYPE_LABELS: Record<TicketType, string> = {
  [TicketType.INCIDENT]: "Incident",
  [TicketType.SERVICE_REQUEST]: "Demande de service",
  [TicketType.QUESTION]: "Question",
  [TicketType.ACCESS_REQUEST]: "Demande d’accès",
  [TicketType.OTHER]: "Autre",
  [TicketType.PRODUCTION_TASK]: "Tâche de production",
  [TicketType.CHANGE_REQUEST]: "Demande de changement",
};

export const BLOCK_REASON_LABELS: Record<BlockReason, string> = {
  [BlockReason.REQUESTER_WAITING]: "Attente du demandeur",
  [BlockReason.SUPPLIER_WAITING]: "Attente d’un fournisseur",
  [BlockReason.OTHER_TEAM_WAITING]: "Attente d’une autre équipe",
  [BlockReason.VALIDATION_REQUIRED]: "Validation nécessaire",
  [BlockReason.EXTERNAL_PROBLEM]: "Problème externe",
  [BlockReason.MISSING_INFORMATION]: "Information manquante",
};

const staffRoles = new Set<RoleCode>([
  RoleCode.AGENT,
  RoleCode.QUEUE_MANAGER,
  RoleCode.FUNCTIONAL_ADMIN,
]);

const managerRoles = new Set<RoleCode>([
  RoleCode.QUEUE_MANAGER,
  RoleCode.FUNCTIONAL_ADMIN,
]);

export const V1_WORKFLOW_STEPS = ["RECEIVED", "IN_PROGRESS", "RESOLUTION", "CLOSED"] as const;
export type V1WorkflowStep = (typeof V1_WORKFLOW_STEPS)[number];

export const V1_WORKFLOW_STEP_LABELS: Record<V1WorkflowStep, string> = {
  RECEIVED: "Reçue",
  IN_PROGRESS: "En traitement",
  RESOLUTION: "Résolution proposée",
  CLOSED: "Fermée",
};

export function getV1WorkflowPresentation(status: TicketStatus): {
  step: V1WorkflowStep;
  label: string;
  position: number;
} {
  switch (status) {
    case TicketStatus.NEW:
    case TicketStatus.TO_QUALIFY:
    case TicketStatus.TO_ASSIGN:
      return { step: "RECEIVED", label: "Reçue", position: 0 };
    case TicketStatus.ASSIGNED:
    case TicketStatus.IN_PROGRESS:
    case TicketStatus.REOPENED:
      return { step: "IN_PROGRESS", label: "En traitement", position: 1 };
    case TicketStatus.BLOCKED:
      return { step: "IN_PROGRESS", label: "En attente", position: 1 };
    case TicketStatus.RESOLUTION_PENDING:
      return { step: "RESOLUTION", label: "Résolution proposée", position: 2 };
    case TicketStatus.CLOSED:
      return { step: "CLOSED", label: "Fermée", position: 3 };
    case TicketStatus.CANCELLED:
      return { step: "RECEIVED", label: "Annulée", position: 0 };
  }
}

export function v1RequesterAllowedNextStatuses(from: TicketStatus): TicketStatus[] {
  if (
    from === TicketStatus.NEW ||
    from === TicketStatus.TO_QUALIFY ||
    from === TicketStatus.TO_ASSIGN
  ) {
    return [TicketStatus.CANCELLED];
  }
  return from === TicketStatus.RESOLUTION_PENDING
    ? [TicketStatus.CLOSED, TicketStatus.REOPENED]
    : [];
}

export const TERMINAL_TICKET_STATUSES: readonly TicketStatus[] = [TicketStatus.CLOSED, TicketStatus.CANCELLED];

export function isTerminalTicketStatus(status: TicketStatus): boolean {
  return TERMINAL_TICKET_STATUSES.includes(status);
}

export const CLAIMABLE_STATUSES: readonly TicketStatus[] = [
  TicketStatus.NEW,
  TicketStatus.TO_QUALIFY,
  TicketStatus.TO_ASSIGN,
  TicketStatus.REOPENED,
];

const transitionMap: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  [TicketStatus.NEW]: [TicketStatus.TO_QUALIFY, TicketStatus.TO_ASSIGN, TicketStatus.CANCELLED],
  [TicketStatus.TO_QUALIFY]: [TicketStatus.TO_ASSIGN, TicketStatus.CANCELLED],
  [TicketStatus.TO_ASSIGN]: [TicketStatus.ASSIGNED, TicketStatus.CANCELLED],
  [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS, TicketStatus.TO_ASSIGN],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.BLOCKED, TicketStatus.RESOLUTION_PENDING],
  [TicketStatus.BLOCKED]: [TicketStatus.IN_PROGRESS, TicketStatus.TO_ASSIGN],
  [TicketStatus.RESOLUTION_PENDING]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  [TicketStatus.REOPENED]: [TicketStatus.IN_PROGRESS, TicketStatus.TO_ASSIGN],
  [TicketStatus.CLOSED]: [TicketStatus.REOPENED],
  [TicketStatus.CANCELLED]: [],
};

export function isStaffRole(role: RoleCode): boolean {
  return staffRoles.has(role);
}

export function isManagerRole(role: RoleCode): boolean {
  return managerRoles.has(role);
}

export function isClaimableStatus(status: TicketStatus): boolean {
  return CLAIMABLE_STATUSES.includes(status);
}

export function allowedNextStatuses(
  from: TicketStatus,
  roles: RoleCode[],
  isRequester = false,
): TicketStatus[] {
  if (isRequester && from === TicketStatus.RESOLUTION_PENDING) {
    return [TicketStatus.CLOSED, TicketStatus.REOPENED];
  }
  if (!roles.some((role) => isStaffRole(role))) return [];
  return [...(transitionMap[from] ?? [])];
}

export function canTransitionStatus(
  from: TicketStatus,
  to: TicketStatus,
  roles: RoleCode[],
  isRequester = false,
): boolean {
  if (from === to) return false;
  return allowedNextStatuses(from, roles, isRequester).includes(to);
}

const severityWeight: Record<Impact | Urgency, number> = {
  [Impact.LOW]: 1,
  [Impact.MEDIUM]: 2,
  [Impact.HIGH]: 3,
  [Impact.CRITICAL]: 4,
};

export function calculatePriorityFromImpactUrgency(impact: Impact, urgency: Urgency): Priority {
  const score = severityWeight[impact] * severityWeight[urgency];
  if (score >= 12) return Priority.CRITICAL;
  if (score >= 8) return Priority.HIGH;
  if (score >= 4) return Priority.MEDIUM;
  return Priority.LOW;
}

export const TICKET_LINK_TYPE_LABELS: Record<TicketLinkType, string> = {
  [TicketLinkType.DUPLICATE]: "Doublon",
  [TicketLinkType.DEPENDS_ON]: "Dépend de",
  [TicketLinkType.BLOCKS]: "Bloque",
  [TicketLinkType.PARENT]: "Parent",
  [TicketLinkType.CHILD]: "Enfant",
};

export function canAssignTicket(roles: RoleCode[]): boolean {
  return roles.some((role) => managerRoles.has(role));
}

export function canPostInternalMessage(roles: RoleCode[]): boolean {
  return roles.some((role) => isStaffRole(role));
}

export function canConfirmResolution(roles: RoleCode[], isRequester: boolean): boolean {
  return isRequester || roles.includes(RoleCode.FUNCTIONAL_ADMIN);
}

export function canReopenResolution(roles: RoleCode[], isRequester: boolean): boolean {
  return isRequester || roles.includes(RoleCode.FUNCTIONAL_ADMIN);
}

export function makeTicketReference(now = new Date(), suffix = crypto.randomUUID()): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `TCK-${date}-${suffix.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export function requiredResolutionFields(): readonly string[] {
  return ["cause", "action", "solution"];
}
