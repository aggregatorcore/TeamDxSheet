"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/types/lead";

export interface OverdueCallModalProps {
  lead: Lead;
  onClose: () => void;
  /** When user clicks Dial – open call flow (e.g. CallDialModal) and close this modal */
  onDial: (lead: Lead) => void;
}

export function OverdueCallModal({ lead, onClose, onDial }: OverdueCallModalProps) {
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
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">Overdue – Call now immediately</h2>
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

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <p className="text-sm font-medium text-neutral-700">This lead is overdue. Call them now.</p>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2 text-sm">
            <p><span className="font-medium text-neutral-500">Name:</span> {lead.name || "—"}</p>
            <p><span className="font-medium text-neutral-500">Place:</span> {lead.place || "—"}</p>
            <p><span className="font-medium text-neutral-500">ID:</span> {lead.id.slice(0, 8)}</p>
            <p><span className="font-medium text-neutral-500">Number (to dial):</span> {lead.number || "—"}</p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            {isMobileOrTelCapable && dialNumber ? (
              <a
                href={`tel:${dialNumber}`}
                onClick={() => {
                  onDial(lead);
                  onClose();
                }}
                className="flex-1 flex min-w-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Dial
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onDial(lead);
                  onClose();
                }}
                className="flex-1 flex min-w-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Dial (use your phone)
              </button>
            )}
            {!isMobileOrTelCapable && (
              <button
                type="button"
                onClick={copyNumber}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Copy number
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
