/** Format 24h time string (e.g. "09:00" or "09:00:00") to 12h display (e.g. "9:00 AM"). */
export function formatTimeTo12h(timeStr: string | null | undefined): string {
  if (!timeStr || typeof timeStr !== "string") return "";
  const part = timeStr.trim().slice(0, 5); // "HH:mm"
  const [h, m] = part.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  const min = Number.isNaN(m) ? 0 : m;
  return `${hour}:${String(min).padStart(2, "0")} ${ampm}`;
}

const WEEK_DAY_LABELS: Record<string, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

/** Format week_off_days string (e.g. "sunday,saturday") to display "Sun, Sat". */
export function formatWeekOffDisplay(weekOffDays: string | null | undefined): string {
  if (!weekOffDays || typeof weekOffDays !== "string") return "";
  return weekOffDays
    .split(",")
    .map((d) => WEEK_DAY_LABELS[d.trim().toLowerCase()] ?? d.trim())
    .filter(Boolean)
    .join(", ");
}

/** Day options for week off multi-select (value: lowercase full name). */
export const WEEK_DAYS = [
  { value: "sunday", label: "Sun" },
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
] as const;
