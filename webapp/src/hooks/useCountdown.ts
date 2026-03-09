"use client";

import { useState, useEffect } from "react";
import { GRACE_PERIOD_HOURS } from "@/lib/constants";

/**
 * Returns countdown string for callback time. Updates every second.
 * Before callback: "2m 30s" or "0:30"
 * At/after callback (within grace): "Call Now"
 * After grace: "Overdue"
 */
export function useCountdown(callbackTime: string | null): string {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!callbackTime) {
      setCountdown("");
      return;
    }

    const update = () => {
      const cb = new Date(callbackTime).getTime();
      const now = Date.now();
      const graceEnd = cb + GRACE_PERIOD_HOURS * 60 * 60 * 1000;

      if (now < cb) {
        const sec = Math.floor((cb - now) / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        setCountdown(m > 0 ? `${m}m ${s}s` : `${s}s`);
      } else if (now <= graceEnd) {
        setCountdown("Call Now");
      } else {
        setCountdown("Overdue");
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [callbackTime]);

  return countdown;
}
