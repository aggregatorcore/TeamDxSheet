"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-end px-4 py-6 sm:p-6">
        <div className="flex w-full flex-col items-end space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex min-w-[260px] max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : toast.type === "error"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : toast.type === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-neutral-200 bg-white text-neutral-900"
              }`}
            >
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-current" />
              <div className="flex-1 text-sm">
                {toast.title && (
                  <p className="font-semibold">
                    {toast.title}
                  </p>
                )}
                <p className={toast.title ? "mt-0.5" : ""}>{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="ml-2 rounded p-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return ctx;
}

