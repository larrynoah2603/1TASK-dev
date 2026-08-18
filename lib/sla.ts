import { SlaCalculationMode, TicketStatus } from "@prisma/client";

export const SLA_RISK_WINDOW_MINUTES = 60;

export type TicketSlaState = "NONE" | "OK" | "AT_RISK" | "BREACHED" | "PAUSED";

export interface TicketSlaStateResult {
  state: TicketSlaState;
  dueAt: Date | null;
}

export function getTicketSlaState(
  input: {
    status: TicketStatus;
    firstResponseDueAt: Date | null;
    resolutionDueAt: Date | null;
    firstRespondedAt: Date | null;
    resolvedAt: Date | null;
    slaPausedAt: Date | null;
  },
  now = new Date(),
): TicketSlaStateResult {
  if (input.status === TicketStatus.CLOSED) return { state: "NONE", dueAt: null };

  const dueDates = [
    !input.firstRespondedAt ? input.firstResponseDueAt : null,
    input.status !== TicketStatus.RESOLUTION_PENDING && !input.resolvedAt
      ? input.resolutionDueAt
      : null,
  ].filter((value): value is Date => value instanceof Date);

  if (!dueDates.length) return { state: "NONE", dueAt: null };
  const dueAt = dueDates.sort((left, right) => left.getTime() - right.getTime())[0];

  if (input.status === TicketStatus.BLOCKED || input.slaPausedAt) {
    return { state: "PAUSED", dueAt };
  }

  const riskLimit = now.getTime() + SLA_RISK_WINDOW_MINUTES * 60_000;
  if (dueDates.some((date) => date.getTime() < now.getTime())) {
    return { state: "BREACHED", dueAt };
  }
  if (dueDates.some((date) => date.getTime() <= riskLimit)) {
    return { state: "AT_RISK", dueAt };
  }
  return { state: "OK", dueAt };
}

export interface BusinessCalendarInput {
  workingDays: number[];
  workdayStartMinute: number;
  workdayEndMinute: number;
  holidays: Date[];
}

export interface SlaInput {
  firstResponseMinutes: number;
  resolutionMinutes: number;
  calculationMode: SlaCalculationMode;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isHoliday(date: Date, holidays: Date[]): boolean {
  const key = dateKey(date);
  return holidays.some((holiday) => dateKey(holiday) === key);
}

function isWorkingDate(date: Date, calendar: BusinessCalendarInput): boolean {
  const weekday = date.getDay() === 0 ? 7 : date.getDay();
  return calendar.workingDays.includes(weekday) && !isHoliday(date, calendar.holidays);
}

function atMinuteOfDay(date: Date, minute: number): Date {
  const result = new Date(date);
  result.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return result;
}

export function addBusinessMinutes(
  start: Date,
  minutes: number,
  calendar: BusinessCalendarInput,
): Date {
  if (minutes <= 0) return new Date(start);

  let cursor = new Date(start);
  let remaining = minutes;

  while (remaining > 0) {
    if (!isWorkingDate(cursor, calendar)) {
      cursor.setDate(cursor.getDate() + 1);
      cursor = atMinuteOfDay(cursor, calendar.workdayStartMinute);
      continue;
    }

    const startOfWork = atMinuteOfDay(cursor, calendar.workdayStartMinute);
    const endOfWork = atMinuteOfDay(cursor, calendar.workdayEndMinute);

    if (cursor < startOfWork) cursor = startOfWork;
    if (cursor >= endOfWork) {
      cursor.setDate(cursor.getDate() + 1);
      cursor = atMinuteOfDay(cursor, calendar.workdayStartMinute);
      continue;
    }

    const available = Math.floor((endOfWork.getTime() - cursor.getTime()) / 60_000);
    const consumed = Math.min(available, remaining);
    cursor = new Date(cursor.getTime() + consumed * 60_000);
    remaining -= consumed;
  }

  return cursor;
}

export function calculateSlaDeadlines(
  start: Date,
  sla: SlaInput,
  calendar: BusinessCalendarInput,
  milestone = start,
): { firstResponseDueAt: Date; resolutionDueAt: Date } {
  const anchor = sla.calculationMode === SlaCalculationMode.RELATIVE_MILESTONE ? milestone : start;
  if (sla.calculationMode === SlaCalculationMode.ABSOLUTE) {
    return {
      firstResponseDueAt: new Date(anchor.getTime() + sla.firstResponseMinutes * 60_000),
      resolutionDueAt: new Date(anchor.getTime() + sla.resolutionMinutes * 60_000),
    };
  }

  return {
    firstResponseDueAt: addBusinessMinutes(anchor, sla.firstResponseMinutes, calendar),
    resolutionDueAt: addBusinessMinutes(anchor, sla.resolutionMinutes, calendar),
  };
}

export function slaProgressPercent(
  now: Date,
  start: Date,
  dueAt: Date | null,
  pausedMinutes = 0,
): number {
  if (!dueAt) return 0;
  const total = dueAt.getTime() - start.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime() - pausedMinutes * 60_000;
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}
