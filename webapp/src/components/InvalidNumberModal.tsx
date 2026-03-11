"use client";

import { useEffect, useState } from "react";

interface InvalidNumberModalProps {
  leadName: string;
  leadNumber: string;
  id: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function InvalidNumberModal({
  leadName,
  leadNumber,
  onClose,
  onConfirm,
}: InvalidNumberModalProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, loading]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
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
        <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Mark as Invalid Number</h2>
              <p className="text-xs text-slate-300">Ye lead Admin ke paas move ho jayegi</p>
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
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
            <p className="font-medium text-slate-900 text-sm">{leadName}</p>
            <p className="text-xs text-slate-600 font-mono">{leadNumber}</p>
          </div>

          <p className="text-sm text-slate-600">
            Marking as invalid will remove this lead from your list and move it to Admin view for review.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 rounded-lg bg-slate-700 px-4 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Moving..." : "Mark Invalid"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
