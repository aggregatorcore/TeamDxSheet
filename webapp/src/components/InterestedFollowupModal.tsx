"use client";

import { useState, useEffect, useCallback } from "react";
import { openWhatsApp, getWaChatUrl } from "@/lib/whatsapp";
import { localDateTimeToISO } from "@/lib/dateUtils";
import { useAppTimezone } from "@/components/AppTimezoneProvider";
import { WHATSAPP_FOLLOWUP_HOURS } from "@/lib/constants";
import type { Lead } from "@/types/lead";

function formatDateForInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatTimeForInput(d: Date) {
  return d.toTimeString().slice(0, 5);
}

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

interface InterestedFollowupModalProps {
  lead: Lead;
  action?: string;
  onClose: () => void;
  onSuccess: () => void;
  onDocumentReceived?: (lead: Lead) => void;
  /** When user selects "Client refused" – parent opens Not Interested flow */
  onNotInterested?: (lead: Lead) => void;
}

export function InterestedFollowupModal({
  lead,
  action,
  onClose,
  onSuccess,
  onDocumentReceived,
  onNotInterested,
}: InterestedFollowupModalProps) {
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNoReason, setShowNoReason] = useState(false);
  const [scheduleReason, setScheduleReason] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return formatDateForInput(d);
  });
  const [scheduleTime, setScheduleTime] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return formatTimeForInput(d);
  });
  const { utcOffsetMinutes } = useAppTimezone();
  const now = new Date();
  const today = formatDateForInput(now);

  const applyPreset = useCallback((mins?: number, custom?: () => Date) => {
    const d = custom ? custom() : new Date(Date.now() + (mins ?? 0) * 60 * 1000);
    setScheduleDate(formatDateForInput(d));
    setScheduleTime(formatTimeForInput(d));
    setError(null);
  }, []);

  useEffect(() => {
    const schedule = async () => {
      const nextFollowup = new Date(Date.now() + WHATSAPP_FOLLOWUP_HOURS * 60 * 60 * 1000);
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          category: "callback",
          callbackTime: nextFollowup.toISOString(),
        }),
      });
      setLoading(false);
      if (res.ok) onSuccess();
    };
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, lead.number]);

  const handleScheduleWithReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleReason || !scheduleDate || !scheduleTime) return;
    setScheduling(true);
    setError(null);
    const callbackTime = localDateTimeToISO(scheduleDate, scheduleTime, utcOffsetMinutes);
    const actionNote = `Action: ${scheduleReason}`;
    const newNote = lead.note ? `${lead.note} | ${actionNote}` : actionNote;
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: lead.id,
        note: newNote,
        category: "callback",
        callbackTime,
      }),
    });
    setScheduling(false);
    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Failed to schedule.");
    }
  };

  const handleYes = async () => {
    setError(null);
    setScheduling(true);
    const note = lead.note ? `${lead.note} | Document received` : "Document received";
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          note,
          moveToGreenBucket: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onDocumentReceived?.({ ...lead, note });
        onClose();
      } else {
        setError(data?.error || `Failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setScheduling(false);
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
            onClick={onClose}
            className="shrink-0 rounded p-1.5 text-white/90 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">Document Followup</h2>
              <p className="truncate text-xs text-slate-300">{lead.name} • {lead.number}</p>
              {action ? <p className="truncate text-xs text-slate-400 mt-0.5">{action}</p> : null}
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
          <button
            type="button"
            onClick={() => openWhatsApp(getWaChatUrl(lead.number))}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Check WhatsApp
          </button>
          {loading ? (
            <p className="mb-4 text-sm text-neutral-600">
              Scheduling followup...
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-neutral-600">
                Did you receive the documents?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleYes}
                  disabled={scheduling}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {scheduling ? "..." : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNoReason(true)}
                  disabled={scheduling}
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  No
                </button>
              </div>
              {!showNoReason && (
                <p className="mt-2 text-xs text-neutral-500">
                  No: choose why. Yes: lead will go to Green Bucket.
                </p>
              )}
              {showNoReason && !scheduleReason && (
                <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-neutral-800">Why were the documents not received?</p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleReason("Client is busy right now")}
                      className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-left text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                    >
                      Client is busy right now
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleReason("Client not responding")}
                      className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-left text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                    >
                      Client not responding
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNotInterested?.(lead);
                        onClose();
                      }}
                      className="rounded-lg border border-slate-400 bg-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-200"
                    >
                      Client refused
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNoReason(false)}
                    className="mt-2 text-xs text-neutral-500 underline hover:text-neutral-700"
                  >
                    Back
                  </button>
                </div>
              )}
              {showNoReason && scheduleReason && (
                <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-neutral-800">
                    Schedule followup: <span className="text-neutral-600">{scheduleReason}</span>
                  </p>
                  <form onSubmit={handleScheduleWithReason} className="space-y-3">
                    <p className="text-xs font-medium text-slate-600">Quick select:</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => (p.custom ? applyPreset(undefined, p.custom) : applyPreset(p.mins))}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={today}
                          required
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Time</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          required
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                    </div>
                    {scheduleDate && scheduleTime && (
                      <p className="text-xs text-neutral-500">
                        Call at: {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    )}
                    {error ? <p className="text-sm text-red-600">{error}</p> : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setScheduleReason(null)}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={scheduling}
                        className="flex-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {scheduling ? "Saving..." : "Schedule"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            </>
          )}

          {!loading && (
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
