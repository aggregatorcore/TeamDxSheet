/** True if callback_time date (local) is after today (local). Use to hide "next day or later" from My Leads until user searches. */
export function isCallbackDateAfterToday(callbackTime: string | null | undefined): boolean {
  if (callbackTime == null || String(callbackTime).trim() === "") return false;
  const key = getDateKey(callbackTime);
  if (!key) return false;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return key > todayKey;
}

/** YYYY-MM-DD from callback_time ISO string (local date). Use for calendar grouping and filtering. */
export function getDateKey(callbackTime: string | null | undefined): string {
  if (callbackTime == null || String(callbackTime).trim() === "") return "";
  const ms = new Date(String(callbackTime).trim()).getTime();
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Short date only for token display (e.g. "7 Mar"). Token is per (user, date); same number on different days is correct. */
const TOKEN_DATE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatTokenDateShort(callbackTime: string | null | undefined): string {
  if (callbackTime == null || String(callbackTime).trim() === "") return "";
  const ms = new Date(String(callbackTime).trim()).getTime();
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const day = d.getDate();
  const month = TOKEN_DATE_MONTHS[d.getMonth()] ?? "";
  return `${day} ${month}`;
}

/**
 * Token display: token is per (user, date). Returns "" if no token; else "token" or "token · 7 Mar" when callbackTime exists.
 */
export function formatTokenDisplay(lead: { token?: string | null; callbackTime?: string | null }): string {
  const token = lead.token != null && String(lead.token).trim() !== "" ? String(lead.token).trim() : "";
  if (!token) return "";
  const dateStr = formatTokenDateShort(lead.callbackTime);
  return dateStr ? `${token} · ${dateStr}` : token;
}

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
