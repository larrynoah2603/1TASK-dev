/**
 * Domain representation of a Ticket.
 *
 * Ce modèle appartient au domaine métier.
 * Il ne doit dépendre ni de Prisma ni de l'API.
 *
 * Prisma -> Mapper -> TicketDomain -> DTO
 */


export type TicketStatusDomain =
  | "NEW"
  | "TO_QUALIFY"
  | "TO_ASSIGN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "RESOLUTION_PENDING"
  | "REOPENED"
  | "CLOSED";


export type TicketPriorityDomain =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";


export type TicketImpactDomain =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";


export type TicketUrgencyDomain =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";


export interface TicketDomain {

  id: string;

  reference: string;


  title: string;

  description: string;


  requestedService?: string | null;


  type: string;

  category: string;


  priority: TicketPriorityDomain;

  impact: TicketImpactDomain;

  urgency: TicketUrgencyDomain;


  status: TicketStatusDomain;


  requesterId: string;

  createdById: string;


  assignedToId?: string | null;

  queueId: string;


  serviceCatalogItemId: string;


  dossierId?: string | null;

  missionId?: string | null;

  assetId?: string | null;


  slaId?: string | null;


  confidential: boolean;


  firstResponseDueAt?: Date | null;

  resolutionDueAt?: Date | null;


  resolvedAt?: Date | null;

  closedAt?: Date | null;


  blockReason?: string | null;

  blockDetails?: string | null;


  resolutionCause?: string | null;

  resolutionAction?: string | null;

  resolutionSolution?: string | null;


  reopenedReason?: string | null;


  createdAt: Date;

  updatedAt: Date;

}