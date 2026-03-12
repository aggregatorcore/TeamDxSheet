/**
 * Fetches and caches user's timezone from the internet (IP-based).
 * PC ka time/zone change hone par bhi app hamesha internet wali timezone use karegi.
 */

const STORAGE_KEY = "app_timezone";
const STORAGE_KEY_OFFSET = "app_timezone_offset_min";
const CACHE_DAYS = 7;

export interface TimezoneInfo {
  timezone: string;
  utcOffsetMinutes: number;
}

function parseUtcOffset(utcOffset: string): number {
  // e.g. "+05:30" -> 330, "-08:00" -> -480
  const match = utcOffset.trim().match(/^([+-])(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);
  return sign * (hours * 60 + minutes);
}

function getCached(): TimezoneInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedOffset = localStorage.getItem(STORAGE_KEY_OFFSET);
    const fetchedAt = localStorage.getItem("app_timezone_fetched_at");
    if (!stored || storedOffset === null || !fetchedAt) return null;
    const age = Date.now() - parseInt(fetchedAt, 10);
    if (age > CACHE_DAYS * 24 * 60 * 60 * 1000) return null;
    return { timezone: stored, utcOffsetMinutes: parseInt(storedOffset, 10) };
  } catch {
    return null;
  }
}

function setCache(info: TimezoneInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY, info.timezone);
    localStorage.setItem(STORAGE_KEY_OFFSET, String(info.utcOffsetMinutes));
    localStorage.setItem("app_timezone_fetched_at", String(Date.now()));
  } catch {
    // ignore
  }
}

const WORLD_TIME_API = "https://worldtimeapi.org/api/ip";

export async function fetchTimezoneFromInternet(): Promise<TimezoneInfo | null> {
  try {
    const res = await fetch(WORLD_TIME_API, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { timezone?: string; utc_offset?: string };
    const tz = data.timezone ?? "UTC";
    const offsetStr = data.utc_offset ?? "+00:00";
    const utcOffsetMinutes = parseUtcOffset(offsetStr);
    const info: TimezoneInfo = { timezone: tz, utcOffsetMinutes };
    setCache(info);
    return info;
  } catch {
    return null;
  }
}

export function getTimezoneSync(): TimezoneInfo | null {
  return getCached();
}

export async function ensureTimezone(): Promise<TimezoneInfo | null> {
  const cached = getCached();
  if (cached) return cached;
  return fetchTimezoneFromInternet();
}
