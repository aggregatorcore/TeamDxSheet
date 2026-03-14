/**
 * Derive a stable 8-digit numeric display ID from a lead id (e.g. UUID).
 * Same id always returns the same 8 digits; used for display only (API still uses real id).
 */
export function getDisplayId(id: string): string {
  if (!id) return "00000000";
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h * 31) + id.charCodeAt(i)) >>> 0;
  }
  return String(h % 100000000).padStart(8, "0");
}
