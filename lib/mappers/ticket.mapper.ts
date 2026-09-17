import type { Ticket as PrismaTicket } from "@prisma/client";
import type { TicketDetailDTO, TicketDTO, TicketListItemDTO, JsonDTO } from "@/contracts/ticket.dto";
import type { TicketDetailDomain, TicketDomain } from "@/lib/domain/ticket";
import type { TicketListItemDomain } from "@/lib/domain/ticket-list";

/** The only mapper that knows the Prisma Ticket persistence type. */
export function toTicketDomain(ticket: PrismaTicket): TicketDomain {
  return {
    id: ticket.id,
    reference: ticket.reference,
    title: ticket.title,
    description: ticket.description,
    requestedService: ticket.requestedService,
    type: ticket.type,
    category: ticket.category,
    priority: ticket.priority,
    impact: ticket.impact,
    urgency: ticket.urgency,
    priorityOverrideReason: ticket.priorityOverrideReason,
    legalDueAt: ticket.legalDueAt,
    status: ticket.status,
    requesterId: ticket.requesterId,
    sourceDepartmentId: ticket.sourceDepartmentId,
    createdById: ticket.createdById,
    creationIdempotencyToken: ticket.creationIdempotencyToken,
    assignedToId: ticket.assignedToId,
    queueId: ticket.queueId,
    serviceCatalogItemId: ticket.serviceCatalogItemId,
    dossierId: ticket.dossierId,
    missionId: ticket.missionId,
    assetId: ticket.assetId,
    slaId: ticket.slaId,
    confidential: ticket.confidential,
    firstResponseDueAt: ticket.firstResponseDueAt,
    resolutionDueAt: ticket.resolutionDueAt,
    firstRespondedAt: ticket.firstRespondedAt,
    resolvedAt: ticket.resolvedAt,
    closedAt: ticket.closedAt,
    slaPausedAt: ticket.slaPausedAt,
    totalPausedMinutes: ticket.totalPausedMinutes,
    blockReason: ticket.blockReason,
    blockDetails: ticket.blockDetails,
    resolutionCause: ticket.resolutionCause,
    resolutionAction: ticket.resolutionAction,
    resolutionSolution: ticket.resolutionSolution,
    preventiveAction: ticket.preventiveAction,
    reopenedReason: ticket.reopenedReason,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

/** Marks the optimized list projection as a domain read model. */
export function toTicketListItemDomain(ticket: TicketListItemDomain): TicketListItemDomain {
  return { ...ticket };
}

function serializeDTO<T>(value: T): JsonDTO<T> {
  if (value instanceof Date) return value.toISOString() as JsonDTO<T>;
  if (Array.isArray(value)) return value.map((item) => serializeDTO(item)) as JsonDTO<T>;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeDTO(item)]),
    ) as JsonDTO<T>;
  }
  return value as JsonDTO<T>;
}

export function toTicketDTO(ticket: TicketDomain): TicketDTO {
  return {
    id: ticket.id, reference: ticket.reference, title: ticket.title, description: ticket.description,
    requestedService: ticket.requestedService, type: ticket.type, category: ticket.category,
    priority: ticket.priority, impact: ticket.impact, urgency: ticket.urgency,
    legalDueAt: ticket.legalDueAt?.toISOString() ?? null, status: ticket.status,
    requesterId: ticket.requesterId, sourceDepartmentId: ticket.sourceDepartmentId,
    assignedToId: ticket.assignedToId, queueId: ticket.queueId,
    serviceCatalogItemId: ticket.serviceCatalogItemId, dossierId: ticket.dossierId,
    missionId: ticket.missionId, assetId: ticket.assetId, confidential: ticket.confidential,
    firstResponseDueAt: ticket.firstResponseDueAt?.toISOString() ?? null,
    resolutionDueAt: ticket.resolutionDueAt?.toISOString() ?? null,
    firstRespondedAt: ticket.firstRespondedAt?.toISOString() ?? null,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null, closedAt: ticket.closedAt?.toISOString() ?? null,
    slaPausedAt: ticket.slaPausedAt?.toISOString() ?? null, totalPausedMinutes: ticket.totalPausedMinutes,
    blockReason: ticket.blockReason, createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString(),
  };
}

export function toTicketListItemDTO(ticket: TicketListItemDomain): TicketListItemDTO {
  return {
    id: ticket.id, reference: ticket.reference, title: ticket.title, status: ticket.status,
    priority: ticket.priority, confidential: ticket.confidential, category: ticket.category,
    createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString(),
    slaState: ticket.slaState, slaDueAt: ticket.slaDueAt?.toISOString() ?? null,
    queue: {
      id: ticket.queue.id, name: ticket.queue.name, departmentId: ticket.queue.departmentId,
      department: ticket.queue.department,
    },
    assignedTo: ticket.assignedTo, requester: ticket.requester,
    sourceDepartment: ticket.sourceDepartment, serviceCatalogItem: ticket.serviceCatalogItem,
  };
}

export function toTicketDetailDTO(ticket: TicketDetailDomain): TicketDetailDTO {
  const { creationIdempotencyToken: _token, createdById: _createdById, slaId: _slaId, priorityOverrideReason: _override, ...publicTicket } = ticket;
  return serializeDTO(publicTicket);
}
