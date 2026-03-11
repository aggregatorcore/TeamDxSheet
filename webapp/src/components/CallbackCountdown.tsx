"use client";

import type { ReactNode } from "react";
import { useCountdown, COUNTDOWN_CALL_NOW, COUNTDOWN_OVERDUE } from "@/hooks/useCountdown";

interface CallbackCountdownProps {
  callbackTime: string;
  isBlinking?: boolean;
  /** When countdown is "Call Now", render this instead of the text */
  renderCallNow?: ReactNode;
  /** Badge label when counting (default "Callback"). Use "Followup" for Interested flow. */
  badgeLabel?: string;
  /** When true, do not render the date row (parent will show it below both badge/button and countdown) */
  hideDate?: boolean;
}

function formatCallbackTimeLabel(callbackTime: string): string {
  const ms = new Date(callbackTime.trim()).getTime();
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString();
}

export function CallbackCountdown({ callbackTime, isBlinking, renderCallNow, badgeLabel = "Callback", hideDate }: CallbackCountdownProps) {
  const countdown = useCountdown(callbackTime);

  const isCallNow = countdown === COUNTDOWN_CALL_NOW;
  const isOverdue = countdown === COUNTDOWN_OVERDUE;
  const isCounting = !isCallNow && !isOverdue && countdown.length > 0;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-nowrap items-center gap-1">
        {isCounting && badgeLabel ? (
          <span className="shrink-0 rounded border border-amber-600 bg-amber-700 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {badgeLabel}
          </span>
        ) : null}
        {isCallNow && renderCallNow != null ? (
          renderCallNow
        ) : isOverdue ? (
          <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            Overdue
          </span>
        ) : (
          <span
            className={`min-w-[3rem] font-mono text-xs font-medium ${
              isBlinking ? "text-amber-800" : isCallNow ? "text-amber-700" : "text-neutral-700"
            }`}
          >
            {countdown || "—"}
          </span>
        )}
      </div>
      {!hideDate && (
        <span className="text-[10px] text-neutral-500">
          {formatCallbackTimeLabel(callbackTime)}
        </span>
      )}
    </div>
  );
}
