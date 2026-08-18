import { Priority, TicketType } from "@prisma/client";

export interface CatalogCandidate {
  id: string;
  code: string;
  name: string;
  ticketType: TicketType;
  category: string;
  queueId: string;
  priorityDefault: Priority;
  keywords: string[];
}

export interface RoutingDecision {
  serviceCatalogItemId: string;
  queueId: string;
  type: TicketType;
  category: string;
  priority: Priority;
  matchedBy: "catalog-id";
}

export function buildRoutingDecision(
  candidate: CatalogCandidate,
  matchedBy: RoutingDecision["matchedBy"],
): RoutingDecision {
  return {
    serviceCatalogItemId: candidate.id,
    queueId: candidate.queueId,
    type: candidate.ticketType,
    category: candidate.category,
    priority: candidate.priorityDefault,
    matchedBy,
  };
}

export function routeTicketFromCatalog(input: {
  serviceCatalogItemId: string;
  candidates: CatalogCandidate[];
}): RoutingDecision {
  const selected = input.candidates.find((candidate) => candidate.id === input.serviceCatalogItemId);
  if (!selected) throw new Error("Aucun service du catalogue ne correspond à la demande.");
  return buildRoutingDecision(selected, "catalog-id");
}

export interface AssignmentCandidate {
  userId: string;
  isAvailable: boolean;
  isActive: boolean;
  skills: string[];
  openTicketCount: number;
  absentUntil?: Date | null;
}

export function chooseAutoAssignmentCandidate(
  candidates: AssignmentCandidate[],
  requiredSkills: string[] = [],
  now = new Date(),
): AssignmentCandidate | null {
  const normalize = (value: string) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const required = requiredSkills.map(normalize);
  const eligible = candidates.filter((candidate) => {
    const available = candidate.isActive && candidate.isAvailable;
    const absent = candidate.absentUntil ? candidate.absentUntil > now : false;
    const skills = candidate.skills.map(normalize);
    const hasSkills = required.every((skill) => skills.includes(skill));
    return available && !absent && hasSkills;
  });

  return (
    eligible.sort((a, b) => a.openTicketCount - b.openTicketCount || a.userId.localeCompare(b.userId))[0] ?? null
  );
}
