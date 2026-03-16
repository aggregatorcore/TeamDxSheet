/**
 * Normalize lead phone number for uniqueness checks.
 * Same normalized value = same number (no duplicate per user).
 */

/** Remove spaces and take first segment if comma-separated (e.g. "98765, 123" → "98765"). */
export function normalizeLeadNumber(n: string | null | undefined): string {
  return String(n ?? "")
    .replace(/\s/g, "")
    .split(",")[0]
    .trim();
}
