"use client";

import { useState, useEffect, useCallback } from "react";
import type { Lead, TagOption } from "@/types/lead";
import { TAGS_FOR_NOT_CONNECTED } from "@/types/lead";
import { appendTagHistory } from "@/lib/leadNote";
import { NotInterestedFormContent, type NotInterestedResult } from "./NotInterestedFormContent";

const QUICK_PRESETS = [
  { label: "15 min", mins: 15 },
  { label: "30 min", mins: 30 },
  { label: "1 hr", mins: 60 },
  { label: "2 hr", mins: 120 },
  { label: "3 hr", mins: 180 },
  {
    label: "Tomorrow 10 AM",
    custom: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      return d;
    },
  },
];

function formatDateForInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatTimeForInput(d: Date) {
  return d.toTimeString().slice(0, 5);
}

/** Parse note for last "Attempt N: Tag" - same tag = same cycle, increment; else new cycle = 1 */
function getNextAttempt(prevNote: string | undefined, newTag: TagOption): number {
  if (!prevNote) return 1;
  const parts = prevNote.split(" | ");
  for (let i = parts.length - 1; i >= 0; i--) {
    const m = parts[i].trim().match(/^Attempt\s+(\d+):\s*(.+)$/);
    if (m) {
      const prevTag = m[2].trim();
      if (prevTag === newTag) return parseInt(m[1], 10) + 1;
      return 1;
    }
  }
  return 1;
}

export interface CallDialModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
  onConnectInterested?: (lead: Lead) => void;
  onConnectNotInterested?: (lead: Lead) => void;
  /** When user chooses "Document received" after Interested – e.g. open InterestedFollowupModal */
  onConnectDocumentReceived?: (lead: Lead) => void;
  /** When user completes Not Interested form inline – same as NotInterestedModal onConfirm; called with lead + result, then modal closes */
  onConfirmNotInterested?: (lead: Lead, result: NotInterestedResult) => Promise<void>;
  onInvalidNumber?: (lead: Lead) => void;
}

type Step = "dial" | "connect" | "connected" | "reason" | "schedule";

