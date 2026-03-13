"use client";

import { useState, useEffect } from "react";
import { openWhatsApp, getWaChatUrl } from "@/lib/whatsapp";
import { WHATSAPP_FOLLOWUP_HOURS, WHATSAPP_FOLLOWUP_MAX_DAYS } from "@/lib/constants";

interface WhatsAppFollowupModalProps {
  leadName: string;
  number: string;
  id: string;
  whatsappFollowupStartedAt?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function WhatsAppFollowupModal({
  leadName,
  number,
  id,
  whatsappFollowupStartedAt,
  onClose,
  onSuccess,
}: WhatsAppFollowupModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"yes" | "no" | null>(null);

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

  const handleYes = async () => {
    setLoading(true);
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, flow: "Connected", tags: "", category: "active" }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
    }
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
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        tags: "Incoming Off",
        category: "callback",
        callbackTime: nextFollowup.toISOString(),
      }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
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
              <h2 className="text-base font-semibold text-white">WhatsApp Followup</h2>
              <p className="truncate text-xs text-slate-300">{leadName} • {number}</p>
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
          <p className="mb-4 text-sm text-neutral-600">
            Open WhatsApp and check for reply. Did reply come?
          </p>

          <button
            type="button"
            onClick={() => openWhatsApp(getWaChatUrl(number))}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-violet-500 bg-violet-50 px-4 py-3 font-medium text-violet-800"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Open WhatsApp
          </button>

          <div className="mb-4 flex gap-3">
            <button
              type="button"
              onClick={() => setSelectedOption(selectedOption === "yes" ? null : "yes")}
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
              onClick={() => setSelectedOption(selectedOption === "no" ? null : "no")}
              className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                selectedOption === "no"
                  ? "border-2 border-red-500 bg-red-100 text-red-800 ring-2 ring-red-500/30"
                  : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
              }`}
            >
              No
            </button>
          </div>

          {selectedOption === "yes" ? (
            <button
              onClick={handleYes}
              disabled={loading}
              className="mb-2 w-full rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Confirm - Mark Connected"}
            </button>
          ) : null}
          {selectedOption === "no" ? (
            <button
              onClick={handleNo}
              disabled={loading}
              className="mb-2 w-full rounded-lg bg-neutral-800 px-4 py-2.5 font-medium text-white hover:bg-neutral-900 disabled:opacity-50"
            >
              {loading ? "Saving..." : noButtonText}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
