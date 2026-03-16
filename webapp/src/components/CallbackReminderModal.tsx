"use client";

import { useState, useEffect } from "react";
import type { Lead, TagOption } from "@/types/lead";
import { TAGS_FOR_NOT_CONNECTED, TAGS_SCHEDULEABLE_CALLBACK } from "@/types/lead";
import { appendTagHistory, getAutoScheduleHoursForAttempt, getNextAttempt, canScheduleMoreHolds } from "@/lib/leadNote";
import { localDateTimeToISO } from "@/lib/dateUtils";
import { useAppTimezone } from "@/components/AppTimezoneProvider";
import { ACTION_NOTE_PREFIX, FLOW_DISPLAY_LABELS, SCHEDULE_CALLBACK_LABEL } from "@/lib/constants";
import { FlowIcon } from "./TagIcons";
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

export interface CallbackReminderModalProps {
  lead: Lead;
  /** "reminder" = countdown running. "callNow" = time reached, show Call now + Dial. "result" = open directly at Did the call connect? (e.g. from OverdueCallModal after Dial). */
  entryStep?: "reminder" | "callNow" | "result";
  onClose: () => void;
  onSuccess: () => void;
  onConnectInterested?: (lead: Lead) => void;
  onConnectNotInterested?: (lead: Lead) => void;
  onInvalidNumber?: (lead: Lead) => void;
  /** When lead is moved to New Assigned (hold limit); parent shows animation and refreshes after. If provided, onSuccess is not called so refresh happens after animation. */
  onMoveToNewAssigned?: (lead: Lead) => void;
  /** When user selects Incoming Off – open WhatsApp modal (same as CallDial). If not provided, Incoming Off is applied without opening WhatsApp. */
  onIncomingOffClick?: (lead: Lead) => void;
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
  onMoveToNewAssigned,
  onIncomingOffClick,
}: CallbackReminderModalProps) {
  const countdown = useCountdown(lead.callbackTime || null);
  const [step, setStep] = useState<Step>(
    entryStep === "result" ? "result" : entryStep === "callNow" ? "callNow" : "reminder"
  );
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
  const { utcOffsetMinutes } = useAppTimezone();

  const now = new Date();
  const today = formatDateForInput(now);

  const handleBack = () => {
    if (step === "reminder") onClose();
    else if (step === "callNow") setStep("reminder");
    else if (step === "result") setStep("callNow");
    else if (step === "connected") setStep("result");
    else if (step === "not_connect") setStep("result");
    else if (step === "schedule") setStep("not_connect");
  };

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

  // Auto-schedule default: No Answer, Switch Off, Busy IVR – attempt 1 = 2h, 2 = 8h, 3 = 12h (shift logic applied on save)
  useEffect(() => {
    if (step !== "schedule" || !tag) return;
    if (!TAGS_SCHEDULEABLE_CALLBACK.includes(tag)) return;
    const attempt = getNextAttempt(lead.note, tag);
    const hours = getAutoScheduleHoursForAttempt(attempt);
    if (hours != null) {
      const d = new Date(Date.now() + hours * 60 * 60 * 1000);
      setDate(formatDateForInput(d));
      setTime(formatTimeForInput(d));
    }
  }, [step, tag, lead.note]);

  const handleConnect = () => {
    setError(null);
    setStep("connected");
    fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, flow: "Connected", tags: "" }),
    }).then((res) => {
      if (!res.ok) {
        res.json().catch(() => ({})).then((data) => {
          setError(data?.error || "Failed");
          setStep("result");
        });
      }
    });
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

  const handleNotConnectTagClick = async (t: TagOption) => {
    if (t === "Incoming Off") {
      if (onIncomingOffClick) {
        onIncomingOffClick(lead);
      }
      onClose();
      return;
    }
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
    if (TAGS_SCHEDULEABLE_CALLBACK.includes(t) && canScheduleMoreHolds(lead.note, t)) {
      const attempt = getNextAttempt(lead.note, t);
      const hours = getAutoScheduleHoursForAttempt(attempt);
      if (hours != null) {
        setLoading(true);
        setError(null);
        // Proposed time (e.g. now+2h); API applies shift then token, then save
        const callbackTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        const attemptNote = `Attempt ${attempt}: ${t}`;
        const noteWithTagHistory = appendTagHistory(lead.note, t);
        const noteWithAttempt = noteWithTagHistory ? `${noteWithTagHistory} | ${attemptNote}` : attemptNote;
        const callbackDateStr = new Date(callbackTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
        const actionNote = `${ACTION_NOTE_PREFIX}Callback scheduled for ${callbackDateStr}`;
        const newNote = noteWithAttempt ? `${noteWithAttempt} | ${actionNote}` : actionNote;
        try {
          const res = await fetch("/api/leads", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: lead.id,
              flow: "Not Connected",
              tags: t,
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
        } catch {
          setLoading(false);
          setError("Failed");
        }
        return;
      }
    }
    setTag(t);
    setError(null);
    setStep("schedule");
  };

  const handleSchedule = async () => {
    if (!tag || !date || !time) {
      setError("Select date and time");
      return;
    }
    setLoading(true);
    setError(null);
    const callbackTime = localDateTimeToISO(date, time, utcOffsetMinutes);
    const attemptNum = getNextAttempt(lead.note, tag);
    const attemptNote = `Attempt ${attemptNum}: ${tag}`;
    const noteWithTagHistory = appendTagHistory(lead.note, tag);
    const noteWithAttempt = noteWithTagHistory ? `${noteWithTagHistory} | ${attemptNote}` : attemptNote;
    const callbackDateStr = new Date(callbackTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
    const actionNote = `${ACTION_NOTE_PREFIX}Callback scheduled for ${callbackDateStr}`;
    const newNote = noteWithAttempt ? `${noteWithAttempt} | ${actionNote}` : actionNote;

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

  const handleMoveToNewAssigned = async () => {
    setLoading(true);
    setError(null);
    const noteSuffix = "Max hold attempts reached – moved to New Assigned";
    const baseNote = lead.note?.trim() ? `${lead.note} | ${ACTION_NOTE_PREFIX}${noteSuffix}` : `${ACTION_NOTE_PREFIX}${noteSuffix}`;
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: lead.id,
        note: baseNote,
        moveToNewAssigned: true,
      }),
    });
    setLoading(false);
    if (res.ok) {
      if (onMoveToNewAssigned) {
        onMoveToNewAssigned(lead);
        onClose();
      } else {
        onSuccess();
        onClose();
      }
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
        <div className="relative flex items-center gap-2 bg-gradient-to-br from-amber-700 to-amber-800 px-4 py-3">
          {step !== "reminder" ? (
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
          ) : (
            <span className="w-9 shrink-0" aria-hidden />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-white">Callback</h2>
              <p className="mt-0.5 truncate text-sm font-medium text-amber-100" title={[lead.name, lead.number].filter(Boolean).join(" • ") || undefined}>
                {lead.name && <span>{lead.name}</span>}
                {lead.name && lead.number && <span className="mx-1.5 opacity-75">•</span>}
                {lead.number && <span className="font-mono">{lead.number.replace(/\s/g, "").split(",")[0]}</span>}
              </p>
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
          {step === "reminder" && (
            <>
              <p className="text-sm font-medium text-neutral-700">Wait – call this lead after</p>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2 text-sm">
                <p><span className="font-medium text-neutral-500">Time left: </span><span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-300">{countdown || "—"}</span></p>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setStep("result")}
                  className="flex-1 min-w-0 rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700"
                >
                  Client callback received
                </button>
              </div>
            </>
          )}

          {step === "callNow" && (
            <>
              <p className="mb-3 text-base font-semibold text-neutral-800">Callback – call this lead now</p>
              {lead.number && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700/80">Number</p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-amber-900 tracking-wide">
                    {lead.number.replace(/\s/g, "").split(",")[0]}
                  </p>
                </div>
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
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "..." : (
                    <>
                      <FlowIcon flow="Connected" className="h-5 w-5 shrink-0" />
                      {FLOW_DISPLAY_LABELS.Connected}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("not_connect")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2.5 font-medium text-amber-900 hover:bg-amber-100"
                >
                  <FlowIcon flow="Not Connected" className="h-5 w-5 shrink-0" />
                  {FLOW_DISPLAY_LABELS["Not Connected"]}
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleConnectedChoice("Interested")}
                  className="rounded-lg border border-emerald-500 bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                  Interested
                </button>
                <button
                  type="button"
                  onClick={() => handleConnectedChoice("Not Interested")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  Not Interested
                </button>
              </div>
            </>
          )}

          {step === "not_connect" && (
            <>
              <p className="mb-3 text-sm font-medium text-neutral-700">Why didn&apos;t it connect?</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {TAGS_FOR_NOT_CONNECTED.map((tagOption) => (
                  <button
                    key={tagOption}
                    type="button"
                    disabled={loading}
                    onClick={() => handleNotConnectTagClick(tagOption)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {tagOption}
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
              {!canScheduleMoreHolds(lead.note, tag ?? "") ? (
                <>
                  <p className="mb-2 text-sm font-medium text-neutral-700">
                    Max holds reached for <span className="text-amber-700">{tag}</span> (3 attempts). Schedule is not allowed. Send this lead to New Assigned for admin.
                  </p>
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
                      onClick={handleMoveToNewAssigned}
                      disabled={loading}
                      className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? "Moving..." : "Move to New Assigned"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-2 text-sm font-medium text-neutral-700">
                    {SCHEDULE_CALLBACK_LABEL} <span className="text-amber-700">({tag})</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
