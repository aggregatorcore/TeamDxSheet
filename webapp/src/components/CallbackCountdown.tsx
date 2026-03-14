"use client";

import type { ReactNode } from "react";
import { useCountdown, COUNTDOWN_CALL_NOW, isOverdueCountdown } from "@/hooks/useCountdown";
import { ACTION_LABELS } from "@/lib/constants";
import { formatCallbackDateShort } from "@/lib/dateUtils";

interface CallbackCountdownProps {
  callbackTime: string;
  isBlinking?: boolean;
  /** When countdown is "Call Now", render this instead of the text */
  renderCallNow?: ReactNode;
  /** Badge label when counting (default from ACTION_LABELS.callback). Use ACTION_LABELS.followup for Interested flow. */
  badgeLabel?: string;
  /** Badge color when counting: default = amber (callback), violet = WhatsApp followup (matches renderCallNow button). */
  badgeVariant?: "default" | "violet";
  /** When true, do not render the date row (parent will show it below both badge/button and countdown) */
  hideDate?: boolean;
  /** When true, render badge + countdown + date in one horizontal row (for table cells). */
  inline?: boolean;
}

export function CallbackCountdown({ callbackTime, isBlinking, renderCallNow, badgeLabel = ACTION_LABELS.callback, badgeVariant = "default", hideDate, inline }: CallbackCountdownProps) {
  const countdown = useCountdown(callbackTime);

  const isCallNow = countdown === COUNTDOWN_CALL_NOW;
  const isOverdue = isOverdueCountdown(countdown);
  const isCounting = !isCallNow && !isOverdue && countdown.length > 0;

  const badgeClass =
    badgeVariant === "violet"
      ? "shrink-0 rounded border border-violet-600 bg-violet-600 px-1.5 py-0.5 text-[10px] font-medium text-white"
      : "shrink-0 rounded border border-amber-600 bg-amber-700 px-1.5 py-0.5 text-[10px] font-medium text-white";

  const overdueBlock = isOverdue && inline && !hideDate && (
    <div className="inline-flex min-w-0 max-w-full flex-nowrap items-center gap-2 rounded-md px-2 py-1">
      <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
        Overdue
      </span>
      <span className="min-w-[3.5rem] shrink-0 tabular-nums font-mono text-xs font-semibold text-red-700">
        {countdown}
      </span>
      <span className="flex min-w-0 shrink items-center gap-1 text-[10px] font-medium text-red-800" title={formatCallbackDateShort(callbackTime)}>
        <svg className="h-3 w-3 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="min-w-0 shrink truncate">{formatCallbackDateShort(callbackTime)}</span>
      </span>
    </div>
  );

  const content = (
    <>
      <div className="flex flex-nowrap items-center gap-1">
        {isCounting && badgeLabel ? (
          <span className={badgeClass}>
            {badgeLabel}
          </span>
        ) : null}
        {isCallNow && renderCallNow != null ? (
          renderCallNow
        ) : isOverdue ? (
          inline && !hideDate ? null : (
            <>
              <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                Overdue
              </span>
              <span className="min-w-[3.5rem] shrink-0 tabular-nums font-mono text-xs font-semibold text-red-700">
                {countdown}
              </span>
            </>
          )
        ) : (
          <span
            className={`min-w-[3.5rem] tabular-nums font-mono text-xs font-semibold ${
              isBlinking ? "text-amber-800" : isCallNow ? "text-amber-700" : "text-slate-800"
            }`}
          >
            {countdown || "—"}
          </span>
        )}
      </div>
      {!hideDate && !(inline && isOverdue) && (
        <span className="min-w-0 shrink text-[11px] font-medium text-slate-600 truncate" title={formatCallbackDateShort(callbackTime)}>
          {formatCallbackDateShort(callbackTime)}
        </span>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="flex min-w-0 flex-nowrap items-center gap-2">
        {overdueBlock || content}
      </div>
    );
  }
  return <div className="flex flex-col gap-0">{content}</div>;
}
