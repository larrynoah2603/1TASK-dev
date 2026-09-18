import type { TicketDetailDomain } from "@/lib/domain/ticket";
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

export type TicketDetailDTO = JsonDTO<Omit<
  TicketDetailDomain,
  "creationIdempotencyToken" | "createdById" | "slaId" | "priorityOverrideReason"
>>;
