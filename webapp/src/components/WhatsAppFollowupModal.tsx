"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/types/lead";
import { openWhatsApp, getWaChatUrl } from "@/lib/whatsapp";
import { localDateTimeToISO } from "@/lib/dateUtils";
import { useAppTimezone } from "@/components/AppTimezoneProvider";
import { WHATSAPP_FOLLOWUP_HOURS, WHATSAPP_FOLLOWUP_MAX_DAYS } from "@/lib/constants";

function formatDateForInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatTimeForInput(d: Date) {
  return d.toTimeString().slice(0, 5);
}

type YesStep = "choice" | "another_input" | "connected";
type NumberUsage = "only_whatsapp" | "calling" | "calling_and_whatsapp";

interface WhatsAppFollowupModalProps {
  /** Full lead (preferred). When provided, used for callbacks and number updates. */
  lead?: Lead;
  leadName: string;
  number: string;
  id: string;
  whatsappFollowupStartedAt?: string;
  onClose: () => void;
  onSuccess: () => void;
  onConnectInterested?: (lead: Lead) => void;
  onConnectNotInterested?: (lead: Lead) => void;
}

function normalizeNumberForDisplay(num: string): string {
  return num.replace(/\s*\([^)]*\)/g, "").trim().split(",")[0] ?? "";
}

