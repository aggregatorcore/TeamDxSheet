import React, { createContext, useCallback, useContext, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View pointerEvents="box-none" style={styles.container}>
        {toasts.map((toast) => (
          <View
            key={toast.id}
            style={[
              styles.toast,
              toast.type === "success" && styles.success,
              toast.type === "error" && styles.error,
              toast.type === "info" && styles.info,
            ]}
          >
            <Text style={styles.text}>{toast.message}</Text>
            <TouchableOpacity onPress={() => remove(toast.id)}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 8,
    backgroundColor: "#111827",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    marginRight: 8,
  },
  close: {
    color: "#E5E7EB",
    fontSize: 12,
  },
  success: {
    backgroundColor: "#16A34A",
  },
  error: {
    backgroundColor: "#DC2626",
  },
  info: {
    backgroundColor: "#2563EB",
  },
});

