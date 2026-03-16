"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LeadTable } from "@/components/LeadTable";
import { GreenBucketTable } from "@/components/GreenBucketTable";
import { AdminLeadsTable } from "@/components/AdminLeadsTable";
import { LiveSheetTable } from "@/components/LiveSheetTable";
import { CallbackReminder } from "@/components/CallbackReminder";
import { WorkTable } from "@/components/WorkTable";
import { WaitingListTable } from "@/components/WaitingListTable";
import { filterLeadsBySearch } from "@/lib/leadSearch";
import { isCallbackDateAfterToday } from "@/lib/dateUtils";
import type { Lead } from "@/types/lead";

type ViewMode = "work" | "waitingList" | "leads" | "green" | "exhaust" | "review" | "newAssigned" | "live";

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [greenLeads, setGreenLeads] = useState<Lead[]>([]);
  const [exhaustLeads, setExhaustLeads] = useState<Lead[]>([]);
  const [reviewLeads, setReviewLeads] = useState<Lead[]>([]);
  const [newAssignedLeads, setNewAssignedLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<ViewMode>("work");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchLeads = useCallback(async () => {
    const res = await fetch("/api/leads");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setLeads(Array.isArray(data) ? data : []);
  }, [router]);

  /** Sync tokens (backfill for current user) then fetch leads. Used after tag apply and when Refresh is clicked. */
  const refreshWithSync = useCallback(async () => {
    await fetch("/api/sync-my-tokens", { method: "POST" });
    await fetchLeads();
  }, [fetchLeads]);

  const fetchGreenLeads = async () => {
    const res = await fetch("/api/leads?green=true");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setGreenLeads(Array.isArray(data) ? data : []);
  };

  const fetchAdminData = async () => {
    const [exhaustRes, reviewRes, newAssignedRes] = await Promise.all([
      fetch("/api/leads?admin=true"),
      fetch("/api/leads?admin=true&review=true"),
      fetch("/api/leads?admin=true&bucket=new_assigned"),
    ]);
    if (exhaustRes.status === 401) {
      router.push("/");
      return;
    }
    if (exhaustRes.status === 403 || reviewRes.status === 403 || newAssignedRes.status === 403) {
      return;
    }
    const exhaustData = await exhaustRes.json();
    const reviewData = await reviewRes.json();
    const newAssignedData = await newAssignedRes.json();
    setExhaustLeads(Array.isArray(exhaustData) ? exhaustData : []);
    setReviewLeads(Array.isArray(reviewData) ? reviewData : []);
    setNewAssignedLeads(Array.isArray(newAssignedData) ? newAssignedData : []);
  };

  const fetchNewAssignedLeads = async () => {
    const res = await fetch("/api/leads?admin=true&bucket=new_assigned");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    if (res.status === 403) return;
    const data = await res.json();
    setNewAssignedLeads(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const v = searchParams.get("view") as ViewMode | null;
    setView((v === "work" || v === "waitingList" || v === "green" || v === "exhaust" || v === "review" || v === "newAssigned" || v === "live" || v === "leads") ? v : "work");
  }, [searchParams]);

  useEffect(() => {
    const handler = () => {
      refreshWithSync();
    };
    window.addEventListener("dashboard-refresh", handler);
    return () => window.removeEventListener("dashboard-refresh", handler);
  }, [refreshWithSync]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setIsAdmin(profile?.role === "admin");
      await fetchLeads();
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchLeads stable, init on mount only
  }, [router]);

  useEffect(() => {
    if (view === "green") fetchGreenLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchGreenLeads stable, run on view change
  }, [view]);

  useEffect(() => {
    if ((view === "exhaust" || view === "review" || view === "newAssigned") && isAdmin) fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAdminData stable, run on view/isAdmin
  }, [view, isAdmin]);

  const setViewWithUrl = (v: ViewMode) => {
    setView(v);
    const url = v === "work" ? "/dashboard" : `/dashboard?view=${v}`;
    router.replace(url);
  };


  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  const searchQuery = searchParams.get("q") ?? "";
  const hasSearch = searchQuery.trim() !== "";
  const currentLeads =
    view === "leads"
      ? hasSearch
        ? leads
        : leads.filter((l) => !isCallbackDateAfterToday(l.callbackTime))
      : view === "green"
        ? greenLeads
        : view === "exhaust"
          ? exhaustLeads
          : view === "review"
            ? reviewLeads
            : view === "newAssigned"
              ? newAssignedLeads
              : [];
  const filteredLeads = filterLeadsBySearch(currentLeads, searchQuery);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-3 pb-2">
      {(view === "leads" || view === "green") && (
        <div className="shrink-0">
          <CallbackReminder leads={leads} />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow">
        {/* Buckets sub-tabs: Green | Exhaust | Review | New Assigned (inside Buckets) */}
        {(view === "green" || view === "exhaust" || view === "review" || view === "newAssigned") && (
          <div className="flex shrink-0 border-b border-neutral-200 bg-neutral-50 px-3 py-1">
            <div className="flex rounded-lg border border-neutral-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewWithUrl("green")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  view === "green"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                Green
              </button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setViewWithUrl("exhaust")}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                      view === "exhaust"
                        ? "bg-red-600 text-white shadow-sm"
                        : "text-red-700 hover:bg-red-50 hover:text-red-800"
                    }`}
                  >
                    Exhaust ({exhaustLeads.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewWithUrl("review")}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                      view === "review"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    }`}
                  >
                    Review ({reviewLeads.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewWithUrl("newAssigned")}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                      view === "newAssigned"
                        ? "bg-slate-600 text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    New Assigned ({newAssignedLeads.length})
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {view === "work" ? (
          <WorkTable
            leads={leads}
            onRefresh={refreshWithSync}
            onLeadUpdate={(id, updates) => {
              setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
            }}
          />
        ) : view === "waitingList" ? (
          <WaitingListTable leads={leads} onRefresh={refreshWithSync} />
        ) : view === "leads" ? (
          leads.length === 0 ? (
            <p className="flex flex-1 items-center justify-center p-8 text-center text-neutral-600">
              No leads assigned to you. Contact admin.
            </p>
          ) : (
            <LeadTable
              leads={filteredLeads}
              onRefresh={refreshWithSync}
              onLeadUpdate={(id, updates) => {
                setLeads((prev) =>
                  prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
                );
              }}
              onGreenBucketComplete={() => {
                setViewWithUrl("green");
                fetchGreenLeads();
              }}
            />
          )
        ) : view === "green" ? (
          greenLeads.length === 0 ? (
            <p className="flex flex-1 items-center justify-center p-8 text-center text-neutral-600">
              No leads in Green Bucket
            </p>
          ) : (
            <GreenBucketTable leads={filteredLeads} onRefresh={fetchGreenLeads} />
          )
        ) : (view === "exhaust" || view === "review" || view === "newAssigned") && isAdmin ? (
          (view === "exhaust" ? exhaustLeads : view === "review" ? reviewLeads : newAssignedLeads).length === 0 ? (
            <p className="flex flex-1 items-center justify-center p-8 text-center text-neutral-500">
              {view === "exhaust" ? "No exhausted leads" : view === "review" ? "No leads in review" : "No leads in New Assigned"}
            </p>
          ) : (
            <AdminLeadsTable
              leads={filteredLeads}
              variant={view === "exhaust" ? "exhaust" : view === "review" ? "review" : "newAssigned"}
              onRefresh={view === "newAssigned" ? fetchNewAssignedLeads : fetchAdminData}
            />
          )
        ) : view === "live" && isAdmin ? (
          <LiveSheetTable />
        ) : null}
      </div>

    </div>
  );
}
