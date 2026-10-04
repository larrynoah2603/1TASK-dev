import { TicketStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dueAt = new Date("2026-10-03T10:00:00.000Z");
const now = new Date("2026-10-03T10:00:00.000Z");
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), eventCreate: vi.fn(),
  auditCreate: vi.fn(), notificationCreateMany: vi.fn(), outboxCreate: vi.fn(),
}));
const { findMany, findUnique, updateMany, eventCreate, auditCreate, notificationCreateMany, outboxCreate } = mocks;

vi.mock("@/lib/db", () => ({
  prisma: {
    ticket: { findMany: mocks.findMany, findUnique: mocks.findUnique, updateMany: mocks.updateMany },
    ticketEvent: { create: mocks.eventCreate },
    auditLog: { create: mocks.auditCreate },
    notification: { createMany: mocks.notificationCreateMany },
    outboxEvent: { create: mocks.outboxCreate },
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({
      ticket: { findUnique: mocks.findUnique, updateMany: mocks.updateMany },
      ticketEvent: { create: mocks.eventCreate },
      auditLog: { create: mocks.auditCreate },
      notification: { createMany: mocks.notificationCreateMany },
      outboxEvent: { create: mocks.outboxCreate },
    })),
  },
}));

import { automaticClosureEventKey, runAutomaticClosures } from "@/lib/sla-monitor";

describe("clôture automatique idempotente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([{ id: "ticket-1" }]);
    findUnique.mockResolvedValue({ id: "ticket-1", reference: "T-1", requesterId: "requester-1", queueId: "queue-1", status: TicketStatus.RESOLUTION_PENDING, autoClosureDueAt: dueAt });
  });

  it("ferme exactement à l’échéance avec une identité système et sans livraison externe", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    expect(await runAutomaticClosures(now, 10)).toEqual({ scanned: 1, closed: 1 });
    expect(eventCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: null, action: "TICKET_AUTOMATICALLY_CLOSED" }) }));
    expect(notificationCreateMany).toHaveBeenCalledTimes(1);
    expect(outboxCreate).not.toHaveBeenCalled();
  });

  it("ne double pas la clôture lorsque deux jobs ou une confirmation gagnent la course", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    expect(await runAutomaticClosures(now, 10)).toEqual({ scanned: 1, closed: 0 });
    expect(eventCreate).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
    expect(notificationCreateMany).not.toHaveBeenCalled();
  });

  it("distingue les cycles après réouverture par leur échéance persistée", () => {
    expect(automaticClosureEventKey("ticket-1", dueAt)).not.toBe(automaticClosureEventKey("ticket-1", new Date(dueAt.getTime() + 1)));
  });
});
