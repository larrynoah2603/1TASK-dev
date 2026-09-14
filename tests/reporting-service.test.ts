import { TicketStatus } from "@prisma/client";
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
vi.mock("@/lib/ticket-service", () => ({ visibleTicketWhere: mocks.visibleTicketWhere }));

import { getReportingSummary } from "@/lib/reporting-service";

describe("reporting métier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPermission.mockReturnValue(true);
    mocks.visibleTicketWhere.mockResolvedValue({ confidential: false });
    mocks.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    mocks.groupBy.mockResolvedValue([
      { status: TicketStatus.CLOSED, _count: { _all: 4 } },
      { status: TicketStatus.NEW, _count: { _all: 6 } },
    ]);
  });

  it("compte les dépassements actifs sans doubler un ticket", async () => {
    const summary = await getReportingSummary({ id: "reader" } as never);

    expect(summary).toMatchObject({
      total: 10,
      closed: 4,
      overdue: 2,
      firstResponseBreached: 1,
      resolutionBreached: 2,
      closureRate: 40,
    });
    const overdueWhere = mocks.count.mock.calls[0][0].where;
    expect(JSON.stringify(overdueWhere)).toContain(TicketStatus.BLOCKED);
    expect(JSON.stringify(overdueWhere)).toContain("firstResponseDueAt");
    expect(JSON.stringify(overdueWhere)).toContain("resolutionDueAt");
  });

  it("refuse un acteur dépourvu de la permission reporting", async () => {
    mocks.hasPermission.mockReturnValue(false);

    await expect(getReportingSummary({ id: "reader" } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.visibleTicketWhere).not.toHaveBeenCalled();
  });
});
