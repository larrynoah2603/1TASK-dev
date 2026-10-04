import type { Ticket } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toTicketDTO, toTicketDomain, toTicketListItemDTO } from "@/lib/mappers/ticket.mapper";
import type { TicketListItemDomain } from "@/lib/domain/ticket-list";

const persistedTicket: Ticket = {
  id: "ticket-1", reference: "TCK-1", title: "Test", description: "Description",
  requestedService: null, type: "INCIDENT", category: "Support", priority: "HIGH",
  impact: "MEDIUM", urgency: "HIGH", priorityOverrideReason: null, legalDueAt: null,
  status: "IN_PROGRESS", requesterId: "requester", sourceDepartmentId: "department",
  createdById: "creator", creationIdempotencyToken: null, assignedToId: "agent",
  queueId: "queue", serviceCatalogItemId: "service", dossierId: null, missionId: null,
  assetId: null, slaId: "sla", confidential: false,
  firstResponseDueAt: new Date("2026-09-17T10:00:00.000Z"),
  resolutionDueAt: new Date("2026-09-18T10:00:00.000Z"), firstRespondedAt: null,
  resolvedAt: null, closedAt: null, cancelledAt: null, cancellationReason: null, autoClosureDueAt: null, slaPausedAt: null, totalPausedMinutes: 0,
  blockReason: null, blockDetails: null, resolutionCause: null, resolutionAction: null,
  resolutionSolution: null, preventiveAction: null, reopenedReason: null,
  createdAt: new Date("2026-09-17T08:00:00.000Z"), updatedAt: new Date("2026-09-17T09:00:00.000Z"),
};

describe("ticket mappers", () => {
  it("maps every persisted scalar required by the ticket domain", () => {
    const domain = toTicketDomain(persistedTicket);
    expect(domain).toMatchObject({
      id: "ticket-1", sourceDepartmentId: "department", status: "IN_PROGRESS",
      firstRespondedAt: null, totalPausedMinutes: 0, preventiveAction: null,
    });
    expect(Object.keys(domain)).toHaveLength(Object.keys(persistedTicket).length);
  });

  it("serializes domain dates only at the DTO boundary", () => {
    const domain = toTicketDomain(persistedTicket);
    expect(domain.createdAt).toBeInstanceOf(Date);
    const dto = toTicketDTO(domain);
    expect(dto.createdAt).toBe("2026-09-17T08:00:00.000Z");
    expect(dto.firstResponseDueAt).toBe("2026-09-17T10:00:00.000Z");
  });

  it("preserves list relations and serializes nested API values", () => {
    const item: TicketListItemDomain = {
      id: "ticket-1", reference: "TCK-1", title: "Test", status: "IN_PROGRESS", priority: "HIGH",
      requesterId: "requester", assignedToId: null, queueId: "queue", confidential: false,
      category: "Support", createdAt: persistedTicket.createdAt, updatedAt: persistedTicket.updatedAt,
      firstResponseDueAt: null, firstRespondedAt: null, resolutionDueAt: null, resolvedAt: null, autoClosureDueAt: null,
      slaPausedAt: null, totalPausedMinutes: 0, slaState: "NONE", slaDueAt: null,
      queue: { id: "queue", name: "Support", departmentId: "department", department: { id: "department", name: "IT" }, manager: null, teams: [] },
      assignedTo: null, requester: { id: "requester", name: "Requester" },
      sourceDepartment: { id: "department", name: "IT", code: "IT" },
      serviceCatalogItem: { name: "Support", code: "SUPPORT", category: "Support" },
    };
    const dto = toTicketListItemDTO(item);
    expect(dto.queue.department.name).toBe("IT");
    expect(dto.createdAt).toBe("2026-09-17T08:00:00.000Z");
  });
});
