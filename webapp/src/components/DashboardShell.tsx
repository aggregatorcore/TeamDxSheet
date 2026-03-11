"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";

interface DashboardShellProps {
  children: React.ReactNode;
  isAdmin: boolean;
  userEmail?: string;
  userName?: string | null;
}

export function DashboardShell({ children, isAdmin, userEmail, userName }: DashboardShellProps) {
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

  const displayName = userName?.trim() || userEmail?.split("@")[0] || "User";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <header className="shrink-0 border-b border-neutral-200/80 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold tracking-tight text-neutral-900 sm:text-lg">
                  TeamDX Lead Manager
                </h1>
                {!isAdmin && userEmail && (
                  <p className="truncate text-xs text-neutral-500 sm:text-sm" title={userEmail}>
                    {displayName}
                  </p>
                )}
              </div>
            </Link>
            <nav className="flex rounded-lg border border-neutral-200 bg-white p-0.5">
              {isAdmin && (
                <Link
                  href="/dashboard/leads"
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:px-4 ${navClass("leads-mgmt")}`}
                >
                  Leads
                </Link>
              )}
              <Link
                href="/dashboard"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:px-4 ${navClass("leads")}`}
              >
                {isAdmin ? "Work" : "My Leads"}
              </Link>
              <Link
                href="/dashboard?view=green"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:px-4 ${
                  isBucketsView ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {isAdmin ? "Buckets" : "My Buckets"}
              </Link>
              {isAdmin && (
                <Link
                  href="/dashboard?view=live"
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:px-4 ${navClass("live")}`}
                >
                  Live
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/dashboard/create-user"
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:px-4 ${
                    view === "create-user" ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  }`}
                >
                  Users
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && userEmail && (
              <span className="hidden max-w-[140px] truncate rounded-md bg-neutral-100 px-2.5 py-1.5 text-xs text-neutral-600 sm:block" title={userEmail}>
                {userEmail}
              </span>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:border-neutral-300 sm:gap-2 sm:px-3"
              title="Reload page"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200 hover:text-neutral-900 sm:gap-2 sm:px-3"
              title="Sign out"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
