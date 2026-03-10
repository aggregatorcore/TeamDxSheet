"use client";

import { useEffect, useRef } from "react";
import type { Lead } from "@/types/lead";
import { useToast } from "@/hooks/useToast";

const POLL_INTERVAL_MS = 60 * 1000;

export function useCallbackReminder(leads: Lead[]) {
  const alertedRef = useRef<Set<string>>(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    const checkCallbacks = () => {
      const now = new Date();
      for (const lead of leads) {
        if (lead.category !== "callback" || !lead.callbackTime) continue;
        const cb = new Date(lead.callbackTime);
        const key = `${lead.id}-${lead.rowIndex}`;
        if (cb <= now && !alertedRef.current.has(key)) {
          alertedRef.current.add(key);
          showToast({
            type: "info",
            title: "Callback due",
            message: `${lead.name || "Lead"} – ${lead.number}`,
          });
        }
      }
    };

    checkCallbacks();
    const id = setInterval(checkCallbacks, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [leads, showToast]);
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

