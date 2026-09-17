import type { Ticket as PrismaTicket } from "@prisma/client";

import type {
  TicketDomain,
  TicketImpactDomain,
  TicketPriorityDomain,
  TicketStatusDomain,
  TicketUrgencyDomain,
} from "@/lib/domain/ticket";

import type { TicketDTO } from "@/contracts/ticket.dto";


function mapStatus(
  status: PrismaTicket["status"]
): TicketStatusDomain {
  return status;
}


function mapPriority(
  priority: PrismaTicket["priority"]
): TicketPriorityDomain {
  return priority;
}


function mapImpact(
  impact: PrismaTicket["impact"]
): TicketImpactDomain {
  return impact;
}


function mapUrgency(
  urgency: PrismaTicket["urgency"]
): TicketUrgencyDomain {
  return urgency;
}


/**
 * Prisma Ticket -> Domain Ticket
 */
export function toTicketDomain(
  ticket: PrismaTicket
): TicketDomain {

  return {

    id: ticket.id,

    reference: ticket.reference,


    title: ticket.title,

    description: ticket.description,


    requestedService:
      ticket.requestedService,


    type:
      ticket.type,


    category:
      ticket.category,


    priority:
      mapPriority(ticket.priority),


    impact:
      mapImpact(ticket.impact),


    urgency:
      mapUrgency(ticket.urgency),


    status:
      mapStatus(ticket.status),


    requesterId:
      ticket.requesterId,


    createdById:
      ticket.createdById,


    assignedToId:
      ticket.assignedToId,


    queueId:
      ticket.queueId,


    serviceCatalogItemId:
      ticket.serviceCatalogItemId,


    dossierId:
      ticket.dossierId,


    missionId:
      ticket.missionId,


    assetId:
      ticket.assetId,


    slaId:
      ticket.slaId,


    confidential:
      ticket.confidential,


    firstResponseDueAt:
      ticket.firstResponseDueAt,


    resolutionDueAt:
      ticket.resolutionDueAt,


    resolvedAt:
      ticket.resolvedAt,


    closedAt:
      ticket.closedAt,


    blockReason:
      ticket.blockReason,


    blockDetails:
      ticket.blockDetails,


    resolutionCause:
      ticket.resolutionCause,


    resolutionAction:
      ticket.resolutionAction,


    resolutionSolution:
      ticket.resolutionSolution,


    reopenedReason:
      ticket.reopenedReason,


    createdAt:
      ticket.createdAt,


    updatedAt:
      ticket.updatedAt,

  };
}


/**
 * Domain Ticket -> API DTO
 */
export function toTicketDTO(
  ticket: TicketDomain
): TicketDTO {

  return {

    id: ticket.id,

    reference:
      ticket.reference,


    title:
      ticket.title,


    description:
      ticket.description,


    status:
      ticket.status,


    priority:
      ticket.priority,


    createdAt:
      ticket.createdAt.toISOString(),


    updatedAt:
      ticket.updatedAt.toISOString(),

  };
}