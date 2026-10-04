import { Prisma, RoleCode, TicketEventType, TicketStatus } from "@prisma/client";
import { appendAuditLog } from "@/lib/audit";
import type { ProductCapabilities } from "@/lib/product-policy";

export function shouldAutomaticallyAssign(capabilities: ProductCapabilities, queueAutoAssignment: boolean): boolean {
  return capabilities.autoAssignment && queueAutoAssignment;
}

export function automaticAssignmentOutcome(candidateId: string | null | undefined, unassignedStatus: TicketStatus) {
  return candidateId
    ? { assignedToId: candidateId, status: TicketStatus.ASSIGNED }
    : { assignedToId: null, status: unassignedStatus };
}

export async function chooseAutoAssignee(
  db: Prisma.TransactionClient,
  queueId: string,
  requiredSkills: string[],
) {
  const members = await db.teamMember.findMany({
    where: {
      isActive: true,
      team: { queueId, isActive: true },
      user: { status: "ACTIVE", roleAssignments: { some: { role: { code: RoleCode.AGENT } } } },
    },
    select: { userId: true, isActive: true, isAvailable: true, skills: true },
  });
  if (!members.length) return null;
  const counts = await db.ticket.groupBy({
    by: ["assignedToId"],
    where: { queueId, assignedToId: { in: members.map((member) => member.userId) }, status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] } },
    _count: { _all: true },
  });
  const countByUser = new Map(counts.map((entry) => [entry.assignedToId, entry._count._all]));
  const normalizedSkills = requiredSkills.map((skill) => skill.toLowerCase());
  return members
    .filter((member) => member.isActive && member.isAvailable && normalizedSkills.every((skill) => member.skills.map((item) => item.toLowerCase()).includes(skill)))
    .sort((left, right) => (countByUser.get(left.userId) ?? 0) - (countByUser.get(right.userId) ?? 0) || left.userId.localeCompare(right.userId))[0] ?? null;
}

export async function recordAssignment(
  tx: Prisma.TransactionClient,
  input: {
    ticketId: string; queueId: string; previousAssigneeId: string | null; newAssigneeId: string | null;
    assignedById: string; reason?: string; fromStatus: TicketStatus; toStatus: TicketStatus;
    assignmentMode: "MANUAL" | "AUTO" | "CLAIM" | "UNASSIGN" | "TRANSFER";
  },
) {
  await tx.ticketAssignment.create({ data: {
    ticketId: input.ticketId, queueId: input.queueId, previousAssigneeId: input.previousAssigneeId,
    newAssigneeId: input.newAssigneeId, assignedById: input.assignedById, reason: input.reason,
  } });
  await tx.ticketEvent.create({ data: {
    ticketId: input.ticketId, actorId: input.assignedById, queueId: input.queueId,
    eventType: TicketEventType.ASSIGNED, fromStatus: input.fromStatus, toStatus: input.toStatus,
    metadata: { assignmentMode: input.assignmentMode, previousAssigneeId: input.previousAssigneeId, newAssigneeId: input.newAssigneeId },
  } });
  await appendAuditLog(tx, {
    actorId: input.assignedById,
    action: input.assignmentMode === "CLAIM" ? "TICKET_CLAIMED" : input.assignmentMode === "UNASSIGN" ? "TICKET_UNASSIGNED" : input.previousAssigneeId ? "TICKET_REASSIGNED" : "TICKET_ASSIGNED",
    objectType: "Ticket", objectId: input.ticketId,
    oldValue: { assignedToId: input.previousAssigneeId, status: input.fromStatus },
    newValue: { assignedToId: input.newAssigneeId, status: input.toStatus, assignmentMode: input.assignmentMode },
    reason: input.reason,
  });
}
