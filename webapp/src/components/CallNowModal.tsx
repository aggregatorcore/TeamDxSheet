"use client";

import { useState, useEffect } from "react";
import type { Lead, TagOption } from "@/types/lead";
import { TAGS_FOR_CONNECTED, TAGS_FOR_NOT_CONNECTED } from "@/types/lead";
import { appendTagHistory } from "@/lib/leadNote";

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

interface CallNowModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
  /** When user selects Interested after Connect - parent opens InterestedModal */
  onConnectInterested?: (lead: Lead) => void;
  /** When user selects Not Interested after Connect - parent opens NotInterestedModal */
  onConnectNotInterested?: (lead: Lead) => void;
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
      return 1; // different tag = new cycle
    }
  }
  return 1;
}

export function CallNowModal({
  lead,
  onClose,
  onSuccess,
  onConnectInterested,
  onConnectNotInterested,
}: CallNowModalProps) {
  const [step, setStep] = useState<"attempt" | "result" | "connected" | "not_connect" | "schedule">("attempt");
  const [tag, setTag] = useState<TagOption | "">("");
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

  const handleConnectedChoice = (tag: "Interested" | "Not Interested") => {
    if (tag === "Interested" && onConnectInterested) {
      onConnectInterested(lead);
      onClose();
    } else if (tag === "Not Interested" && onConnectNotInterested) {
      onConnectNotInterested(lead);
      onClose();
    } else {
      onClose();
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Call Now</h2>
              <p className="text-xs text-slate-300">{lead.name}{lead.number ? ` • ${lead.number}` : ""}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {step === "attempt" && (
            <>
              <p className="mb-4 text-sm font-medium text-neutral-700">Call attempt hua ya nahi?</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("result")}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  No
                </button>
              </div>
            </>
          )}

          {step === "result" && (
            <>
              <p className="mb-4 text-sm font-medium text-neutral-700">Connect ya Not Connect?</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "..." : "Connect"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("not_connect")}
                  className="flex-1 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2.5 font-medium text-amber-900 hover:bg-amber-100"
                >
                  Not Connect
                </button>
              </div>
            </>
          )}

          {step === "connected" && (
            <>
              <p className="mb-4 text-sm font-medium text-neutral-700">Interested ya Not Interested?</p>
              <div className="flex gap-3">
                {TAGS_FOR_CONNECTED.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleConnectedChoice(t as "Interested" | "Not Interested")}
                    className={`flex-1 rounded-lg px-4 py-2.5 font-medium ${
                      t === "Interested"
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "not_connect" && (
            <>
              <p className="mb-2 text-sm font-medium text-neutral-700">Select tag:</p>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value as TagOption)}
                className="mb-4 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select tag</option>
                {TAGS_FOR_NOT_CONNECTED.filter((t) => t !== "Invalid Number").map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {error && (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("result")}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!tag) {
                      setError("Select tag");
                      return;
                    }
                    setError(null);
                    setStep("schedule");
                  }}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === "schedule" && (
            <>
              <p className="mb-2 text-sm font-medium text-neutral-700">
                Schedule callback <span className="text-amber-700">({tag})</span>
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
                  onClick={() => setStep("not_connect")}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Back
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
