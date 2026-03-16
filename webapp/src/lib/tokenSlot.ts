/**
 * Token system: one lead per 5-minute slot per user per day.
 * Token is unique per (assigned_to, date). Same user can have token 1 on Day 1 and token 1 on Day 2 – that is correct.
 * UI shows token + date (e.g. "1 · 7 Mar") so duplicate token numbers across days are clear.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const SLOT_MINUTES = 5;
const DEFAULT_SHIFT_TZ_OFFSET_MINUTES = 330; // Asia/Kolkata

/** Get date YYYY-MM-DD in shift TZ from ISO. */
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

/** Get local hours and minutes in shift TZ from ISO. */
function getLocalHMInShiftTZ(iso: string, offsetMin: number): { h: number; m: number } {
  const utcMs = new Date(iso).getTime();
  const localMs = utcMs + offsetMin * 60 * 1000;
  const d = new Date(localMs);
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

/** Build ISO for a date (YYYY-MM-DD) and local H:M in shift TZ. */
function buildISOInShiftTZ(dateStr: string, h: number, m: number, offsetMin: number): string {
  const [y, mo, day] = dateStr.split("-").map(Number);
  const localAsUtcMs = Date.UTC(y, mo - 1, day, h, m, 0, 0);
  const utcMs = localAsUtcMs - offsetMin * 60 * 1000;
  return new Date(utcMs).toISOString();
}

/** Round minute down to 5-min slot (0, 5, 10, ..., 55). */
function roundDownTo5Min(m: number): number {
  return Math.floor(m / SLOT_MINUTES) * SLOT_MINUTES;
}

/** Get a stable slot key for comparison: date + H:M rounded to 5 min (e.g. "2025-03-10T09:30"). */
function getSlotKey(iso: string, offsetMin: number): string {
  const dateStr = getDateInShiftTZ(iso, offsetMin);
  const { h, m } = getLocalHMInShiftTZ(iso, offsetMin);
  const m5 = roundDownTo5Min(m);
  return `${dateStr}T${String(h).padStart(2, "0")}:${String(m5).padStart(2, "0")}`;
}

export interface ResolveSlotAndTokenParams {
  assignedTo: string;
  proposedCallbackTimeISO: string;
  excludeLeadId: string;
  supabase: SupabaseClient;
  timezoneOffsetMinutes?: number;
}

export interface ResolveSlotAndTokenResult {
  callbackTime: string;
  token: string;
}

/**
 * Resolve proposed callback time to next free 5-min slot for this user on that day;
 * return resolved ISO and unique token (1-based slot index for that day; no duplicate tokens).
 */
export async function resolveSlotAndToken(params: ResolveSlotAndTokenParams): Promise<ResolveSlotAndTokenResult> {
  const {
    assignedTo,
    proposedCallbackTimeISO,
    excludeLeadId,
    supabase,
    timezoneOffsetMinutes = DEFAULT_SHIFT_TZ_OFFSET_MINUTES,
  } = params;

  const offsetMin = Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : DEFAULT_SHIFT_TZ_OFFSET_MINUTES;
  const dateStr = getDateInShiftTZ(proposedCallbackTimeISO, offsetMin);
  if (!dateStr) return { callbackTime: proposedCallbackTimeISO, token: "1" };

  const { data: rows } = await supabase
    .from("leads")
    .select("id, callback_time")
    .eq("assigned_to", assignedTo)
    .not("callback_time", "is", null)
    .neq("id", excludeLeadId);

  const onSameDay = (iso: string) => getDateInShiftTZ(iso, offsetMin) === dateStr;
  const existingTimes = ((rows ?? []) as { id: string; callback_time: string }[])
    .map((r) => r.callback_time as string)
    .filter(onSameDay);

  const occupiedKeys = new Set(existingTimes.map((iso) => getSlotKey(iso, offsetMin)));

  let { h, m } = getLocalHMInShiftTZ(proposedCallbackTimeISO, offsetMin);
  m = roundDownTo5Min(m);

  while (occupiedKeys.has(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)) {
    m += SLOT_MINUTES;
    if (m >= 60) {
      m = 0;
      h += 1;
      if (h >= 24) break;
    }
  }

  const resolvedISO = buildISOInShiftTZ(dateStr, h, m, offsetMin);
  const resolvedKey = getSlotKey(resolvedISO, offsetMin);

  const existingKeysSorted = [...existingTimes]
    .map((iso) => getSlotKey(iso, offsetMin))
    .sort();
  const countBefore = existingKeysSorted.filter((k) => k < resolvedKey).length;
  const token = String(countBefore + 1);

  return { callbackTime: resolvedISO, token };
}
