"use client";

import { useState, useEffect } from "react";
import type { Lead, FlowOption } from "@/types/lead";
import { getTagHistory } from "@/lib/leadNote";
import { FLOW_COLORS, TAG_COLORS } from "@/lib/constants";

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  initialTab?: "overview" | "timeline" | "documents";
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
  "Name", "Place", "Email", "Qualification", "Working", "Experience", "Target", "Budget",
  "Prev travel", "Rejection", "Action", "Passport", "Passport status",
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

function Field({ label, value }: { label: string; value: string | undefined }) {
  if (!value || value === "-") return null;
  return (
    <div className="flex gap-2 py-1">
      <span className="min-w-[110px] shrink-0 text-sm font-medium text-slate-500">{label}:</span>
      <span className="text-base text-slate-900">{value}</span>
    </div>
  );
}

export function LeadDetailModal({ lead, onClose, initialTab = "overview" }: LeadDetailModalProps) {
  const [tab, setTab] = useState<"overview" | "timeline" | "documents">(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [lead.id, initialTab]);

  const parsed = lead.note ? parseNote(lead.note) : {};
  const action = parsed["Action"];
  const userNotes = getUserNotes(lead.note);
  const timelineCycles = getTimelineCycles(lead.note, lead, action);

  const targetCountry = parsed["Target"]?.split(", Visa:")[0]?.trim();
  const visaType = parsed["Target"]?.includes("Visa:") ? parsed["Target"].split("Visa:")[1]?.trim() : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity"
      onClick={onClose}
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
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
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
              {/* Profile sections */}
              <div className="space-y-4">
                {/* Contact + Qualification & Occupation side by side */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
                  {/* Contact */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </span>
                      Contact
                    </h3>
                    <div className="space-y-1">
                      {lead.name && (
                        <div className="flex gap-2 py-1">
                          <span className="min-w-[110px] shrink-0 text-sm font-medium text-slate-500">Name:</span>
                          <span className="text-base font-semibold text-slate-900">{lead.name}</span>
                        </div>
                      )}
                      <Field label="Place" value={lead.place} />
                      {lead.number && (
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
                      )}
                      {parsed["Email"] && (
                        <a
                          href={`mailto:${parsed["Email"]}`}
                          className="flex gap-2 py-1 transition-colors duration-200 hover:text-sky-600"
                        >
                          <span className="min-w-[110px] shrink-0 text-sm font-medium text-slate-500">Email:</span>
                          <span className="text-base text-sky-600 hover:underline">{parsed["Email"]}</span>
                        </a>
                      )}
                      <Field label="Source" value={lead.source} />
                      {lead.id && (
                        <div className="flex gap-2 py-1 min-w-0" title={lead.id}>
                          <span className="min-w-[110px] shrink-0 text-sm font-medium text-slate-500">ID:</span>
                          <span className="min-w-0 truncate font-mono text-sm text-slate-600">{lead.id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Qualification & Occupation */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </span>
                      Qualification & Occupation
                    </h3>
                    <div className="space-y-1">
                      <Field label="Qualification" value={parsed["Qualification"]} />
                      <Field label="Occupation" value={parsed["Working"] ?? parsed["Occupation"]} />
                      <Field label="Passport" value={parsed["Passport"] ?? parsed["Passport status"]} />
                      <Field label="Budget" value={parsed["Budget"]} />
                      <Field label="Target Country" value={targetCountry} />
                      <Field label="Visa Type" value={visaType} />
                    </div>
                  </div>
                </div>

                {/* Travel History */}
                {parsed["Prev travel"] && (
                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0h.5a2.5 2.5 0 002.5-2.5V8.935M12 12a2 2 0 104 0 2 2 0 00-4 0z" />
                        </svg>
                      </span>
                      Travel History
                    </h3>
                    <Field label="Previous Travel" value={parsed["Prev travel"]} />
                  </div>
                )}

                {/* Rejection */}
                {parsed["Rejection"] && (
                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </span>
                      Rejection
                    </h3>
                    <Field label="Details" value={parsed["Rejection"]} />
                  </div>
                )}

                {/* Next Action */}
                {action && (
                  <div className="rounded-xl border-2 border-amber-200 bg-amber-50/80 p-5 shadow-sm">
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Next Action
                    </h3>
                    <p className="font-medium text-amber-900">{action}</p>
                  </div>
                )}

                {/* Notes */}
                {userNotes && !lead.note?.startsWith("Not Interested") && (
                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">Notes</h3>
                    <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 border-l-2 border-slate-200 pl-4">{userNotes}</pre>
                  </div>
                )}

                {lead.note?.startsWith("Not Interested") && (
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-5 shadow-sm">
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Not Interested</h3>
                    <p className="text-sm text-slate-700">{lead.note}</p>
                  </div>
                )}
              </div>
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
