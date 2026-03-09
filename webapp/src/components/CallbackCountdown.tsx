"use client";

import { useCountdown } from "@/hooks/useCountdown";

interface CallbackCountdownProps {
  callbackTime: string;
  isBlinking?: boolean;
}

export function CallbackCountdown({ callbackTime, isBlinking }: CallbackCountdownProps) {
  const countdown = useCountdown(callbackTime);

  const isCallNow = countdown === "Call Now";
  const isOverdue = countdown === "Overdue";
  const isCounting = !isCallNow && !isOverdue && countdown;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-nowrap items-center gap-1">
        {isCounting && (
          <span className="shrink-0 rounded border border-amber-600 bg-amber-700 px-1.5 py-0.5 text-[10px] font-medium text-white">
            Callback
          </span>
        )}
        <span
          className={`min-w-[3rem] font-mono text-xs font-medium ${
            isBlinking ? "text-amber-800" : isCallNow ? "text-amber-700" : isOverdue ? "text-red-700" : "text-neutral-700"
          }`}
        >
          {countdown || "..."}
        </span>
      </div>
      <span className="text-[10px] text-neutral-500">
        {new Date(callbackTime).toLocaleString()}
      </span>
    </div>
  );
}
