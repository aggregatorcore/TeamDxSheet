"use client";

import { useState, useEffect, useCallback } from "react";
import type { Lead, FlowOption } from "@/types/lead";
import { getTagHistory } from "@/lib/leadNote";
import { FLOW_COLORS, TAG_COLORS } from "@/lib/constants";
import { InterestedFormContent, type InterestedFormValues } from "./InterestedFormContent";

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  initialTab?: "overview" | "timeline" | "documents";
  onUpdate?: (updates: Partial<Lead>) => void;
}

/** Parse note string into key-value pairs */
function parseNote(note: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = note.split(" | ");
  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx > 0) {
      const key = part.slice(0, colonIdx).trim();
      const val = part.slice(colonIdx + 1).trim();
      if (key && val && !/^Attempt\s+\d+$/.test(key) && key !== "TagHistory") out[key] = val;
    }
  }
  return out;
}

/** Extract "Attempt N: Tag" entries from note */
function getAttemptHistory(note: string | undefined): string[] {
  if (!note) return [];
  return note.split(" | ").filter((p) => /^Attempt\s+\d+:\s*.+/.test(p.trim()));
}

/** Keys from lead form (InterestedModal) - exclude from Note section, show in Profile only */
const FORM_DATA_KEYS = new Set([
  "Name", "Place", "Email", "Qualification", "Working", "Experience", "Experience from",
  "Target", "Visa", "Budget", "Budget from", "Prev travel", "Rejection", "Action",
  "Passport", "Passport status",
]);

/** User-written notes only - exclude form data, Attempt, TagHistory */
function getUserNotes(note: string | undefined): string {
  if (!note) return "";
  return note
    .split(" | ")
    .filter((p) => {
      const t = p.trim();
      if (/^Attempt\s+\d+:\s*.+/.test(t) || t.startsWith("TagHistory:")) return false;
      const colonIdx = t.indexOf(":");
      if (colonIdx > 0) {
        const key = t.slice(0, colonIdx).trim();
        if (FORM_DATA_KEYS.has(key)) return false;
      }
      return true;
    })
    .join(" | ")
    .trim();
}

/** Infer flow from tag: Connected tags = Interested/Not Interested */
function inferFlowFromTag(tag: string): FlowOption {
  if (tag === "Interested" || tag === "Not Interested") return "Connected";
  return "Not Connected";
}

type TimelineCycle = {
  type: "cycle";
  flow: FlowOption;
  tag: string;
  action?: string;
  date?: string;
} | {
  type: "event";
  label: string;
  date?: string;
};

/** Build timeline as cycles: Flow → Tag → Action. Newest first. */
function getTimelineCycles(note: string | undefined, lead: Lead, action: string | undefined): TimelineCycle[] {
  const cycles: TimelineCycle[] = [];
  const tagHistory = getTagHistory(note);
  const attemptHistory = getAttemptHistory(note);

  for (const entry of tagHistory) {
    const match = entry.match(/^(.+?)\s*\(([^)]+)\)$/);
    const tag = match ? match[1].trim() : entry;
    const date = match ? match[2] : undefined;
    const flow = inferFlowFromTag(tag);
    const isInterested = tag === "Interested";
    cycles.push({
      type: "cycle",
      flow,
      tag,
      action: isInterested ? action : undefined,
      date,
    });
  }

  if (cycles.length === 0 && attemptHistory.length > 0) {
    for (const a of attemptHistory) {
      const tag = a.replace(/^Attempt\s+\d+:\s*/, "").trim();
      cycles.push({
        type: "cycle",
        flow: inferFlowFromTag(tag),
        tag,
      });
    }
  }

  if (lead.callbackTime) {
    cycles.push({
      type: "event",
      label: "Callback scheduled",
      date: new Date(lead.callbackTime).toLocaleString("en-IN"),
    });
  }

  return cycles.reverse();
}

const PLACEHOLDER = "—";

