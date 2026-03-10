"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LeadTable } from "@/components/LeadTable";
import { GreenBucketTable } from "@/components/GreenBucketTable";
import { AdminLeadsTable } from "@/components/AdminLeadsTable";
import { LiveSheetTable } from "@/components/LiveSheetTable";
import { CallbackReminder } from "@/components/CallbackReminder";
import type { Lead } from "@/types/lead";

type ViewMode = "leads" | "green" | "exhaust" | "review" | "live";

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [greenLeads, setGreenLeads] = useState<Lead[]>([]);
  const [exhaustLeads, setExhaustLeads] = useState<Lead[]>([]);
  const [reviewLeads, setReviewLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<ViewMode>("leads");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchLeads = async () => {
    const res = await fetch("/api/leads");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setLeads(Array.isArray(data) ? data : []);
  };

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
    const [exhaustRes, reviewRes] = await Promise.all([
      fetch("/api/leads?admin=true"),
      fetch("/api/leads?admin=true&review=true"),
    ]);
    if (exhaustRes.status === 401) {
      router.push("/");
      return;
    }
    if (exhaustRes.status === 403 || reviewRes.status === 403) {
      return;
    }
    const exhaustData = await exhaustRes.json();
    const reviewData = await reviewRes.json();
    setExhaustLeads(Array.isArray(exhaustData) ? exhaustData : []);
    setReviewLeads(Array.isArray(reviewData) ? reviewData : []);
  };

  useEffect(() => {
    const v = searchParams.get("view") as ViewMode | null;
    setView((v === "green" || v === "exhaust" || v === "review" || v === "live" || v === "leads") ? v : "leads");
  }, [searchParams]);

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
  }, [router]);

  useEffect(() => {
    if (view === "green") fetchGreenLeads();
  }, [view]);

  useEffect(() => {
    if ((view === "exhaust" || view === "review") && isAdmin) fetchAdminData();
  }, [view, isAdmin]);

  const setViewWithUrl = (v: ViewMode) => {
    setView(v);
    const url = v === "leads" ? "/dashboard" : `/dashboard?view=${v}`;
    router.replace(url);
  };


  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-3 pb-2">
      {(view === "leads" || view === "green") && (
        <div className="shrink-0">
          <CallbackReminder leads={leads} />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow">
        {/* Buckets sub-tabs: Green | Exhaust | Review (inside Buckets) */}
        {(view === "green" || view === "exhaust" || view === "review") && (
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
                </>
              )}
            </div>
          </div>
        )}

        {view === "leads" ? (
          leads.length === 0 ? (
            <p className="flex flex-1 items-center justify-center p-8 text-center text-neutral-600">
              No leads assigned to you. Contact admin.
            </p>
          ) : (
            <LeadTable
              leads={leads}
              onRefresh={fetchLeads}
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
            <GreenBucketTable leads={greenLeads} onRefresh={fetchGreenLeads} />
          )
        ) : (view === "exhaust" || view === "review") && isAdmin ? (
          (view === "exhaust" ? exhaustLeads : reviewLeads).length === 0 ? (
            <p className="flex flex-1 items-center justify-center p-8 text-center text-neutral-500">
              {view === "exhaust" ? "No exhausted leads" : "No leads in review"}
            </p>
          ) : (
            <AdminLeadsTable
              leads={view === "exhaust" ? exhaustLeads : reviewLeads}
              variant={view === "exhaust" ? "exhaust" : "review"}
              onRefresh={fetchAdminData}
            />
          )
        ) : view === "live" && isAdmin ? (
          <LiveSheetTable />
        ) : null}
      </div>

    </div>
  );
}
