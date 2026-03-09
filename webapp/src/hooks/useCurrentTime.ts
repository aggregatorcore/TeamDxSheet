"use client";

import { useState, useEffect } from "react";

/** Updates every second - use to force re-render for time-based logic (blink, countdown) */
export function useCurrentTime(active = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return now;
}
