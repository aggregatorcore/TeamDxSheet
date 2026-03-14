"use client";

import { useState, useEffect } from "react";
import { getDisplayId } from "@/lib/displayId";
import { ACTION_LABELS } from "@/lib/constants";
import type { Lead } from "@/types/lead";

export interface OverdueCallModalProps {
  lead: Lead;
  onClose: () => void;
  /** When provided, Back goes to previous modal (one step). When not provided, back button is hidden. */
  onBack?: () => void;
  /** When user clicks Dial – open call flow (e.g. CallDialModal) and close this modal */
  onDial: (lead: Lead) => void;
}

export function OverdueCallModal({ lead, onClose, onBack, onDial }: OverdueCallModalProps) {
  const [isMobileOrTelCapable, setIsMobileOrTelCapable] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 768px)");
    const check = () => setIsMobileOrTelCapable(m.matches || navigator.maxTouchPoints > 0);
    check();
    m.addEventListener("change", check);
    return () => m.removeEventListener("change", check);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const dialNumber = lead.number?.replace(/\s*\([^)]*\)/g, "").trim() || "";
  const copyNumber = () => {
    const num = lead.number?.split(",")[0]?.trim() || "";
    if (num) {
      navigator.clipboard.writeText(num);
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
        <div className="relative flex items-center gap-2 bg-gradient-to-br from-red-700 to-red-800 px-4 py-3">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">{ACTION_LABELS.overdue} – Call now immediately</h2>
              <p className="truncate text-xs text-red-200">{lead.name} • {lead.number?.split(",")[0]?.trim() ?? "—"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 bg-red-600 text-white hover:bg-red-500 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm font-medium text-neutral-700">This lead is overdue. Call them now.</p>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 space-y-2 text-sm">
            <p><span className="font-medium text-neutral-500">Name:</span> {lead.name || "—"}</p>
            <p><span className="font-medium text-neutral-500">Place:</span> {lead.place || "—"}</p>
            <p><span className="font-medium text-neutral-500">ID:</span> {getDisplayId(lead.id)}</p>
            <p><span className="font-medium text-neutral-500">Number (to dial):</span> {lead.number || "—"}</p>
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Actions</p>
            {isMobileOrTelCapable && dialNumber ? (
              <a
                href={`tel:${dialNumber}`}
                onClick={() => {
                  onDial(lead);
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Dial now
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onDial(lead);
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Open call flow (use your phone to dial)
              </button>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyNumber}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy number
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