function Field({
  label,
  value,
  placeholder = PLACEHOLDER,
}: {
  label: string;
  value: string | undefined;
  placeholder?: string;
}) {
  const display = value?.trim() && value !== "-" ? value : placeholder;
  const isEmpty = !value?.trim() || value === "-";
  return (
    <div className="flex gap-2 py-1">
      <span className="min-w-[110px] shrink-0 text-sm font-medium text-slate-500">{label}:</span>
      <span className={`text-base ${isEmpty ? "text-slate-400 italic" : "text-slate-900"}`}>{display}</span>
    </div>
  );
}

/** Parse "Prev travel: X (V, D); Y (V, D)" into entries */
function parsePrevTravelEntries(str: string | undefined): { country: string; visa: string; duration: string }[] {
  if (!str?.trim()) return [{ country: "", visa: "", duration: "" }];
  const segments = str.split(";").map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return [{ country: "", visa: "", duration: "" }];
  return segments.map((seg) => {
    const open = seg.indexOf(" (");
    const country = open >= 0 ? seg.slice(0, open).trim() : seg.trim();
    const rest = open >= 0 ? seg.slice(open + 2) : "";
    const close = rest.indexOf(")");
    const visDur = close >= 0 ? rest.slice(0, close) : rest;
    const [visa = "", duration = ""] = visDur.split(",").map((s) => s.trim());
    return { country: country || "", visa: visa || "", duration: duration || "" };
  });
}

/** Parse "Rejection: country - reason" into country and reason */
function parseRejection(str: string | undefined): { country: string; reason: string } {
  if (!str?.trim()) return { country: "", reason: "" };
  const dash = str.indexOf(" - ");
  if (dash < 0) return { country: str.trim(), reason: "" };
  return { country: str.slice(0, dash).trim(), reason: str.slice(dash + 3).trim() };
}

/** Build note string from InterestedFormValues, preserving TagHistory */
function buildNoteFromFormValues(form: InterestedFormValues, existingNote: string | undefined): string {
  const parts: string[] = [];
  if (form.name?.trim()) parts.push(`Name: ${form.name.trim()}`);
  if (form.place?.trim()) parts.push(`Place: ${form.place.trim()}`);
  if (form.qualification?.trim()) parts.push(`Qualification: ${form.qualification.trim()}`);
  if (form.nowWorking === "yes" && form.tradeField?.trim()) parts.push(`Working: ${form.tradeField.trim()}`);
  if (form.workExpFrom?.trim()) parts.push(`Experience from: ${form.workExpFrom.trim()} yrs`);
  if (form.targetCountry?.trim()) parts.push(`Target: ${form.targetCountry.trim()}`);
  if (form.visaType?.trim()) parts.push(`Visa: ${form.visaType.trim()}`);
  if (form.budgetFrom?.trim()) parts.push(`Budget: ${form.budgetFrom.trim()}`);
  if (form.previousTraveler === "yes") {
    const entries = form.prevTravelEntries
      .filter((e) => e.country?.trim() || e.visa?.trim() || e.duration?.trim())
      .map((e) => `${e.country || "-"} (${e.visa || "-"}, ${e.duration || "-"})`);
    if (entries.length > 0) parts.push(`Prev travel: ${entries.join("; ")}`);
  }
  if (form.hasRejection === "yes" && (form.rejectionCountry?.trim() || form.rejectionReason?.trim())) {
    parts.push(`Rejection: ${form.rejectionCountry?.trim() || "-"} - ${form.rejectionReason?.trim() || "-"}`);
  }
  if (form.action?.trim()) parts.push(`Action: ${form.action.trim()}`);
  if (form.passport === "yes" || form.passport === "no") parts.push(`Passport: ${form.passport}`);
  const base = parts.join(" | ");
  const tagHistoryPart = existingNote?.split(" | ").find((p) => p.startsWith("TagHistory:"));
  return tagHistoryPart ? `${base} | ${tagHistoryPart}` : base;
}

const defaultEditFormValues: InterestedFormValues = {
  name: "",
  place: "",
  qualification: "",
  nowWorking: "",
  tradeField: "",
  workExpFrom: "",
  targetCountry: "",
  visaType: "",
  budgetFrom: "",
  previousTraveler: "",
  prevTravelCount: 1,
  prevTravelEntries: [{ country: "", visa: "", duration: "" }],
  hasRejection: "",
  rejectionCountry: "",
  rejectionReason: "",
  action: "",
  passport: "",
};

