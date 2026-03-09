"use client";

import { useEffect, useRef } from "react";
import type { Lead } from "@/types/lead";

const POLL_INTERVAL_MS = 60 * 1000;
const GRACE_MS = 2 * 60 * 60 * 1000;

export function useCallbackReminder(leads: Lead[]) {
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkCallbacks = () => {
      const now = new Date();
      for (const lead of leads) {
        if (lead.category !== "callback" || !lead.callbackTime) continue;
        const cb = new Date(lead.callbackTime);
        const key = `${lead.id}-${lead.rowIndex}`;
        if (cb <= now && !alertedRef.current.has(key)) {
          alertedRef.current.add(key);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Call karo!", {
              body: `${lead.name} - ${lead.number}`,
            });
          }
        }
      }
    };

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    checkCallbacks();
    const id = setInterval(checkCallbacks, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [leads]);
}

export function useOverdueCheck(leads: Lead[]) {
  useEffect(() => {
    const checkOverdue = async () => {
      const hasCallback = leads.some(
        (l) => l.category === "callback" && l.callbackTime
      );
      if (!hasCallback) return;
      await fetch("/api/overdue", { method: "POST" });
    };

    checkOverdue();
    const id = setInterval(checkOverdue, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [leads]);
}
