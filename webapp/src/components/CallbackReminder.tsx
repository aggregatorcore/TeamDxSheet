"use client";

import { useCallbackReminder, useOverdueCheck } from "@/hooks/useCallbackReminder";
import type { Lead } from "@/types/lead";

interface CallbackReminderProps {
  leads: Lead[];
}

export function CallbackReminder({ leads }: CallbackReminderProps) {
  useCallbackReminder(leads);
  useOverdueCheck(leads);
  return null;
}
