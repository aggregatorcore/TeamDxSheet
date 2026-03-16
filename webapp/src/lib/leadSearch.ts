import type { Lead } from "@/types/lead";
import { getDisplayId } from "@/lib/displayId";

/**
 * Filter leads by search query.
 * - Last 5 digits: only leads whose mobile number ends with that 5-digit string.
 * - Otherwise: match id (raw or display), name, place (city), number, source, or note (contains, case-insensitive).
 */
export function filterLeadsBySearch(leads: Lead[], query: string): Lead[] {
  const q = query.trim();
  if (!q) return leads;

  const digitsOnly = q.replace(/\D/g, "");
  if (digitsOnly.length === 5) {
    return leads.filter((l) => {
      const num = (l.number ?? "").replace(/\D/g, "");
      return num.length >= 5 && num.slice(-5) === digitsOnly;
    });
  }

  const lower = q.toLowerCase();
  return leads.filter((l) => {
    const displayId = getDisplayId(l.id);
    return (
      (l.id && l.id.toLowerCase().includes(lower)) ||
      (displayId && displayId.includes(q)) ||
      (l.name && l.name.toLowerCase().includes(lower)) ||
      (l.place && l.place.toLowerCase().includes(lower)) ||
      (l.number && l.number.includes(q)) ||
      (l.source && l.source.toLowerCase().includes(lower)) ||
      (l.note && l.note.toLowerCase().includes(lower)) ||
      (l.assignedTo && l.assignedTo.toLowerCase().includes(lower))
    );
  });
}