export function CallDialModal({
  lead,
  onClose,
  onSuccess,
  onConnectInterested,
  onConnectNotInterested,
  onConnectDocumentReceived,
  onConfirmNotInterested,
  onInvalidNumber,
}: CallDialModalProps) {
  const [step, setStep] = useState<Step>("dial");
  const [tag, setTag] = useState<TagOption | "">("");
  const [showNotInterestedSubChoice, setShowNotInterestedSubChoice] = useState(false);
  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    return formatDateForInput(d);
  });
  const [time, setTime] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    return formatTimeForInput(d);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileOrTelCapable, setIsMobileOrTelCapable] = useState(true);
  const [showInterestedSubChoice, setShowInterestedSubChoice] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const check = () => setIsMobileOrTelCapable(mq.matches);
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);

  const copyNumber = useCallback(() => {
    const num = lead.number?.replace(/\s*\([^)]*\)/g, "").trim();
    if (num) navigator.clipboard.writeText(num).catch(() => {});
  }, [lead.number]);

  const now = new Date();
  const today = formatDateForInput(now);

  const applyPreset = (mins?: number, custom?: () => Date) => {
    const d = custom ? custom() : new Date(Date.now() + (mins ?? 0) * 60 * 1000);
    setDate(formatDateForInput(d));
    setTime(formatTimeForInput(d));
    setError(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, flow: "Connected", tags: "" }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
      setStep("connected");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed");
    }
  };

  const handleConnectedChoice = (choice: "Interested" | "Not Interested") => {
    if (choice === "Interested") {
      setShowNotInterestedSubChoice(false);
      setShowInterestedSubChoice(true);
    } else if (choice === "Not Interested") {
      if (onConfirmNotInterested) {
        setShowInterestedSubChoice(false);
        setShowNotInterestedSubChoice(true);
      } else if (onConnectNotInterested) {
        onConnectNotInterested(lead);
        onClose();
      } else {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleInterestedChoice = (choice: "new" | "document_received") => {
    if (choice === "new" && onConnectInterested) {
      onConnectInterested(lead);
      onClose();
    } else if (choice === "document_received" && onConnectDocumentReceived) {
      onConnectDocumentReceived(lead);
      onClose();
    } else {
      onClose();
    }
  };

  const handleReasonSelect = async (selectedTag: TagOption) => {
    if (selectedTag === "Invalid Number") {
      if (onInvalidNumber) {
        onInvalidNumber(lead);
        onClose();
      } else {
        setLoading(true);
        setError(null);
        const noteWithHistory = appendTagHistory(lead.note, selectedTag);
        const res = await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: lead.id,
            flow: "Not Connected",
            tags: selectedTag,
            note: noteWithHistory,
            category: "active",
          }),
        });
        setLoading(false);
        if (res.ok) {
          onSuccess();
          onClose();
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed");
        }
      }
      return;
    }

    const canSchedule =
      selectedTag === "No Answer" ||
      selectedTag === "Busy IVR" ||
      selectedTag === "Switch Off";
    if (canSchedule) {
      setTag(selectedTag);
      setError(null);
      setStep("schedule");
      return;
    }

    setTag(selectedTag);
    setLoading(true);
    setError(null);
    const noteWithHistory = appendTagHistory(lead.note, selectedTag);
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: lead.id,
        flow: "Not Connected",
        tags: selectedTag,
        note: noteWithHistory,
      }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed");
    }
  };

  const handleSchedule = async () => {
    if (!tag || !date || !time) {
      setError("Select date and time");
      return;
    }
    setLoading(true);
    setError(null);
    const callbackTime = `${date}T${time}:00`;
    const attemptNum = getNextAttempt(lead.note, tag);
    const attemptNote = `Attempt ${attemptNum}: ${tag}`;
    const noteWithTagHistory = appendTagHistory(lead.note, tag);
    const newNote = noteWithTagHistory ? `${noteWithTagHistory} | ${attemptNote}` : attemptNote;

    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: lead.id,
        flow: "Not Connected",
        tags: tag,
        note: newNote,
        callbackTime,
        category: "callback",
      }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed");
    }
  };

  const dialNumber = lead.number?.replace(/\s*\([^)]*\)/g, "").trim() || "";

  const handleBack = () => {
    if (step === "dial") {
      onClose();
    } else if (step === "connect") {
      setStep("dial");
    } else if (step === "connected") {
      setShowInterestedSubChoice(false);
      setShowNotInterestedSubChoice(false);
      setStep("connect");
    } else if (step === "reason") {
      setStep("connect");
    } else if (step === "schedule") {
      setStep("reason");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center gap-2 bg-gradient-to-br from-slate-700 to-slate-800 px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="shrink-0 rounded p-1.5 text-white/90 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">Call dial</h2>
              <p className="truncate text-xs text-slate-300">{lead.name}{lead.place ? ` • ${lead.place}` : ""}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 bg-red-500 text-white hover:bg-red-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {step === "dial" && (
            <>
              <p className="text-sm font-medium text-neutral-700">Call this lead</p>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2 text-sm">
                <p><span className="font-medium text-neutral-500">Name:</span> {lead.name || "—"}</p>
                <p><span className="font-medium text-neutral-500">Place:</span> {lead.place || "—"}</p>
                <p><span className="font-medium text-neutral-500">ID:</span> {lead.id.slice(0, 8)}</p>
                <p><span className="font-medium text-neutral-500">Number (to dial):</span> {lead.number || "—"}</p>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                {dialNumber ? (
                  isMobileOrTelCapable ? (
                    <a
                      href={`tel:${dialNumber}`}
                      className="flex-1 flex min-w-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700"
                      onClick={() => setStep("connect")}
                    >
                      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Dial
                    </a>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setStep("connect")}
                        className="flex-1 flex min-w-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700"
                      >
                        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Dial (use your phone)
                      </button>
                      <button
                        type="button"
                        onClick={copyNumber}
                        className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Copy number
                      </button>
                    </>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep("connect")}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700"
                  >
                    Next
                  </button>
                )}
              </div>
            </>
          )}

          {step === "connect" && (
            <>
              <p className="mb-4 text-sm font-medium text-neutral-700">Did the call connect?</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "..." : "Connected"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("reason")}
                  className="flex-1 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2.5 font-medium text-amber-900 hover:bg-amber-100"
                >
                  Not connected
                </button>
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
            </>
          )}

          {step === "connected" && (
            <>
              <p className="mb-2 text-xs font-medium text-slate-700">Interested or Not Interested?</p>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleConnectedChoice("Interested")}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    showInterestedSubChoice
                      ? "border-emerald-500 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-500/30"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  Interested
                </button>
                <button
                  type="button"
                  onClick={() => handleConnectedChoice("Not Interested")}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    showNotInterestedSubChoice
                      ? "border-slate-500 bg-slate-200 text-slate-900 ring-2 ring-slate-500/30"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  Not Interested
                </button>
              </div>
              {showInterestedSubChoice && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-700">New or Document received?</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleInterestedChoice("new")}
                        className="rounded-lg border border-emerald-500 bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-900 ring-2 ring-emerald-500/30 hover:bg-emerald-200 transition-colors"
                      >
                        New
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInterestedChoice("document_received")}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                      >
                        Document received
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInterestedSubChoice(false)}
                    className="text-sm text-neutral-500 underline hover:text-neutral-700"
                  >
                    Back
                  </button>
                </div>
              )}
              {showNotInterestedSubChoice && onConfirmNotInterested && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <p className="mb-3 text-sm font-medium text-slate-700">Not Interested – reason &amp; details</p>
                  <NotInterestedFormContent
                    onConfirm={async (result) => {
                      await onConfirmNotInterested(lead, result);
                      onClose();
                    }}
                    onBack={() => setShowNotInterestedSubChoice(false)}
                  />
                </div>
              )}
            </>
          )}

          {step === "reason" && (
            <>
              <p className="mb-2 text-sm font-medium text-neutral-700">Why didn&apos;t it connect?</p>
              <div className="flex flex-wrap gap-2">
                {TAGS_FOR_NOT_CONNECTED.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={loading}
                    onClick={() => handleReasonSelect(t)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {t}
                  </button>
                ))}
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
            </>
          )}

          {step === "schedule" && (
            <>
              <p className="mb-2 text-sm font-medium text-neutral-700">
                Schedule callback? <span className="text-amber-700">({tag})</span>
              </p>
              <div className="mb-3 flex flex-wrap gap-2">
                {QUICK_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => (p.custom ? applyPreset(undefined, p.custom) : applyPreset(p.mins))}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={today}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              {error && (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Schedule Callback"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
