import { beforeEach, describe, expect, it, vi } from "vitest";
import { csvCell } from "@/lib/csv-export";

const mock = vi.hoisted(() => ({
  requireCurrentActor: vi.fn(),
  hasPermission: vi.fn(),
  listVisibleTickets: vi.fn(),
  getReportingSummary: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  requireCurrentActor: mock.requireCurrentActor,
  hasPermission: mock.hasPermission,
  AuthorizationError: class AuthorizationError extends Error {},
}));
vi.mock("@/lib/ticket-query-service", () => ({
  listVisibleTickets: mock.listVisibleTickets,
}));
vi.mock("@/lib/reporting-service", () => ({
  getReportingSummary: mock.getReportingSummary,
}));
vi.mock("@/lib/db", () => ({
  prisma: { auditLog: { create: mock.auditCreate } },
}));

import { exportReportingSummary, exportVisibleTickets } from "@/lib/export-service";

beforeEach(() => {
  vi.resetAllMocks();
  mock.requireCurrentActor.mockResolvedValue({ id: "agent-1" });
  mock.hasPermission.mockReturnValue(true);
  mock.auditCreate.mockResolvedValue({});
});

describe("S1 — neutralisation des formules CSV", () => {
  it.each([
    ["=HYPERLINK(\"https://example.invalid\",\"ouvrir\")", "'=HYPERLINK"],
    ["+SUM(1,2)", "'+SUM"],
    ["-SUM(1,2)", "'-SUM"],
    ["@SUM(1,2)", "'@SUM"],
    ["  =1+1", "'=1+1"],
    ["\t=1+1", "'=1+1"],
    ["\r\n=1+1", "'=1+1"],
    ["\ufeff=1+1", "'=1+1"],
    ["\u200b=1+1", "'=1+1"],
    ["\uff1d1+1", "'\uff1d1+1"],
  ])("traite la saisie hostile comme texte et non comme formule : %s", (input, expectedStart) => {
    const cell = csvCell(input);
    expect(cell.startsWith(`"${expectedStart}`)).toBe(true);
    expect(cell).not.toContain("\r");
    expect(cell).not.toContain("\n");
    expect(cell).not.toContain("\t");
  });

  it("préserve les libellés normaux, nombres, dates, séparateurs et guillemets", () => {
    expect(csvCell("Besoin ordinateur")).toBe('"Besoin ordinateur"');
    expect(csvCell('Texte avec "citation", virgule')).toBe('"Texte avec ""citation"", virgule"');
    expect(csvCell(-2)).toBe('"-2"');
    expect(csvCell(new Date("2026-10-13T12:00:00Z"))).toBe('"2026-10-13T12:00:00.000Z"');
    expect(csvCell(null)).toBe('""');
  });

  it("protège le titre et les noms d'un ticket réellement exporté", async () => {
    mock.listVisibleTickets.mockResolvedValue([{
      confidential: false,
      reference: "TCK-1",
      title: "=HYPERLINK(\"https://evil.invalid\",\"ouvrir\")",
      status: "NEW",
      priority: "NORMAL",
      serviceCatalogItem: { name: "Équipement" },
      queue: {
        name: "@SUM(2,2)",
        department: { name: "+SUM(2,2)" },
      },
      requester: { name: "  -HYPERLINK(\"https://evil.invalid\")" },
      assignedTo: { name: "=SUM(1,2)" },
      slaState: "ON_TIME",
      slaDueAt: null,
    }]);
    const csv = await exportVisibleTickets({ id: "agent-1" } as never);
    expect(csv).toContain('"\'=HYPERLINK(');
    expect(csv).toContain('"\'+SUM(2,2)"');
    expect(csv).toContain('"\'@SUM(2,2)"');
    expect(csv).toContain('"\'-HYPERLINK(');
    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv.split("\r\n")).toHaveLength(3);
    expect(mock.auditCreate).toHaveBeenCalledOnce();
  });

  it("exclut les tickets confidentiels de l'export standard", async () => {
    mock.listVisibleTickets.mockResolvedValue([{
      confidential: true, reference: "SECRET", title: "=SUM(1,2)",
    }]);
    const csv = await exportVisibleTickets({ id: "agent-1" } as never);
    expect(csv).not.toContain("SECRET");
    expect(csv).not.toContain("SUM");
    expect(csv.split("\r\n")).toHaveLength(2);
  });

  it("réutilise le même encodage pour le reporting exporté", async () => {
    mock.getReportingSummary.mockResolvedValue({
      total: 4, closed: 1, cancelled: 0, completionDenominator: 4,
      overdue: 1, firstResponseBreached: 0, resolutionBreached: 1,
      pendingConfirmationDue: 0, pendingConfirmationOverdue: 0,
      slaComplianceRate: "=SUM(2,2)", averageResolutionMinutes: 20,
      resolvedCount: 1, criticalCount: 0, closureRate: 25,
      byStatus: [], byPriority: [],
    });
    const csv = await exportReportingSummary({ id: "agent-1" } as never);
    expect(csv).toContain('"\'=SUM(2,2)%"');
    expect(mock.auditCreate).toHaveBeenCalledOnce();
  });
});
