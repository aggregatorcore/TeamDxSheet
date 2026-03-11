"use client";

import { useEffect, useState } from "react";
import { ColorBadge } from "./ColorBadge";
import type { TagOption } from "@/types/lead";

const MOVE_DURATION_MS = 3000;

interface GreenBucketAnimationOverlayProps {
  lead: { id: string; name: string; number: string; tags: TagOption | "" };
  rowRect: DOMRect | null;
  onComplete: () => void;
}

export function GreenBucketAnimationOverlay({
  lead,
  rowRect,
  onComplete,
}: GreenBucketAnimationOverlayProps) {
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
      {/* Vertical layout: Green bucket (top) | Arrows | Lead box (bottom) - lead moves UP toward bucket */}
      <div className="flex flex-col items-center justify-center gap-6">
        {/* Green bucket - top */}
        <div
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-emerald-400 bg-emerald-50 px-6 py-4 shadow-xl ${animate ? "animate-green-bucket-hide" : ""}`}
        >
          <span className="text-lg font-bold text-emerald-800">Green Bucket</span>
          <svg
            className="h-10 w-10 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Arrows - point up */}
        <div className={`flex flex-col gap-1 text-emerald-500 ${animate ? "animate-green-bucket-hide" : ""}`}>
          <span className="animate-green-arrow text-2xl font-bold">&uarr;</span>
          <span className="animate-green-arrow text-2xl font-bold" style={{ animationDelay: "0.2s" }}>&uarr;</span>
          <span className="animate-green-arrow text-2xl font-bold" style={{ animationDelay: "0.4s" }}>&uarr;</span>
        </div>

        {/* Lead info box - bottom, moves UP toward bucket */}
        <div
          className={`min-w-[200px] max-w-[280px] rounded-lg border-2 border-emerald-300 bg-white px-4 py-3 shadow-lg ${animate ? "animate-green-lead-box-center" : ""}`}
        >
          <p className="font-medium text-neutral-900">{lead.name}</p>
          <p className="text-sm text-neutral-600">{lead.number}</p>
          {lead.tags && (
            <div className="mt-1">
              <ColorBadge tag={lead.tags} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
