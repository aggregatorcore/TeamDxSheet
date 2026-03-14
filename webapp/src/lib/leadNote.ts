import { ACTION_NOTE_PREFIX, MANUAL_NOTE_PREFIX, SUBFLOW_NOTE_PREFIX } from "./constants";

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

/** Legacy prefix in existing notes; new notes use SUBFLOW_NOTE_PREFIX. */
const LEGACY_SUBFLOW_NOTE_PREFIX = "SubTag: ";

/**
 * Get WhatsApp Flow Active sub-flow from note (SubFlow: or legacy SubTag: WhatsApp No Reply / WhatsApp Not Available).
 */
export function getWhatsAppSubFlow(note: string | undefined): string {
  if (!note?.trim()) return "";
  const parts = note.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  const subFlowPart = parts.filter((p) => p.startsWith(SUBFLOW_NOTE_PREFIX) || p.startsWith(LEGACY_SUBFLOW_NOTE_PREFIX)).pop();
  if (!subFlowPart) return "";
  const prefix = subFlowPart.startsWith(SUBFLOW_NOTE_PREFIX) ? SUBFLOW_NOTE_PREFIX : LEGACY_SUBFLOW_NOTE_PREFIX;
  return subFlowPart.slice(prefix.length).trim();
}

/**
 * Next attempt number for scheduling a callback: 1 if last overall attempt had a different tag (new cycle);
 * lastN+1 if same tag (same cycle). Used when appending "Attempt N: TagName" to note.
 */
export function getNextAttempt(prevNote: string | undefined, currentTag: string): number {
  if (!prevNote?.trim()) return 1;
  const parts = prevNote.split(" | ").map((p) => p.trim());
  let lastN = 0;
  let lastTag = "";
  for (let i = 0; i < parts.length; i++) {
    const m = parts[i].match(/^Attempt\s+(\d+):\s*(.+)$/);
    if (m) {
      lastN = parseInt(m[1], 10);
      lastTag = m[2].trim();
    }
  }
  if (lastTag === currentTag) return lastN + 1;
  return 1;
}

/**
 * Last attempt number for a tag (for display on tag pills). Scans note for "Attempt N: TagName", returns last N for the given tag; 0 if none.
 * Tag comparison is case-insensitive and trims whitespace to avoid mismatches.
 */
export function getLastAttemptForTag(note: string | undefined, tag: string): number {
  const tagNorm = String(tag ?? "").trim();
  if (!String(note ?? "").trim() || !tagNorm) return 0;
  const parts = String(note).split(" | ").map((p) => p.trim()).filter(Boolean);
  let lastN = 0;
  for (let i = 0; i < parts.length; i++) {
    const m = parts[i].match(/^Attempt\s+(\d+):\s*(.+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      const tagName = String(m[2]).trim();
      if (tagName.toLowerCase() === tagNorm.toLowerCase()) lastN = n;
    }
  }
  return lastN;
}

/**
 * Attempt count to show on tag pills. When the lead has a callback (e.g. overdue card) but note has no "Attempt N: Tag" yet, returns 1 so the repeat icon always shows.
 */
export function getDisplayAttemptForTag(note: string | undefined, tag: string, hasCallbackTime: boolean): number {
  const n = getLastAttemptForTag(note, tag);
  if (n >= 1) return n;
  const tagNorm = String(tag ?? "").trim();
  if (hasCallbackTime && tagNorm && tagNorm !== "—") return 1;
  return 0;
}

/**
 * Get Interested sub-flow from note (last Action: …) or legacy lead.tags === "Document received".
 * Document received is sub-flow of Interested, not a tag.
 */
export function getInterestedSubFlow(note: string | undefined, currentTags: string | undefined): string {
  if (String(currentTags) === "Document received") return "Document received";
  if (!note?.trim()) return "";
  const parts = note.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  const actionPart = parts.filter((p) => p.startsWith(ACTION_NOTE_PREFIX)).pop();
  return actionPart ? actionPart.slice(ACTION_NOTE_PREFIX.length).trim() : "";
}
