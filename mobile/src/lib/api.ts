import type { Session } from "@supabase/supabase-js";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export function getApiUrl(): string {
  return API_URL.replace(/\/$/, "");
}

export function hasApiConfig(): boolean {
  return Boolean(API_URL);
}

export async function fetchWithAuth(
  session: Session | null,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const base = getApiUrl();
  if (!base) {
    return new Response(
      JSON.stringify({ error: "EXPO_PUBLIC_API_URL not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(typeof options.headers === "object" && !(options.headers instanceof Headers)
      ? Object.fromEntries(
          Object.entries(options.headers).map(([k, v]) => [k, String(v)])
        )
      : {}),
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return fetch(url, { ...options, headers: { ...options.headers, ...headers } });
}
