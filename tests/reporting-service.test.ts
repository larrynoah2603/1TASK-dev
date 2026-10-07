import { Priority, TicketStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  groupBy: vi.fn(),
  hasPermission: vi.fn(),
  visibleTicketWhere: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { ticket: { count: mocks.count, groupBy: mocks.groupBy } },
}));
vi.mock("@/lib/server-auth", () => ({
  AuthorizationError: class AuthorizationError extends Error { statusCode = 403; },
  hasPermission: mocks.hasPermission,
  requireCurrentActor: vi.fn(async (actor: unknown) => actor),
}));
vi.mock("@/lib/ticket-query-service", () => ({ visibleTicketWhere: mocks.visibleTicketWhere }));

import { getReportingSummary } from "@/lib/reporting-service";

describe("reporting métier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPermission.mockReturnValue(true);
    mocks.visibleTicketWhere.mockResolvedValue({ confidential: false });
    mocks.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(5);
    mocks.groupBy
      .mockResolvedValueOnce([
        { status: TicketStatus.CLOSED, priority: Priority.MEDIUM, _count: { _all: 3 } },
        { status: TicketStatus.CLOSED, priority: Priority.CRITICAL, _count: { _all: 1 } },
        { status: TicketStatus.NEW, priority: Priority.MEDIUM, _count: { _all: 4 } },
        { status: TicketStatus.NEW, priority: Priority.HIGH, _count: { _all: 2 } },
      ])
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2026-10-07T08:00:00.000Z"),
          resolvedAt: new Date("2026-10-07T09:00:00.000Z"),
          _count: { _all: 1 },
        },
        {
          createdAt: new Date("2026-10-07T08:00:00.000Z"),
          resolvedAt: new Date("2026-10-07T10:00:00.000Z"),
          _count: { _all: 1 },
        },
      ]);
  });

  it("calcule les indicateurs réels sans sortir du périmètre autorisé", async () => {
    const summary = await getReportingSummary({ id: "reader" } as never);

    expect(summary).toMatchObject({
      total: 10,
      closed: 4,
      overdue: 2,
      firstResponseBreached: 1,
      resolutionBreached: 2,
      closureRate: 40,
      slaTracked: 5,
      slaComplianceRate: 60,
      resolvedCount: 2,
      averageResolutionMinutes: 90,
      criticalCount: 1,
    });
    expect(summary.byPriority).toEqual([
      { priority: Priority.LOW, count: 0 },
      { priority: Priority.MEDIUM, count: 7 },
      { priority: Priority.HIGH, count: 2 },
      { priority: Priority.CRITICAL, count: 1 },
    ]);
    expect(summary.byStatus.find((row) => row.status === TicketStatus.CLOSED)?.count).toBe(4);
    expect(summary.byStatus.find((row) => row.status === TicketStatus.NEW)?.count).toBe(6);

    const overdueWhere = mocks.count.mock.calls[0][0].where;
    expect(JSON.stringify(overdueWhere)).toContain(TicketStatus.BLOCKED);
    expect(JSON.stringify(overdueWhere)).toContain("firstResponseDueAt");
    expect(JSON.stringify(overdueWhere)).toContain("resolutionDueAt");

    const trackedWhere = mocks.count.mock.calls[5][0].where;
    expect(JSON.stringify(trackedWhere)).toContain("firstResponseDueAt");
    expect(JSON.stringify(trackedWhere)).toContain("resolutionDueAt");

    expect(mocks.groupBy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      by: ["status", "priority"],
      where: { confidential: false },
    }));
    expect(mocks.groupBy).toHaveBeenNthCalledWith(2, {
      by: ["createdAt", "resolvedAt"],
      where: { AND: [{ confidential: false }, { resolvedAt: { not: null } }] },
      _count: { _all: true },
    });
  });

  it("refuse un acteur dépourvu de la permission reporting", async () => {
    mocks.hasPermission.mockReturnValue(false);

    await expect(getReportingSummary({ id: "reader" } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.visibleTicketWhere).not.toHaveBeenCalled();
  });
});
