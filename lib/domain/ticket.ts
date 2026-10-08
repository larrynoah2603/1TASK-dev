/** Framework-independent Ticket domain models. */

export type TicketStatusDomain =
  | "NEW" | "TO_QUALIFY" | "TO_ASSIGN" | "ASSIGNED" | "IN_PROGRESS"
  | "BLOCKED" | "RESOLUTION_PENDING" | "REOPENED" | "CLOSED" | "CANCELLED";

export type TicketPriorityDomain = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TicketImpactDomain = TicketPriorityDomain;
export type TicketUrgencyDomain = TicketPriorityDomain;
export type TicketTypeDomain =
  | "INCIDENT" | "SERVICE_REQUEST" | "QUESTION" | "ACCESS_REQUEST"
  | "OTHER" | "PRODUCTION_TASK" | "CHANGE_REQUEST";
export type TicketBlockReasonDomain =
  | "REQUESTER_WAITING" | "SUPPLIER_WAITING" | "OTHER_TEAM_WAITING"
  | "VALIDATION_REQUIRED" | "EXTERNAL_PROBLEM" | "MISSING_INFORMATION";

export interface TicketDomain {
  id: string;
  reference: string;
  title: string;
  description: string;
  requestedService: string | null;
  type: TicketTypeDomain;
  category: string;
  priority: TicketPriorityDomain;
  impact: TicketImpactDomain;
  urgency: TicketUrgencyDomain;
  priorityOverrideReason: string | null;
  legalDueAt: Date | null;
  status: TicketStatusDomain;
  requesterId: string;
  sourceDepartmentId: string | null;
  createdById: string;
  creationIdempotencyToken: string | null;
  assignedToId: string | null;
  queueId: string;
  serviceCatalogItemId: string;
  dossierId: string | null;
  missionId: string | null;
  assetId: string | null;
  slaId: string | null;
  confidential: boolean;
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  autoClosureDueAt: Date | null;
  slaPausedAt: Date | null;
  totalPausedMinutes: number;
  blockReason: TicketBlockReasonDomain | null;
  blockDetails: string | null;
  resolutionCause: string | null;
  resolutionAction: string | null;
  resolutionSolution: string | null;
  preventiveAction: string | null;
  reopenedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketDetailDomain extends TicketDomain {
  requester: { id: string; name: string; image: string | null };
  sourceDepartment: { id: string; name: string; code: string } | null;
  assignedTo: { id: string; name: string } | null;
  queue: {
    id: string;
    name: string;
    code: string;
    managerId: string | null;
    manager: { id: string; name: string } | null;
    departmentId: string;
    department: { id: string; name: string; code: string };
  };
  serviceCatalogItem: { id: string; name: string; code: string; category: string };
  dossier: { id: string; code: string; name: string; client: { id: string; code: string; name: string } } | null;
  mission: { id: string; code: string; name: string; status: string; dueAt: Date | null; budgetMinutes: number | null } | null;
  messages: Array<{
    id: string; ticketId: string; authorId: string; body: string; visibility: "REQUESTER" | "INTERNAL";
    createdAt: Date; updatedAt: Date; author: { id: string; name: string };
  }>;
  assignments: Array<{
    id: string; ticketId: string; queueId: string; previousAssigneeId: string | null;
    newAssigneeId: string | null; assignedById: string | null; reason: string | null; assignedAt: Date;
    assignedBy: { name: string } | null; previousAssignee: { name: string } | null; newAssignee: { name: string } | null;
  }>;
  events: Array<{
    id: string; eventKey: string | null; ticketId: string; actorId: string | null; queueId: string | null;
    eventType: string; fromStatus: TicketStatusDomain | null; toStatus: TicketStatusDomain | null;
    metadata: unknown; createdAt: Date; actor: { name: string } | null;
  }>;
  worklogSummary: { minutes: number; entries: number };
  missionWorklogMinutes: number;
}