export function WhatsAppFollowupModal({
  lead: leadProp,
  leadName,
  number,
  id,
  whatsappFollowupStartedAt,
  onClose,
  onSuccess,
  onConnectInterested,
  onConnectNotInterested,
}: WhatsAppFollowupModalProps) {
  const lead = leadProp ?? { id, name: leadName, number, place: "", source: "", flow: "Not Connected", tags: "", callbackTime: "", assignedTo: "", category: "active" } as Lead;
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"yes" | "no" | null>(null);
  const [yesStep, setYesStep] = useState<YesStep | null>(null);
  const [anotherNumber, setAnotherNumber] = useState("");
  const [numberUsage, setNumberUsage] = useState<NumberUsage | null>(null);
  const [connectedLead, setConnectedLead] = useState<Lead | null>(null);
  const [anotherNumberError, setAnotherNumberError] = useState<string | null>(null);
  const [showCustomSchedule, setShowCustomSchedule] = useState(false);
  const { utcOffsetMinutes } = useAppTimezone();
  const defaultSchedule = new Date(Date.now() + WHATSAPP_FOLLOWUP_HOURS * 60 * 60 * 1000);
  const [customDate, setCustomDate] = useState(() => formatDateForInput(defaultSchedule));
  const [customTime, setCustomTime] = useState(() => formatTimeForInput(defaultSchedule));
  const [customScheduleError, setCustomScheduleError] = useState<string | null>(null);
  const now = new Date();
  const today = formatDateForInput(now);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const started = whatsappFollowupStartedAt ? new Date(whatsappFollowupStartedAt) : new Date();
  const daysPassed = (Date.now() - started.getTime()) / (24 * 60 * 60 * 1000);
  const noButtonText =
    daysPassed >= WHATSAPP_FOLLOWUP_MAX_DAYS ? "Hide lead (2 days passed)" : "Schedule next followup (1 hr)";

  const handleSameNumberContinue = () => {
    // No PATCH, no tag: "Same number" is just the answer to the question. Tag is applied only when user picks Interested or Not Interested.
    setConnectedLead(lead);
    setYesStep("connected");
  };

  const handleAnotherNumberSubmit = async () => {
    const trimmed = anotherNumber.replace(/\D/g, "").trim();
    if (trimmed.length < 10) {
      setAnotherNumberError("Enter valid 10-digit number");
      return;
    }
    if (!numberUsage) {
      setAnotherNumberError("Select how to use this number");
      return;
    }
    setAnotherNumberError(null);
    setLoading(true);
    const existingRaw = lead.number.replace(/\s*\([^)]*\)/g, "").trim().split(",")[0]?.trim() ?? lead.number.trim();
    let newNumberValue: string;
    if (numberUsage === "only_whatsapp" || numberUsage === "calling_and_whatsapp") {
      newNumberValue = trimmed;
    } else {
      newNumberValue = `${trimmed} (Calling), ${existingRaw} (WhatsApp)`;
    }
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        flow: "Connected",
        tags: "",
        category: "active",
        number: newNumberValue,
        callbackTime: "",
        whatsappFollowupStartedAt: "",
      }),
    });
    setLoading(false);
    if (res.ok) {
      const updated = {
        ...lead,
        flow: "Connected" as const,
        tags: "" as const,
        category: "active" as const,
        number: newNumberValue,
        callbackTime: "",
        whatsappFollowupStartedAt: "",
      };
      setConnectedLead(updated);
      setYesStep("connected");
      onSuccess();
    } else {
      setAnotherNumberError("Failed to update");
    }
  };

  const handleConnectedChoice = (choice: "Interested" | "Not Interested") => {
    const toPass = connectedLead ?? lead;
    if (choice === "Interested" && onConnectInterested) {
      onConnectInterested(toPass);
      onClose();
    } else if (choice === "Not Interested" && onConnectNotInterested) {
      onConnectNotInterested(toPass);
      onClose();
    } else {
      onSuccess();
      onClose();
    }
  };

  const scheduleFollowupAt = (callbackTime: string) => {
    return fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        tags: "Incoming Off",
        category: "callback",
        callbackTime,
      }),
    });
  };

  const handleNo = async () => {
    setLoading(true);
    const started = whatsappFollowupStartedAt ? new Date(whatsappFollowupStartedAt) : new Date();
    const now = new Date();
    const daysPassed = (now.getTime() - started.getTime()) / (24 * 60 * 60 * 1000);

    if (daysPassed >= WHATSAPP_FOLLOWUP_MAX_DAYS) {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          tags: "Incoming Off",
          moveToAdminWithTag: true,
        }),
      });
      setLoading(false);
      if (res.ok) {
        onSuccess();
        onClose();
      }
      return;
    }

    const nextFollowup = new Date(now.getTime() + WHATSAPP_FOLLOWUP_HOURS * 60 * 60 * 1000);
    const res = await scheduleFollowupAt(nextFollowup.toISOString());
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
    }
  };

  const handleCustomSchedule = async () => {
    setCustomScheduleError(null);
    const callbackTime = localDateTimeToISO(customDate, customTime, utcOffsetMinutes);
    const callbackDate = new Date(callbackTime);
    if (callbackDate.getTime() <= Date.now()) {
      setCustomScheduleError("Pick a future date and time");
      return;
    }
    setLoading(true);
    const res = await scheduleFollowupAt(callbackTime);
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      setCustomScheduleError("Failed to schedule");
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
          {(selectedOption !== null || yesStep !== null) ? (
            <button
              type="button"
              onClick={() => {
                if (yesStep === "choice") setYesStep(null);
                else if (yesStep === "another_input") setYesStep("choice");
                else if (yesStep === "connected") {
                  setConnectedLead(null);
                  setYesStep("choice");
                } else if (selectedOption !== null) setSelectedOption(null);
                else onClose();
              }}
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
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">WhatsApp Followup</h2>
              <p className="truncate text-xs text-slate-300">{lead.name} • {normalizeNumberForDisplay(lead.number)}</p>
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

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <p className="mb-4 text-sm text-neutral-600">
            Open WhatsApp and check for reply. Did reply come?
          </p>

          <button
            type="button"
            onClick={() => openWhatsApp(getWaChatUrl(lead.number))}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-violet-500 bg-violet-50 px-4 py-3 font-medium text-violet-800"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Open WhatsApp
          </button>

          <div className="mb-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedOption((prev) => (prev === "yes" ? null : "yes"));
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                selectedOption === "yes"
                  ? "border-2 border-green-500 bg-green-100 text-green-800 ring-2 ring-green-500/30"
                  : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedOption((prev) => (prev === "no" ? null : "no"));
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                selectedOption === "no"
                  ? "border-2 border-red-500 bg-red-100 text-red-800 ring-2 ring-red-500/30"
                  : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
              }`}
            >
              No
            </button>
          </div>

          {selectedOption === "yes" && yesStep === null ? (
            <div className="mb-4 space-y-3 pt-2 border-t border-slate-200">
              <p className="text-sm font-medium text-slate-700">Same number pe continue kare ya another?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSameNumberContinue}
                  disabled={loading}
                  className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
                >
                  {loading ? "..." : "Same number"}
                </button>
                <button
                  type="button"
                  onClick={() => setYesStep("another_input")}
                  disabled={loading}
                  className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
                >
                  Another number
                </button>
              </div>
            </div>
          ) : null}
          {selectedOption === "yes" && yesStep === "another_input" ? (
            <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-medium text-slate-700">Enter the other number</p>
              {anotherNumberError && <p className="text-xs text-red-600">{anotherNumberError}</p>}
              <input
                type="tel"
                value={anotherNumber}
                onChange={(e) => {
                  setAnotherNumber(e.target.value);
                  setAnotherNumberError(null);
                }}
                placeholder="e.g. 9876543210"
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Use this number for</p>
                <select
                  value={numberUsage ?? ""}
                  onChange={(e) => setNumberUsage((e.target.value || null) as NumberUsage | null)}
                  className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="">Select...</option>
                  <option value="only_whatsapp">Only WhatsApp (replace existing)</option>
                  <option value="calling">Calling (existing stays WhatsApp)</option>
                  <option value="calling_and_whatsapp">Calling & WhatsApp both (replace)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setYesStep("choice")}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAnotherNumberSubmit}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save & continue"}
                </button>
              </div>
            </div>
          ) : null}
          {selectedOption === "yes" && yesStep === "connected" ? (
            <div className="mb-4 space-y-3 pt-2 border-t border-slate-200">
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
            </div>
          ) : null}
          {selectedOption === "no" ? (
            <>
              {daysPassed >= WHATSAPP_FOLLOWUP_MAX_DAYS ? (
                <button
                  onClick={handleNo}
                  disabled={loading}
                  className="mb-2 w-full rounded-lg bg-neutral-800 px-4 py-2.5 font-medium text-white hover:bg-neutral-900 disabled:opacity-50"
                >
                  {loading ? "Saving..." : noButtonText}
                </button>
              ) : showCustomSchedule ? (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <p className="text-sm font-medium text-slate-700">Custom followup date & time</p>
                  {customScheduleError && (
                    <p className="text-xs text-red-600">{customScheduleError}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        min={today}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Time</label>
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomSchedule(false)}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCustomSchedule}
                      disabled={loading}
                      className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Schedule"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-2 flex flex-col gap-2">
                  <button
                    onClick={handleNo}
                    disabled={loading}
                    className="w-full rounded-lg bg-neutral-800 px-4 py-2.5 font-medium text-white hover:bg-neutral-900 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : noButtonText}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomSchedule(true)}
                    className="w-full rounded-lg border-2 border-violet-500 bg-violet-50 px-4 py-2.5 font-medium text-violet-800 hover:bg-violet-100"
                  >
                    Custom schedule
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
