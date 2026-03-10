"use client";

import { useToastContext } from "@/components/ToastProvider";

export function useToast() {
  const { showToast } = useToastContext();
  return { showToast };
}

