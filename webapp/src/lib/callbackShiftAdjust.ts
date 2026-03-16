/**
 * Shift-aware callback time adjustment.
 * When a callback is scheduled > 1 hour from now, ensure it falls within the user's shift
 * and not on a week-off or leave day; otherwise move to next working day at shift start.
 */

const ONE_HOUR_MS = 60 * 60 * 1000;
const DEFAULT_SHIFT_TZ_OFFSET_MINUTES = 330; // Asia/Kolkata UTC+5:30

/** Weekday 0=Sun .. 6=Sat. weekOffDays e.g. "sunday,saturday" → [0, 6]. */
function getWeekOffWeekdays(weekOffDays: string | null | undefined): number[] {
  if (!weekOffDays || typeof weekOffDays !== "string") return [];
  const map: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return weekOffDays
    .split(",")
    .map((d) => map[d.trim().toLowerCase()])
    .filter((n) => n !== undefined);
}

/** Parse "09:30" or "09:30:00" to [hours, minutes]. */
function parseTimeStr(timeStr: string | null | undefined): [number, number] | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const part = timeStr.trim().slice(0, 8);
  const [h, m] = part.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return [h, Number.isNaN(m) ? 0 : m];
}

/** True if shift spans midnight (e.g. 22:00–04:00). end <= start when compared as time-of-day. */
function isOvernightShift(
  startParsed: [number, number],
  endParsed: [number, number]
): boolean {
  const startMin = startParsed[0] * 60 + startParsed[1];
  const endMin = endParsed[0] * 60 + endParsed[1];
  return endMin <= startMin;
}

/** Get date string YYYY-MM-DD in shift timezone from an ISO moment. offsetMin = minutes ahead of UTC (e.g. 330 for IST). */
function getDateInShiftTZ(iso: string, offsetMin: number): string {
  const utcMs = new Date(iso).getTime();
  if (!Number.isFinite(utcMs)) return "";
  const localMs = utcMs + offsetMin * 60 * 1000;
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Get weekday 0-6 (Sun-Sat) for a date in shift TZ. */
function getWeekdayInShiftTZ(iso: string, offsetMin: number): number {
  const utcMs = new Date(iso).getTime();
  const localMs = utcMs + offsetMin * 60 * 1000;
  const d = new Date(localMs);
  return d.getUTCDay();
}

/** Build ISO string for a date (YYYY-MM-DD) and time (HH:mm or HH:mm:ss) in shift TZ. */
function buildISOInShiftTZ(dateStr: string, timeStr: string, offsetMin: number): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const parsed = parseTimeStr(timeStr);
  if (!parsed) return "";
  const [h, min] = parsed;
  const localAsUtcMs = Date.UTC(y, m - 1, day, h, min, 0, 0);
  const utcMs = localAsUtcMs - offsetMin * 60 * 1000;
  return new Date(utcMs).toISOString();
}

