"use client";

import { useEffect, useState } from "react";
import { ColorBadge } from "./ColorBadge";
import type { TagOption } from "@/types/lead";

const MOVE_DURATION_MS = 3000;

interface ExhaustAnimationOverlayProps {
  lead: { id: string; name: string; number: string; tags: TagOption | "" };
  rowRect: DOMRect | null;
  onComplete: () => void;
}

export function ExhaustAnimationOverlay({
  lead,
  rowRect,
  onComplete,
}: ExhaustAnimationOverlayProps) {
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

  if (!rowRect) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
      aria-hidden
    >
      {/* Center layout: Lead box | Arrows | Exhaust bucket - all fixed in screen center */}
      <div className="flex items-center justify-center gap-8">
        {/* Lead info box - left of center, moves toward exhaust */}
        <div
          className={`min-w-[200px] max-w-[280px] rounded-lg border-2 border-red-300 bg-white px-4 py-3 shadow-lg ${animate ? "animate-exhaust-lead-box-center" : ""}`}
        >
          <p className="font-medium text-neutral-900">{lead.name}</p>
          <p className="text-sm text-neutral-600">{lead.number}</p>
          {lead.tags && (
            <div className="mt-1">
              <ColorBadge tag={lead.tags} />
            </div>
          )}
        </div>

        {/* Animated arrows - between lead and exhaust */}
        <div className={`flex items-center gap-1 text-red-500 ${animate ? "animate-exhaust-bucket-hide" : ""}`}>
          <span className="animate-exhaust-arrow text-2xl font-bold">&rarr;</span>
          <span className="animate-exhaust-arrow text-2xl font-bold" style={{ animationDelay: "0.2s" }}>&rarr;</span>
          <span className="animate-exhaust-arrow text-2xl font-bold" style={{ animationDelay: "0.4s" }}>&rarr;</span>
        </div>

        {/* Exhaust bucket - right of center, hides when lead enters */}
        <div className={`flex flex-col items-center gap-2 rounded-xl border-2 border-red-400 bg-red-50 px-6 py-4 shadow-xl ${animate ? "animate-exhaust-bucket-hide" : ""}`}>
          <span className="text-lg font-bold text-red-800">Exhaust</span>
          <svg
            className="h-10 w-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
