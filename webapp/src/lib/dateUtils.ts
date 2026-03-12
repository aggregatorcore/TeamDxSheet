/**
 * Converts user's selected date + time to UTC ISO string for the server.
 * Uses internet-fetched timezone (utcOffsetMinutes) when provided so PC time/zone
 * doesn't affect scheduling. Fallback: browser local when offset not available.
 */
export function localDateTimeToISO(
  dateStr: string,
  timeStr: string,
  utcOffsetMinutes: number | null | undefined
): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hr, min] = timeStr.split(":").map(Number);
  const h = hr ?? 0;
  const mi = min ?? 0;

  if (utcOffsetMinutes != null && Number.isFinite(utcOffsetMinutes)) {
    // User's timezone from internet: local 11:00 in +05:30 = UTC 05:30
    // UTC ms = (local as UTC) - offset
    const localAsUtcMs = Date.UTC(y, m - 1, d, h, mi, 0, 0);
    const utcMs = localAsUtcMs - utcOffsetMinutes * 60 * 1000;
    return new Date(utcMs).toISOString();
  }

  // Fallback: browser local (same as before)
  const localDate = new Date(y, m - 1, d, h, mi, 0, 0);
  return localDate.toISOString();
}
