/**
 * Locale-independent short date for callback time in table/cards: DD/MM, h:mm am/pm.
 * Use this everywhere we display callback date in the UI so format never varies by browser/locale.
 */
export function formatCallbackDateShort(callbackTime: string | null | undefined): string {
  if (callbackTime == null || String(callbackTime).trim() === "") return "—";
  const ms = new Date(String(callbackTime).trim()).getTime();
  if (!Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  let hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, "0");
  const ampm = hour >= 12 ? "pm" : "am";
  hour = hour % 12 || 12;
  return `${day}/${month}, ${hour}:${minute} ${ampm}`;
}

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
