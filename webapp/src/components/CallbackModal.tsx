"use client";

import { useState, useEffect, useCallback } from "react";
import { localDateTimeToISO } from "@/lib/dateUtils";
import { useAppTimezone } from "@/components/AppTimezoneProvider";

interface CallbackModalProps {
  leadName: string;
  leadId: string;
  leadNumber?: string;
  id: string;
  onClose: () => void;
  /** When provided, Back goes to previous modal (one step). When not provided, back button is hidden. */
  onBack?: () => void;
  onSuccess: () => void;
}

const QUICK_PRESETS = [
  { label: "15 min", mins: 15 },
  { label: "30 min", mins: 30 },
  { label: "1 hr", mins: 60 },
  { label: "2 hr", mins: 120 },
  { label: "3 hr", mins: 180 },
  { label: "Tomorrow 10 AM", custom: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  }},
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

export function CallbackModal({
  leadName,
  leadId,
  leadNumber,
  id,
  onClose,
  onBack,
  onSuccess,
}: CallbackModalProps) {
  void leadId;
  void leadNumber;
  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    return formatDateForInput(d);
  });
  const [time, setTime] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    return formatTimeForInput(d);
  });
  const { utcOffsetMinutes } = useAppTimezone();
  const now = new Date();
  const today = formatDateForInput(now);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = useCallback((mins?: number, custom?: () => Date) => {
    const d = custom ? custom() : new Date(Date.now() + (mins ?? 0) * 60 * 1000);
    setDate(formatDateForInput(d));
    setTime(formatTimeForInput(d));
    setError(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;
    setLoading(true);
    setError(null);
    const callbackTime = localDateTimeToISO(date, time, utcOffsetMinutes);
    const res = await fetch("/api/callbacks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, callbackTime }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to schedule. Try again.");
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
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 rounded p-1.5 text-white/90 hover:bg-white/20 transition-colors"
              aria-label="Back"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          ) : (
            <span className="w-9 shrink-0" aria-hidden />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">Schedule Call Back</h2>
              <p className="truncate text-xs text-slate-300">{leadName}{leadNumber ? ` • ${leadNumber}` : ""}</p>
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

        <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <p className="text-sm font-medium text-slate-700">Quick select:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => p.custom ? applyPreset(undefined, p.custom) : applyPreset(p.mins)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={today}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              />
            </div>
          </div>

          {date && time && (
            <p className="mb-4 text-sm text-neutral-500">
              Call at: {new Date(`${date}T${time}`).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-700 px-4 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Schedule"}
          </button>
        </form>
      </div>
    </div>
  );
}
