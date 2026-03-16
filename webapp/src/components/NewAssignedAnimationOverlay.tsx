"use client";

import { useEffect, useState } from "react";
import { BUCKET_LABELS } from "@/lib/constants";
import { ColorBadge } from "./ColorBadge";
import type { TagOption } from "@/types/lead";

const MOVE_DURATION_MS = 3000;

interface NewAssignedAnimationOverlayProps {
  lead: { id: string; name: string; number: string; tags: TagOption | "" };
  rowRect: DOMRect | null;
  onComplete: () => void;
}

export function NewAssignedAnimationOverlay({
  lead,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- rowRect kept for API; overlay uses fixed layout
  rowRect,
  onComplete,
}: NewAssignedAnimationOverlayProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimate(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(onComplete, MOVE_DURATION_MS);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
      aria-hidden
    >
      {/* Vertical layout: Lead box (top) | Arrows down | New Assigned bucket (bottom) - lead moves DOWN toward bucket */}
      <div className="flex flex-col items-center justify-center gap-6">
        {/* Lead info box - top, moves DOWN toward bucket */}
        <div
          className={`min-w-[200px] max-w-[280px] rounded-lg border-2 border-slate-300 bg-white px-4 py-3 shadow-lg ${animate ? "animate-new-assigned-lead-box-center" : ""}`}
        >
          <p className="font-medium text-neutral-900">{lead.name}</p>
          <p className="text-sm text-neutral-600">{lead.number}</p>
          {lead.tags && (
            <div className="mt-1">
              <ColorBadge tag={lead.tags} />
            </div>
          )}
        </div>

        {/* Arrows - point down */}
        <div className={`flex flex-col gap-1 text-slate-500 ${animate ? "animate-new-assigned-bucket-hide" : ""}`}>
          <span className="animate-new-assigned-arrow text-2xl font-bold">&darr;</span>
          <span className="animate-new-assigned-arrow text-2xl font-bold" style={{ animationDelay: "0.2s" }}>&darr;</span>
          <span className="animate-new-assigned-arrow text-2xl font-bold" style={{ animationDelay: "0.4s" }}>&darr;</span>
        </div>

        {/* New Assigned bucket - bottom */}
        <div
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-slate-400 bg-slate-50 px-6 py-4 shadow-xl ${animate ? "animate-new-assigned-bucket-hide" : ""}`}
        >
          <span className="text-lg font-bold text-slate-800">{BUCKET_LABELS.newAssigned}</span>
          <svg
            className="h-10 w-10 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
