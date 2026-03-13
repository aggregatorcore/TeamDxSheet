import { MANUAL_NOTE_PREFIX, SUBTAG_NOTE_PREFIX } from "./constants";

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

/**
 * Tag to show in UI: use currentTags if set, else last tag from note (TagHistory or Attempt N: Tag).
 * Avoids showing "—" when lead is overdue/callback and tags field is empty.
 */
export function getEffectiveTag(note: string | undefined, currentTags: string | undefined): string {
  if (currentTags?.trim()) return currentTags.trim();
  const tagHistory = getTagHistory(note);
  if (tagHistory.length > 0) {
    const entry = tagHistory[tagHistory.length - 1];
    const m = entry.match(/^(.+?)\s*\([^)]+\)$/);
    return m ? m[1].trim() : entry.trim();
  }
  const attemptParts = note?.split(" | ").filter((p) => /^Attempt\s+\d+:\s*.+/.test(p.trim())) ?? [];
  const lastAttempt = attemptParts[attemptParts.length - 1];
  return lastAttempt?.replace(/^Attempt\s+\d+:\s*/, "").trim() ?? "";
}

/**
 * Extract manual note (user-written) from lead.note. Used in NoteEditModal.
 * TagHistory, Attempt, Action parts are system-generated and not shown here.
 */
export function getManualNote(note: string | undefined): string {
  if (!note?.trim()) return "";
  const parts = note.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  const manualPart = parts.filter((p) => p.startsWith(MANUAL_NOTE_PREFIX)).pop();
  return manualPart ? manualPart.slice(MANUAL_NOTE_PREFIX.length).trim() : "";
}

/**
 * Build full note keeping all system parts (TagHistory, Attempt, Action) and set/replace manual part.
 */
export function buildNoteWithManual(prevNote: string | undefined, manualText: string): string {
  const trimmed = manualText.trim();
  const parts = prevNote?.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean) ?? [];
  const withoutManual = parts.filter((p) => !p.startsWith(MANUAL_NOTE_PREFIX));
  if (trimmed) withoutManual.push(`${MANUAL_NOTE_PREFIX}${trimmed}`);
  return withoutManual.join(" | ");
}

/**
 * Get WhatsApp Flow Active sub-tag from note (SubTag: WhatsApp No Reply / WhatsApp Not Available).
 */
export function getWhatsAppSubTag(note: string | undefined): string {
  if (!note?.trim()) return "";
  const parts = note.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  const subTagPart = parts.filter((p) => p.startsWith(SUBTAG_NOTE_PREFIX)).pop();
  return subTagPart ? subTagPart.slice(SUBTAG_NOTE_PREFIX.length).trim() : "";
}
