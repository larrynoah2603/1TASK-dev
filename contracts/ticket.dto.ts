import type { PaginationDTO } from "@/contracts/pagination.dto";

export type JsonDTO<T> = T extends Date
  ? string
  : T extends readonly (infer Item)[]
    ? JsonDTO<Item>[]
    : T extends object
      ? { [Key in keyof T]: JsonDTO<T[Key]> }
      : T;

/** Version 1 scalar contract. Adding persistence columns does not change it. */
export interface TicketDTO {
  id: string;
  reference: string;
  title: string;
  description: string;
  requestedService: string | null;
  type: string;
  category: string;
  priority: string;
  impact: string;
  urgency: string;
  legalDueAt: string | null;
  status: string;
  requesterId: string;
  sourceDepartmentId: string | null;
  assignedToId: string | null;
  queueId: string;
  serviceCatalogItemId: string;
  dossierId: string | null;
  missionId: string | null;
  assetId: string | null;
  confidential: boolean;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  autoClosureDueAt: string | null;
  slaPausedAt: string | null;
  totalPausedMinutes: number;
  blockReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListItemDTO {
  id: string;
  reference: string;
  title: string;
  status: string;
  priority: string;
  confidential: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
  slaState: string;
  slaDueAt: string | null;
  queue: { id: string; name: string; departmentId: string; department: { id: string; name: string } };
  assignedTo: { id: string; name: string } | null;
  requester: { id: string; name: string };
  sourceDepartment: { id: string; name: string; code: string } | null;
  serviceCatalogItem: { name: string; code: string; category: string };
}

export interface TicketListDTO {
  data: TicketListItemDTO[];
  pagination: PaginationDTO;
}

/** Explicit v1 detail contract: domain additions cannot leak into the API. */
export interface TicketDetailDTO extends TicketDTO {
  blockDetails: string | null;
  resolutionCause: string | null;
  resolutionAction: string | null;
  resolutionSolution: string | null;
  preventiveAction: string | null;
  reopenedReason: string | null;
  requester: { id: string; name: string };
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
  mission: { id: string; code: string; name: string; status: string; dueAt: string | null; budgetMinutes: number | null } | null;
  messages: Array<{
    id: string; ticketId: string; authorId: string; body: string; visibility: "REQUESTER" | "INTERNAL";
    createdAt: string; updatedAt: string; author: { id: string; name: string };
  }>;
  assignments: Array<{
    id: string; ticketId: string; queueId: string; previousAssigneeId: string | null;
    newAssigneeId: string | null; assignedById: string | null; reason: string | null; assignedAt: string;
    assignedBy: { name: string } | null; previousAssignee: { name: string } | null; newAssignee: { name: string } | null;
  }>;
  events: Array<{
    id: string; eventKey: string | null; ticketId: string; actorId: string | null; queueId: string | null;
    eventType: string; fromStatus: string | null; toStatus: string | null; metadata: unknown;
    createdAt: string; actor: { name: string } | null;
  }>;
  worklogSummary: { minutes: number; entries: number };
  missionWorklogMinutes: number;
}
