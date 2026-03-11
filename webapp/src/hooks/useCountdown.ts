"use client";

import { useState, useEffect } from "react";
import { GRACE_PERIOD_HOURS } from "@/lib/constants";

/** Display strings for countdown states */
export const COUNTDOWN_CALL_NOW = "Call Now";
export const COUNTDOWN_OVERDUE = "Overdue";

/**
 * Formats remaining seconds into a human-readable countdown.
 * - >= 1 hour: "Xh Ym Zs" (e.g. 2h 0m 0s, 1h 59m 45s)
 * - >= 1 min: "Xm Ys"
 * - < 1 min: "Xs"
 */
export function formatCountdownRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return COUNTDOWN_CALL_NOW;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Returns countdown string for callback time. Updates every second.
 * - Invalid or missing time: ""
 * - Before callback: "2h 0m 0s", "1h 59m 30s", "45m 12s", "30s"
 * - At/after callback (within grace): "Call Now"
 * - After grace: "Overdue"
 */
export function useCountdown(callbackTime: string | null): string {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!callbackTime || typeof callbackTime !== "string" || callbackTime.trim() === "") {
      setCountdown("");
      return;
    }

    const update = () => {
      const cbMs = new Date(callbackTime.trim()).getTime();
      if (!Number.isFinite(cbMs)) {
        setCountdown("");
        return;
      }

      const now = Date.now();
      const graceEnd = cbMs + GRACE_PERIOD_HOURS * 60 * 60 * 1000;

      if (now < cbMs) {
        const totalSec = Math.max(0, Math.floor((cbMs - now) / 1000));
        setCountdown(formatCountdownRemaining(totalSec));
      } else if (now <= graceEnd) {
        setCountdown(COUNTDOWN_CALL_NOW);
      } else {
        setCountdown(COUNTDOWN_OVERDUE);
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [callbackTime]);

  return countdown;
}
