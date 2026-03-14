"use client";

import { useEffect } from "react";
import { BUCKET_LABELS } from "@/lib/constants";
import { NotInterestedFormContent, type NotInterestedResult } from "./NotInterestedFormContent";

export type { NotInterestedResult } from "./NotInterestedFormContent";

interface NotInterestedModalProps {
  leadName: string;
  leadNumber: string;
  id: string;
  onClose: () => void;
  onBack?: () => void;
  onConfirm: (result: NotInterestedResult) => Promise<void>;
}

export function NotInterestedModal({
  onClose,
  onBack,
  onConfirm,
}: NotInterestedModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleConfirm = async (result: NotInterestedResult) => {
    await onConfirm(result);
    onClose();
  };

  const handleBack = () => (onBack ? onBack() : onClose());

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Not Interested</h2>
              <p className="text-xs text-slate-300">Lead will move to {BUCKET_LABELS.review}</p>
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
        <div className="p-4">
          <NotInterestedFormContent
            onConfirm={handleConfirm}
            onBack={onBack}
          />
        </div>
      </div>
    </div>
  );
}
