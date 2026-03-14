"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/types/lead";
import { getManualNote, buildNoteWithManual } from "@/lib/leadNote";

interface NoteEditModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: (updates: Partial<Lead>) => void;
}

export function NoteEditModal({ lead, onClose, onSuccess }: NoteEditModalProps) {
  const [manualNote, setManualNote] = useState(() => getManualNote(lead.note));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** When true: textarea disabled, Show Edit button. Only Edit click opens textarea. */
  const [isViewingSaved, setIsViewingSaved] = useState(() => !!getManualNote(lead.note)?.trim());

  useEffect(() => {
    const manual = getManualNote(lead.note);
    setManualNote(manual);
    setIsViewingSaved(!!manual?.trim());
  }, [lead.id, lead.note]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    setError(null);
    setLoading(true);
    try {
      const newNote = buildNoteWithManual(lead.note, manualNote);
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, note: newNote }),
      });
      if (res.ok) {
        onSuccess({ note: newNote });
        setIsViewingSaved(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to save");
      }
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !isViewingSaved;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 bg-slate-800 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">Note</h2>
            <p className="text-xs text-slate-300 mt-0.5">{lead.name} · {lead.place}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="p-4 space-y-3">
          <label className="block text-xs font-medium text-slate-700">
            Note
          </label>
          <textarea
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            disabled={!isEditing}
            className="w-full min-h-[120px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
            placeholder="Type your note here…"
            autoFocus={isEditing}
          />
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            {isEditing ? (
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save"}
              </button>
            ) : null}
          </div>
        </form>
        {!isEditing && (
          <div className="px-4 pb-4 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsViewingSaved(false);
              }}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
