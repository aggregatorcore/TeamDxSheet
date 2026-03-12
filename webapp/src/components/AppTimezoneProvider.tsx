"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ensureTimezone,
  getTimezoneSync,
  type TimezoneInfo,
} from "@/lib/timezone";

type AppTimezoneContextValue = {
  timezone: string | null;
  utcOffsetMinutes: number | null;
  isReady: boolean;
  refetch: () => Promise<void>;
};

const AppTimezoneContext = createContext<AppTimezoneContextValue>({
  timezone: null,
  utcOffsetMinutes: null,
  isReady: false,
  refetch: async () => {},
});

export function useAppTimezone(): AppTimezoneContextValue {
  const ctx = useContext(AppTimezoneContext);
  if (!ctx) throw new Error("useAppTimezone must be used within AppTimezoneProvider");
  return ctx;
}

export function AppTimezoneProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<TimezoneInfo | null>(() => getTimezoneSync());
  const [isReady, setIsReady] = useState(false);

  const load = useCallback(async () => {
    const result = await ensureTimezone();
    setInfo(result);
    setIsReady(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refetch = useCallback(async () => {
    const { fetchTimezoneFromInternet } = await import("@/lib/timezone");
    const result = await fetchTimezoneFromInternet();
    setInfo(result);
  }, []);

  return (
    <AppTimezoneContext.Provider
      value={{
        timezone: info?.timezone ?? null,
        utcOffsetMinutes: info?.utcOffsetMinutes ?? null,
        isReady,
        refetch,
      }}
    >
      {children}
    </AppTimezoneContext.Provider>
  );
}
