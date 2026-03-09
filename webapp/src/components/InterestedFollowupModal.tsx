"use client";

import { useState, useEffect } from "react";
import { openWhatsApp, getWaChatUrl } from "@/lib/whatsapp";
import { WHATSAPP_FOLLOWUP_HOURS } from "@/lib/constants";
import type { Lead } from "@/types/lead";

interface InterestedFollowupModalProps {
  lead: Lead;
  action?: string;
  onClose: () => void;
  onSuccess: () => void;
  onDocumentReceived?: (lead: Lead) => void;
}

export function InterestedFollowupModal({
  lead,
  action,
  onClose,
  onSuccess,
  onDocumentReceived,
}: InterestedFollowupModalProps) {
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    openWhatsApp(getWaChatUrl(lead.number));
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

  const handleNo = async () => {
    setScheduling(true);
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
    setScheduling(false);
    if (res.ok) {
      onSuccess();
      onClose();
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Document Followup</h2>
              <p className="text-xs text-slate-300">{lead.name} • {lead.number}</p>
              {action ? <p className="text-xs text-slate-400 mt-0.5">{action}</p> : null}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="mb-4 text-sm text-neutral-600">
              Opening WhatsApp & scheduling followup...
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-neutral-600">
                Documents receive ho gaye?
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
                  onClick={handleNo}
                  disabled={scheduling}
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  {scheduling ? "..." : "No"}
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                No: 1 hr followup schedule ho jayega. Yes: lead Green Bucket mein jayegi.
              </p>
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
