/**
 * Append tag to TagHistory in note. Format: "TagHistory: tag (date) | tag (date)"
 */
export function appendTagHistory(prevNote: string | undefined, tag: string): string {
  const now = new Date();
  const dateStr = now.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const entry = `${tag} (${dateStr})`;
  const tagHistoryKey = "TagHistory:";

  if (!prevNote?.trim()) {
    return `${tagHistoryKey} ${entry}`;
  }

  const parts = prevNote.split(" | ");
  const tagHistoryIdx = parts.findIndex((p) => p.trim().startsWith(tagHistoryKey));

  if (tagHistoryIdx >= 0) {
    const part = parts[tagHistoryIdx];
    const val = part.replace(tagHistoryKey, "").trim();
    const newVal = val ? `${val} | ${entry}` : entry;
    parts[tagHistoryIdx] = `${tagHistoryKey} ${newVal}`;
    return parts.join(" | ");
  }

  return `${prevNote} | ${tagHistoryKey} ${entry}`;
}

/**
 * Parse TagHistory from note. Returns array of "tag (date)" strings.
 */
export function getTagHistory(note: string | undefined): string[] {
  if (!note) return [];
  const parts = note.split(" | ");
  const tagHistoryPart = parts.find((p) => p.trim().startsWith("TagHistory:"));
  if (!tagHistoryPart) return [];
  const val = tagHistoryPart.replace("TagHistory:", "").trim();
  if (!val) return [];
  return val.split(" | ").map((e) => e.trim()).filter(Boolean);
}