export function LeadDetailModal({ lead, onClose, initialTab = "overview", onUpdate }: LeadDetailModalProps) {
  const [tab, setTab] = useState<"overview" | "timeline" | "documents">(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<InterestedFormValues>(defaultEditFormValues);
  const [isMobileOrTelCapable, setIsMobileOrTelCapable] = useState(true);

  useEffect(() => {
    setTab(initialTab);
  }, [lead.id, initialTab]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const check = () => setIsMobileOrTelCapable(mq.matches);
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);

  const copyPhone = useCallback(() => {
    const num = lead.number?.replace(/\s/g, "").split(",")[0];
    if (num) navigator.clipboard.writeText(num).catch(() => {});
  }, [lead.number]);

  const parsed = lead.note ? parseNote(lead.note) : {};
  const targetCountry = parsed["Target"]?.includes(", Visa:")
    ? parsed["Target"].split(", Visa:")[0].trim()
    : parsed["Target"];
  const visaType = parsed["Visa"] ?? (parsed["Target"]?.includes("Visa:") ? parsed["Target"].split("Visa:")[1]?.trim() : undefined);
  const prevTravelStr = parsed["Prev travel"];
  const rejectionStr = parsed["Rejection"];
  const workingStr = parsed["Working"] ?? parsed["Occupation"] ?? "";

  const initEditForm = () => {
    const prevEntries = parsePrevTravelEntries(prevTravelStr);
    const rej = parseRejection(rejectionStr);
    setEditForm({
      ...defaultEditFormValues,
      name: lead.name || parsed["Name"] || "",
      place: lead.place || parsed["Place"] || "",
      qualification: parsed["Qualification"] || "",
      nowWorking: workingStr ? "yes" : "no",
      tradeField: workingStr || "",
      workExpFrom: parsed["Experience from"]?.replace(/\s*yrs?\s*$/i, "") || "",
      targetCountry: targetCountry || "",
      visaType: visaType || "",
      budgetFrom: parsed["Budget"] || "",
      previousTraveler: prevTravelStr?.trim() ? "yes" : "no",
      prevTravelCount: Math.max(1, prevEntries.length),
      prevTravelEntries: prevEntries.length ? prevEntries : [{ country: "", visa: "", duration: "" }],
      hasRejection: rejectionStr?.trim() ? "yes" : "no",
      rejectionCountry: rej.country || "",
      rejectionReason: rej.reason || "",
      action: parsed["Action"] || "",
      passport: (() => {
        const p = (parsed["Passport"] ?? parsed["Passport status"] ?? "").trim().toLowerCase();
        if (p === "yes" || p === "y") return "yes";
        if (p === "no" || p === "n") return "no";
        return "";
      })(),
    });
  };

  const handleStartEdit = () => {
    initEditForm();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    const newNote = buildNoteFromFormValues(editForm, lead.note);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          name: editForm.name.trim() || undefined,
          place: editForm.place.trim() || undefined,
          note: newNote,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update");
      }
      onUpdate?.({ name: editForm.name.trim() || lead.name, place: editForm.place.trim() || lead.place, note: newNote });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  const action = parsed["Action"];
  const userNotes = getUserNotes(lead.note);
  const timelineCycles = getTimelineCycles(lead.note, lead, action);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 id="lead-modal-title" className="text-lg font-semibold text-white">{lead.name || "Unknown"}</h2>
                <p className="text-xs text-slate-400">
                  {lead.source && <span>{lead.source}</span>}
                  {lead.source && lead.id && <span className="mx-1.5">•</span>}
                  {lead.id && <span className="font-mono text-slate-400" title={lead.id}>{lead.id.length > 8 ? `${lead.id.slice(0, 8)}…` : lead.id}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tab === "overview" && !isEditing && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              <div className="flex rounded-lg bg-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setTab("overview")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    tab === "overview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setTab("timeline")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    tab === "timeline" ? "bg-white text-slate-900 shadow-sm" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setTab("documents")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    tab === "documents" ? "bg-white text-slate-900 shadow-sm" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Documents
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 bg-red-500 text-white transition-colors hover:bg-red-600"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-50/50 p-6">
          {tab === "overview" && (
            <div className="max-w-4xl">
              {isEditing ? (
                <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    <InterestedFormContent
                      value={editForm}
                      onChange={(updates) => setEditForm((prev) => ({ ...prev, ...updates }))}
                      leadPlace={lead.place}
                      showAction={false}
                      showPassport={true}
                    />
                    <p className="text-xs text-slate-500 pt-1">
                      Next Action is report-only and cannot be edited here.
                    </p>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                {/* Contact */}
                <div className="pb-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    Contact
                  </h3>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="flex gap-2 py-1">
                        <span className="min-w-[110px] shrink-0 text-sm font-medium text-slate-500">Name:</span>
                        <span
                          className={`text-base font-semibold ${
                            lead.name || parsed["Name"] ? "text-slate-900" : "text-slate-400 italic"
                          }`}
                        >
                          {lead.name || parsed["Name"] || PLACEHOLDER}
                        </span>
                      </div>
                      <Field label="Place" value={lead.place || parsed["Place"]} />
                      {lead.number ? (
                        isMobileOrTelCapable ? (
                          <a
                            href={`tel:${lead.number.replace(/\s/g, "").split(",")[0]}`}
                            className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 transition-all duration-200 hover:bg-sky-100 hover:shadow-sm"
                          >
                            <span className="min-w-[110px] shrink-0 text-sm font-medium text-slate-500">Phone:</span>
                            <span className="text-base font-semibold text-sky-600">{lead.number}</span>
                            <svg className="ml-auto h-4 w-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2">
                            <span className="min-w-[110px] shrink-0 text-sm font-medium text-slate-500">Phone:</span>
                            <span className="text-base font-semibold text-sky-600 flex-1 min-w-0 truncate">{lead.number}</span>
                            <button
                              type="button"
                              onClick={copyPhone}
                              className="shrink-0 rounded px-2 py-1 text-sm font-medium text-sky-600 hover:bg-sky-100"
                            >
                              Copy
                            </button>
                          </div>
                        )
                      ) : (
                        <Field label="Phone" value={undefined} />
                      )}
                      {parsed["Email"] ? (
                        <a
                          href={`mailto:${parsed["Email"]}`}
                          className="flex gap-2 py-1 transition-colors duration-200 hover:text-sky-600"
                        >
                          <span className="min-w-[110px] shrink-0 text-sm font-medium text-slate-500">Email:</span>
                          <span className="text-base text-sky-600 hover:underline">{parsed["Email"]}</span>
                        </a>
                      ) : (
                        <Field label="Email" value={undefined} />
                      )}
                    </div>
                    <div className="space-y-1">
                      <Field label="Source" value={lead.source} />
                      <div className="flex gap-2 py-1 min-w-0" title={lead.id || undefined}>
                        <span className="min-w-[110px] shrink-0 text-sm font-medium text-slate-500">ID:</span>
                        <span className={`min-w-0 truncate font-mono text-sm ${lead.id ? "text-slate-600" : "text-slate-400 italic"}`}>
                          {lead.id || PLACEHOLDER}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                    </span>
                    Qualification
                  </h3>
                  <Field label="Qualification" value={parsed["Qualification"]} />
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    Occupation
                  </h3>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Field label="Occupation / Trade" value={parsed["Working"] ?? parsed["Occupation"]} />
                      <Field label="Work experience" value={parsed["Experience from"] ?? parsed["Experience"]} />
                      <Field label="Experience from (yrs)" value={parsed["Experience from"]} />
                      <Field label="Passport" value={parsed["Passport"] ?? parsed["Passport status"]} />
                    </div>
                    <div className="space-y-1">
                      <Field label="Budget" value={parsed["Budget"]} />
                      <Field label="Target Country" value={targetCountry} />
                      <Field label="Visa Type" value={visaType} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0h.5a2.5 2.5 0 002.5-2.5V8.935M12 12a2 2 0 104 0 2 2 0 00-4 0z" />
                      </svg>
                    </span>
                    Travel History
                  </h3>
                  <Field label="Previous Travel" value={parsed["Prev travel"]} />
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </span>
                    Rejection
                  </h3>
                  <Field label="Details" value={parsed["Rejection"]} />
                </div>

                {/* Callback / Schedule for Not Connected (No Answer, Switch Off, Busy IVR) */}
                {lead.flow === "Not Connected" &&
                  (lead.tags === "No Answer" || lead.tags === "Switch Off" || lead.tags === "Busy IVR") && (
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </span>
                      Callback / Schedule
                    </h3>
                    <Field
                      label="Callback scheduled"
                      value={
                        lead.callbackTime
                          ? new Date(lead.callbackTime).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : undefined
                      }
                      placeholder="Not scheduled — schedule from lead table"
                    />
                  </div>
                )}

                {/* Action (Current / Next) only for Connected + Interested or Document received; hide for Not Connected / No Answer etc. */}
                {(lead.flow === "Connected" && (lead.tags === "Interested" || lead.tags === "Document received")) && (
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Action
                    </h3>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Field
                          label="Current action"
                          value={(() => {
                            if (action) return action;
                            if (lead.tags === "Document received") return "Document received";
                            const tagHistory = getTagHistory(lead.note);
                            const lastTag = tagHistory[tagHistory.length - 1];
                            if (lastTag) {
                              const tagName = lastTag.replace(/\s*\([^)]*\)$/, "").trim();
                              if (tagName === "Document received") return "Document received";
                            }
                            if (lead.note?.includes("Document received")) return "Document received";
                            return undefined;
                          })()}
                        />
                        <Field label="Next action" value={action} placeholder="—" />
                      </div>
                    </div>
                  </div>
                )}

                {userNotes && !lead.note?.startsWith("Not Interested") && (
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">Notes</h3>
                    <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 border-l-2 border-slate-200 pl-4">{userNotes}</pre>
                  </div>
                )}

                {lead.note?.startsWith("Not Interested") && (
                  <div className="mt-5 rounded-lg bg-slate-50 p-4">
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Not Interested</h3>
                    <p className="text-sm text-slate-700">{lead.note}</p>
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {tab === "timeline" && (
            <div className="max-w-2xl">
              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  Timeline
                </h3>
                {timelineCycles.length > 0 ? (
                  <div className="relative space-y-4">
                    {/* Vertical connector line */}
                    <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200" />
                    {timelineCycles.map((cycle, i) => (
                      <div
                        key={i}
                        className={`relative flex flex-col gap-2 rounded-xl border p-4 transition-all duration-200 ${
                          i === 0
                            ? "border-slate-300 bg-slate-50 ring-1 ring-slate-200/80"
                            : "border-slate-200 bg-white hover:bg-slate-50/50"
                        }`}
                      >
                        {i === 0 && (
                          <span className="absolute -top-2 left-4 rounded bg-slate-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                            Latest
                          </span>
                        )}
                        {cycle.type === "cycle" ? (
                          <>
                            {/* Cycle: Flow → Tag → Action */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${
                                  FLOW_COLORS[cycle.flow] ?? "bg-slate-100 text-slate-700 border-slate-300"
                                }`}
                              >
                                {cycle.flow}
                              </span>
                              <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                              <span
                                className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${
                                  TAG_COLORS[cycle.tag as keyof typeof TAG_COLORS] ?? "bg-slate-100 text-slate-700 border-slate-300"
                                }`}
                              >
                                {cycle.tag}
                              </span>
                              {cycle.action && (
                                <>
                                  <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                  <span className="inline-flex max-w-sm rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
                                    {cycle.action}
                                  </span>
                                </>
                              )}
                            </div>
                            {cycle.date && (
                              <p className="text-xs text-slate-500">{cycle.date}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-slate-800">{cycle.label}</p>
                            {cycle.date && (
                              <p className="text-xs text-slate-500">{cycle.date}</p>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-3 text-sm font-medium text-slate-500">No activity yet</p>
                    <p className="mt-1 text-xs text-slate-400">Timeline will appear as you update the lead</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "documents" && (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 ring-2 ring-slate-200/50">
                <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="mt-4 text-base font-semibold text-slate-700">Documents</p>
              <p className="mt-1 text-sm text-slate-500">No documents uploaded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
