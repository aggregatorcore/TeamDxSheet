"use client";

import { useEffect, useState } from "react";
import { BUCKET_LABELS } from "@/lib/constants";
import { ColorBadge } from "./ColorBadge";
import type { TagOption } from "@/types/lead";

const MOVE_DURATION_MS = 3000;

interface ReviewAnimationOverlayProps {
  lead: { id: string; name: string; number: string; tags: TagOption | "" };
  rowRect: DOMRect | null;
  onComplete: () => void;
}

export function ReviewAnimationOverlay({
  lead,
  rowRect,
  onComplete,
}: ReviewAnimationOverlayProps) {
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
      {/* Center layout: Review bucket (left) | Arrows | Lead box (right) - lead moves LEFT toward Review */}
      <div className="flex items-center justify-center gap-8">
        {/* Review bucket - left of center, amber/blue theme */}
        <div
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-6 py-4 shadow-xl ${animate ? "animate-review-bucket-hide" : ""}`}
        >
          <span className="text-lg font-bold text-amber-800">{BUCKET_LABELS.review}</span>
          <svg
            className="h-10 w-10 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>

        {/* Animated arrows - point left (lead moves toward Review) */}
        <div className={`flex items-center gap-1 text-amber-500 ${animate ? "animate-review-bucket-hide" : ""}`}>
          <span className="animate-review-arrow text-2xl font-bold">&larr;</span>
          <span className="animate-review-arrow text-2xl font-bold" style={{ animationDelay: "0.2s" }}>&larr;</span>
          <span className="animate-review-arrow text-2xl font-bold" style={{ animationDelay: "0.4s" }}>&larr;</span>
        </div>

        {/* Lead info box - right of center, moves LEFT toward Review */}
        <div
          className={`min-w-[200px] max-w-[280px] rounded-lg border-2 border-amber-300 bg-white px-4 py-3 shadow-lg ${animate ? "animate-review-lead-box-center" : ""}`}
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
