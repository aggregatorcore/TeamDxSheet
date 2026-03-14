"use client";

import { useState, useEffect, useRef } from "react";
import { GRACE_PERIOD_HOURS } from "@/lib/constants";

/** Display strings for countdown states. When overdue, hook returns "-Xm Ys" (negative countdown) instead of "Overdue". */
export const COUNTDOWN_CALL_NOW = "Call Now";
export const COUNTDOWN_OVERDUE = "Overdue";

/** True when countdown string indicates overdue (legacy "Overdue" or "-Xm Ys"). */
export function isOverdueCountdown(s: string): boolean {
  return s === COUNTDOWN_OVERDUE || s.startsWith("-");
}

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

/** Normalize callback time string to timestamp for stable dependency. */
function toCallbackTimestamp(callbackTime: string | null): number | null {
  if (!callbackTime || typeof callbackTime !== "string" || callbackTime.trim() === "") return null;
  const ms = new Date(callbackTime.trim()).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Cache last countdown per callbackTs so remount (e.g. after closing modal) shows same value instead of jumping. */
const countdownCache = new Map<number, { value: string; at: number }>();
const CACHE_TTL_MS = 20_000;

/**
 * Returns countdown string for callback time. Updates every second.
 * Uses cache so when component remounts (e.g. modal close) we restore last value and avoid jump.
 */
export function useCountdown(callbackTime: string | null): string {
  const callbackTs = toCallbackTimestamp(callbackTime);
  const cached = callbackTs != null ? countdownCache.get(callbackTs) : null;
  const initial =
    cached && Date.now() - cached.at < CACHE_TTL_MS ? cached.value : "";
  const [countdown, setCountdown] = useState(initial);
  const callbackTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (callbackTs == null) {
      setCountdown("");
      return;
    }

    callbackTsRef.current = callbackTs;

    const update = () => {
      const cbMs = callbackTsRef.current;
      if (cbMs == null) return;

      const now = Date.now();
      const graceEnd = cbMs + GRACE_PERIOD_HOURS * 60 * 60 * 1000;

      let next: string;
      if (now < cbMs) {
        const totalSec = Math.max(0, Math.floor((cbMs - now) / 1000));
        next = formatCountdownRemaining(totalSec);
      } else if (now <= graceEnd) {
        next = COUNTDOWN_CALL_NOW;
      } else {
        const overdueSec = Math.floor((now - graceEnd) / 1000);
        next = "-" + formatCountdownRemaining(overdueSec);
      }
      countdownCache.set(callbackTs, { value: next, at: now });
      setCountdown(next);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [callbackTs]);

  return countdown;
}
