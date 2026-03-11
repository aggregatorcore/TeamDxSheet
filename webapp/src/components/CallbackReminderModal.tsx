"use client";

import { useState, useEffect } from "react";
import type { Lead, TagOption } from "@/types/lead";
import { TAGS_FOR_CONNECTED, TAGS_FOR_NOT_CONNECTED } from "@/types/lead";
import { appendTagHistory } from "@/lib/leadNote";
import { useCountdown } from "@/hooks/useCountdown";

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

export interface CallbackReminderModalProps {
  lead: Lead;
  /** "reminder" = countdown running, show wait + OK / Client callback. "callNow" = time reached, show Call now + Dial / Abhi nahi. */
  entryStep?: "reminder" | "callNow";
  onClose: () => void;
  onSuccess: () => void;
  onConnectInterested?: (lead: Lead) => void;
  onConnectNotInterested?: (lead: Lead) => void;
  onInvalidNumber?: (lead: Lead) => void;
}

type Step = "reminder" | "callNow" | "result" | "connected" | "not_connect" | "schedule";

export function CallbackReminderModal({
  lead,
  entryStep = "reminder",
  onClose,
  onSuccess,
  onConnectInterested,
  onConnectNotInterested,
  onInvalidNumber,
}: CallbackReminderModalProps) {
  const countdown = useCountdown(lead.callbackTime || null);
  const [step, setStep] = useState<Step>(entryStep === "callNow" ? "callNow" : "reminder");
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
      setStep("connected");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed");
    }
  };

  const handleConnectedChoice = (choice: "Interested" | "Not Interested") => {
    if (choice === "Interested" && onConnectInterested) {
      onConnectInterested(lead);
      onClose();
    } else if (choice === "Not Interested" && onConnectNotInterested) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-amber-700 to-amber-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Callback</h2>
              <p className="text-xs text-amber-200">{lead.name}{lead.number ? ` • ${lead.number}` : ""}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 rounded p-1.5 bg-red-500 text-white hover:bg-red-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {step === "reminder" && (
            <>
              <p className="mb-4 text-sm font-medium text-neutral-700">
                Wait – call this lead after {countdown || "—"}.
              </p>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-amber-500 bg-amber-50 px-4 py-2.5 font-medium text-amber-800 hover:bg-amber-100"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setStep("result")}
                  className="rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700"
                >
                  Client callback received
                </button>
              </div>
            </>
          )}

          {step === "callNow" && (
            <>
              <p className="mb-2 text-sm font-medium text-neutral-700">Call this lead now</p>
              {lead.number && (
                <p className="mb-4 text-sm text-neutral-600">Number: {lead.number}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("result")}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700"
                >
                  Dial
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Not now
                </button>
              </div>
            </>
          )}

          {step === "result" && (
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
                  onClick={() => setStep("not_connect")}
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
              <p className="mb-4 text-sm font-medium text-neutral-700">Interested or Not Interested?</p>
              <div className="flex gap-3">
                {TAGS_FOR_CONNECTED.filter((t) => t === "Interested" || t === "Not Interested").map((t) => (
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
              <p className="mb-3 text-sm font-medium text-neutral-700">Why didn&apos;t it connect?</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {TAGS_FOR_NOT_CONNECTED.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setTag(t);
                      if (t === "Invalid Number") {
                        if (onInvalidNumber) {
                          onInvalidNumber(lead);
                          onClose();
                          return;
                        }
                        setLoading(true);
                        setError(null);
                        const noteWithHistory = appendTagHistory(lead.note, t);
                        fetch("/api/leads", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            id: lead.id,
                            flow: "Not Connected",
                            tags: t,
                            note: noteWithHistory,
                            category: "active",
                          }),
                        })
                          .then((res) => {
                            setLoading(false);
                            if (res.ok) {
                              onSuccess();
                              onClose();
                            } else {
                              res.json().catch(() => ({})).then((data) => setError(data.error || "Failed"));
                            }
                          })
                          .catch(() => setLoading(false));
                        return;
                      }
                      setError(null);
                      setStep("schedule");
                    }}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {t}
                  </button>
                ))}
              </div>
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
