"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";

interface DashboardShellProps {
  children: React.ReactNode;
  isAdmin: boolean;
}

export function DashboardShell({ children, isAdmin }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view =
    pathname === "/dashboard/create-user"
      ? "create-user"
      : pathname === "/dashboard/leads"
        ? "leads-mgmt"
        : searchParams.get("view") || "leads";
  const isBucketsView = view === "green" || view === "exhaust" || view === "review";

  const handleLogout = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const navClass = (v: string) =>
    v === view
      ? "bg-neutral-900 text-white shadow-sm"
      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <header className="shrink-0 border-b border-neutral-200/80 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-neutral-900">TeamDX Lead Manager</h1>
            </Link>
            <nav className="flex rounded-lg border border-neutral-200 bg-white p-0.5">
              {isAdmin && (
                <Link
                  href="/dashboard/leads"
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${navClass("leads-mgmt")}`}
                >
                  Leads
                </Link>
              )}
              <Link
                href="/dashboard"
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${navClass("leads")}`}
              >
                {isAdmin ? "Work" : "Leads"}
              </Link>
              <Link
                href="/dashboard?view=green"
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  isBucketsView ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                Buckets
              </Link>
              {isAdmin && (
                <Link
                  href="/dashboard/create-user"
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    view === "create-user" ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  }`}
                >
                  Users
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:border-neutral-300"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