/** Normalize leave date to YYYY-MM-DD for comparison. */
function normalizeLeaveDate(d: string): string {
  const parsed = new Date(d);
  if (!Number.isFinite(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True if dateStr (YYYY-MM-DD) is a week-off day. */
function isWeekOff(dateStr: string, weekOffWeekdays: number[], offsetMin: number): boolean {
  const iso = buildISOInShiftTZ(dateStr, "12:00", offsetMin);
  if (!iso) return false;
  const w = getWeekdayInShiftTZ(iso, offsetMin);
  return weekOffWeekdays.includes(w);
}

/** True if dateStr (YYYY-MM-DD) is in leaveDates (normalized to YYYY-MM-DD). */
function isLeave(dateStr: string, leaveDates: string[]): boolean {
  const normalized = dateStr.slice(0, 10);
  const set = new Set(leaveDates.map(normalizeLeaveDate).filter(Boolean));
  return set.has(normalized);
}

/** True if dateStr is a working day (not week-off, not leave). */
function isWorkingDay(
  dateStr: string,
  weekOffWeekdays: number[],
  leaveDates: string[],
  offsetMin: number
): boolean {
  return !isWeekOff(dateStr, weekOffWeekdays, offsetMin) && !isLeave(dateStr, leaveDates);
}

/** Find next working day on or after dateStr (YYYY-MM-DD). Uses UTC for date parts. */
function nextWorkingDay(
  dateStr: string,
  weekOffWeekdays: number[],
  leaveDates: string[],
  offsetMin: number
): string {
  const d = new Date(dateStr + "T12:00:00Z");
  if (!Number.isFinite(d.getTime())) return dateStr;
  for (let i = 0; i < 366; i++) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const candidate = `${y}-${m}-${day}`;
    if (isWorkingDay(candidate, weekOffWeekdays, leaveDates, offsetMin)) return candidate;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dateStr;
}

export interface AdjustCallbackTimeParams {
  requestedCallbackTimeISO: string;
  shiftStart: string | null;
  shiftEnd: string | null;
  weekOffDays: string | null;
  leaveDates: string[];
  timezoneOffsetMinutes?: number;
  /** When true, skip "within 1 hour from now" check – use for batch fixing existing callback times. */
  forceAdjust?: boolean;
}

/**
 * Adjust callback time so it falls within the user's shift and on a working day.
 * - If shift is not set or requested is ≤ 1 hour from now: return requested unchanged.
 * - If requested is before shift start on that day: clamp to shift start (9:30 se pehle koi shift nahi).
 * - If requested is after shift end on that day, or that day is week-off/leave: return next working day at shift start.
 */
export function adjustCallbackTimeToShift(params: AdjustCallbackTimeParams): string {
  const {
    requestedCallbackTimeISO,
    shiftStart,
    shiftEnd,
    weekOffDays,
    leaveDates,
    timezoneOffsetMinutes = typeof process !== "undefined" && process.env.NEXT_PUBLIC_SHIFT_TIMEZONE_OFFSET_MINUTES
      ? Number(process.env.NEXT_PUBLIC_SHIFT_TIMEZONE_OFFSET_MINUTES)
      : DEFAULT_SHIFT_TZ_OFFSET_MINUTES,
    forceAdjust = false,
  } = params;

  const requested = new Date(requestedCallbackTimeISO);
  if (!Number.isFinite(requested.getTime())) return requestedCallbackTimeISO;

  const startParsed = parseTimeStr(shiftStart);
  const endParsed = parseTimeStr(shiftEnd);
  if (!startParsed || !endParsed) return requestedCallbackTimeISO;

  if (!forceAdjust) {
    const now = new Date();
    const diffMs = requested.getTime() - now.getTime();
    if (diffMs <= ONE_HOUR_MS) return requestedCallbackTimeISO;
  }

  const offsetMin = Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : DEFAULT_SHIFT_TZ_OFFSET_MINUTES;
  const weekOffWeekdays = getWeekOffWeekdays(weekOffDays);
  const requestedDateStr = getDateInShiftTZ(requestedCallbackTimeISO, offsetMin);
  if (!requestedDateStr) return requestedCallbackTimeISO;

  const requestedDayIsOff = !isWorkingDay(requestedDateStr, weekOffWeekdays, leaveDates, offsetMin);
  if (requestedDayIsOff) {
    const nextDay = (() => {
      const d = new Date(requestedDateStr + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    })();
    const targetDateStr = nextWorkingDay(nextDay, weekOffWeekdays, leaveDates, offsetMin);
    const shiftStartTimeStr =
      `${String(startParsed[0]).padStart(2, "0")}:${String(startParsed[1]).padStart(2, "0")}:00`;
    return buildISOInShiftTZ(targetDateStr, shiftStartTimeStr, offsetMin) || requestedCallbackTimeISO;
  }

  const shiftStartTimeStr =
    `${String(startParsed[0]).padStart(2, "0")}:${String(startParsed[1]).padStart(2, "0")}:00`;
  const shiftStartOnRequestedDay = buildISOInShiftTZ(requestedDateStr, shiftStartTimeStr, offsetMin);
  if (shiftStartOnRequestedDay && requested.getTime() < new Date(shiftStartOnRequestedDay).getTime()) {
    return shiftStartOnRequestedDay;
  }

  const nextDayStr = (() => {
    const d = new Date(requestedDateStr + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  const shiftEndTimeStr = `${String(endParsed[0]).padStart(2, "0")}:${String(endParsed[1]).padStart(2, "0")}:00`;
  let shiftEndOnRequestedDay: string | null;
  if (
    isOvernightShift(startParsed, endParsed) &&
    shiftStartOnRequestedDay &&
    requested.getTime() >= new Date(shiftStartOnRequestedDay).getTime()
  ) {
    shiftEndOnRequestedDay = buildISOInShiftTZ(nextDayStr, shiftEndTimeStr, offsetMin);
  } else {
    shiftEndOnRequestedDay = buildISOInShiftTZ(requestedDateStr, shiftEndTimeStr, offsetMin);
  }
  if (!shiftEndOnRequestedDay) return requestedCallbackTimeISO;

  const requestedAfterShiftEnd = requested.getTime() > new Date(shiftEndOnRequestedDay).getTime();
  if (!requestedAfterShiftEnd) return requestedCallbackTimeISO;

  const targetDateStr = nextWorkingDay(nextDayStr, weekOffWeekdays, leaveDates, offsetMin);
  const adjusted = buildISOInShiftTZ(targetDateStr, shiftStartTimeStr, offsetMin);
  return adjusted || requestedCallbackTimeISO;
}
