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
  timezone?: string;
}

export interface SlaInput {
  firstResponseMinutes: number;
  resolutionMinutes: number;
  calculationMode: SlaCalculationMode;
}

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

function zonedParts(date: Date, timezone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
  return { year, month, day, hour: value("hour"), minute: value("minute"), weekday };
}

function localDateKey(parts: Pick<ZonedDateParts, "year" | "month" | "day">): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function isHoliday(parts: ZonedDateParts, holidays: Date[]): boolean {
  const key = localDateKey(parts);
  return holidays.some((holiday) => holiday.toISOString().slice(0, 10) === key);
}

function isWorkingDate(parts: ZonedDateParts, calendar: BusinessCalendarInput): boolean {
  return calendar.workingDays.includes(parts.weekday) && !isHoliday(parts, calendar.holidays);
}

function localDateAtMinute(parts: ZonedDateParts, minute: number, timezone: string): Date {
  const targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day, Math.floor(minute / 60), minute % 60);
  let instant = targetUtc;
  // Two passes cover ordinary offsets and daylight-saving transitions without
  // coupling the SLA engine to the host process timezone.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = zonedParts(new Date(instant), timezone);
    const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    instant += targetUtc - actualUtc;
  }
  return new Date(instant);
}

function nextLocalDate(parts: ZonedDateParts): ZonedDateParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  const weekday = next.getUTCDay() || 7;
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
    hour: 0,
    minute: 0,
    weekday,
  };
}

export function addBusinessMinutes(
  start: Date,
  minutes: number,
  calendar: BusinessCalendarInput,
): Date {
  if (minutes <= 0) return new Date(start);

  let cursor = new Date(start);
  let remaining = minutes;
  const timezone = calendar.timezone ?? "UTC";

  while (remaining > 0) {
    let local = zonedParts(cursor, timezone);
    if (!isWorkingDate(local, calendar)) {
      local = nextLocalDate(local);
      cursor = localDateAtMinute(local, calendar.workdayStartMinute, timezone);
      continue;
    }

    const startOfWork = localDateAtMinute(local, calendar.workdayStartMinute, timezone);
    const endOfWork = localDateAtMinute(local, calendar.workdayEndMinute, timezone);

    if (cursor < startOfWork) cursor = startOfWork;
    if (cursor >= endOfWork) {
      local = nextLocalDate(local);
      cursor = localDateAtMinute(local, calendar.workdayStartMinute, timezone);
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
  const pausedMilliseconds = Math.max(0, pausedMinutes) * 60_000;
  const total = dueAt.getTime() - start.getTime() - pausedMilliseconds;
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime() - pausedMilliseconds;
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}
