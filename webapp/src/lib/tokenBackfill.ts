/**
 * Token backfill: assign token by time order (callback, follow-up, overdue).
 * Group by (assigned_to, date in shift TZ); sort by callback_time asc; token = 1, 2, 3… (unique per group).
 * Same token number on different days is correct – e.g. token 1 on Mar 7 and token 1 on Mar 8.
 */

const DEFAULT_SHIFT_TZ_OFFSET_MINUTES = 330; // Asia/Kolkata

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

export interface LeadForBackfill {
  id: string;
  callback_time: string;
  assigned_to: string | null;
}

export interface TokenAssignment {
  id: string;
  token: string;
}

/**
 * Compute token for each lead: group by (assigned_to, date), sort by callback_time asc (then id),
 * assign token 1, 2, 3… per group. Unique per (user, date); same number on different days is expected.
 */
export function computeTokenAssignments(
  leads: LeadForBackfill[],
  timezoneOffsetMinutes: number = DEFAULT_SHIFT_TZ_OFFSET_MINUTES
): TokenAssignment[] {
  const offsetMin = Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : DEFAULT_SHIFT_TZ_OFFSET_MINUTES;
  const withDate = leads
    .filter((l) => l.callback_time)
    .map((l) => ({
      ...l,
      date: getDateInShiftTZ(l.callback_time, offsetMin),
      assignedTo: (l.assigned_to ?? "").trim() || "_empty_",
    }))
    .filter((l) => l.date);

  const groupKey = (a: string, d: string) => `${a}\t${d}`;
  const byGroup = new Map<string, typeof withDate>();
  for (const l of withDate) {
    const k = groupKey(l.assignedTo, l.date);
    const list = byGroup.get(k) ?? [];
    list.push(l);
    byGroup.set(k, list);
  }

  const result: TokenAssignment[] = [];
  for (const list of byGroup.values()) {
    list.sort((a, b) => {
      const t = new Date(a.callback_time).getTime() - new Date(b.callback_time).getTime();
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    });
    // Unique token per lead: 1, 2, 3, ... (reserved – dusri lead ko same number nahi)
    list.forEach((l, i) => result.push({ id: l.id, token: String(i + 1) }));
  }
  return result;
}
