import type { TicketPriorityDomain, TicketStatusDomain } from "@/lib/domain/ticket";

export type TicketSlaStateDomain = "NONE" | "OK" | "AT_RISK" | "BREACHED" | "PAUSED";

export interface TicketListItemDomain {
  id: string;
  reference: string;
  title: string;
  status: TicketStatusDomain;
  priority: TicketPriorityDomain;
  requesterId: string;
  assignedToId: string | null;
  queueId: string;
  confidential: boolean;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  firstResponseDueAt: Date | null;
  firstRespondedAt: Date | null;
  resolutionDueAt: Date | null;
  resolvedAt: Date | null;
  slaPausedAt: Date | null;
  totalPausedMinutes: number;
  slaState: TicketSlaStateDomain;
  slaDueAt: Date | null;
  queue: {
    id: string; name: string; departmentId: string;
    department: { id: string; name: string };
    manager: { id: string; name: string } | null;
    teams: Array<{ id: string; isActive: boolean }>;
  };
  assignedTo: { id: string; name: string } | null;
  requester: { id: string; name: string };
  sourceDepartment: { id: string; name: string; code: string } | null;
  serviceCatalogItem: { name: string; code: string; category: string };
}
