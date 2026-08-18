import { describe, expect, it } from "vitest";
import { SlaCalculationMode } from "@prisma/client";
import { addBusinessMinutes, calculateSlaDeadlines, getTicketSlaState, slaProgressPercent } from "@/lib/sla";

const calendar = { workingDays: [1, 2, 3, 4, 5], workdayStartMinute: 8 * 60, workdayEndMinute: 17 * 60, holidays: [] };

describe("calcul des SLA", () => {
  it("ne consomme pas les heures hors calendrier ouvré", () => {
    const fridayAtFour = new Date(2026, 7, 7, 16, 0, 0);
    const result = addBusinessMinutes(fridayAtFour, 120, calendar);
    expect(result.getDay()).toBe(1);
    expect(result.getHours()).toBe(9);
  });

  it("calcule les deux échéances avec le mode glissant", () => {
    const start = new Date(2026, 7, 3, 8, 0, 0);
    const deadlines = calculateSlaDeadlines(start, { firstResponseMinutes: 60, resolutionMinutes: 480, calculationMode: SlaCalculationMode.ROLLING }, calendar);
    expect(deadlines.firstResponseDueAt.getHours()).toBe(9);
    expect(deadlines.resolutionDueAt.getDate()).toBe(3);
    expect(deadlines.resolutionDueAt.getHours()).toBe(16);
  });

  it("déduit le temps de blocage du pourcentage SLA", () => {
    const start = new Date(2026, 7, 3, 8, 0, 0);
    const due = new Date(2026, 7, 3, 12, 0, 0);
    const now = new Date(2026, 7, 3, 12, 0, 0);
    expect(slaProgressPercent(now, start, due, 120)).toBe(50);
  });

  it("distingue un SLA proche, dépassé et en pause", () => {
    const now = new Date(2026, 7, 3, 10, 0, 0);
    const base = {
      status: "IN_PROGRESS" as const,
      firstResponseDueAt: null,
      resolutionDueAt: new Date(2026, 7, 3, 10, 30, 0),
      firstRespondedAt: new Date(2026, 7, 3, 8, 30, 0),
      resolvedAt: null,
      slaPausedAt: null,
    };
    expect(getTicketSlaState(base, now).state).toBe("AT_RISK");
    expect(getTicketSlaState({ ...base, resolutionDueAt: new Date(2026, 7, 3, 9, 59, 0) }, now).state).toBe("BREACHED");
    expect(getTicketSlaState({ ...base, slaPausedAt: new Date(2026, 7, 3, 9, 30, 0) }, now).state).toBe("PAUSED");
  });
});
