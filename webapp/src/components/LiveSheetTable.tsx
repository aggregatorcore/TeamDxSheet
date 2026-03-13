"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/types/lead";
import { CallbackCountdown } from "@/components/CallbackCountdown";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { BLINK_BEFORE_SECONDS, BUCKET_LABELS, GRACE_PERIOD_HOURS, FLOW_COLORS, TAG_COLORS } from "@/lib/constants";
import { getEffectiveTag } from "@/lib/leadNote";
import type { FlowOption, TagOption } from "@/types/lead";

export type TelecallerStat = {
  email: string;
  work: number;
  green: number;
  exhaust: number;
  review: number;
};

function isBlinkTime(callbackTime: string) {
  if (!callbackTime) return false;
  const d = new Date(callbackTime).getTime();
  const now = Date.now();
  const blinkStart = d - BLINK_BEFORE_SECONDS * 1000;
  const graceEnd = d + GRACE_PERIOD_HOURS * 60 * 60 * 1000;
  return now >= blinkStart && now <= graceEnd;
}

export function LiveSheetTable() {
  const [stats, setStats] = useState<TelecallerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTelecaller, setSelectedTelecaller] = useState<string | null>(null);
  const [modalView, setModalView] = useState<"work" | "green" | "review" | "exhaust">("work");
  const [telecallerLeads, setTelecallerLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const hasCallbacks = telecallerLeads.some((l) => l.callbackTime);
  useCurrentTime(!!selectedTelecaller && hasCallbacks);

  const fetchStats = async () => {
    setError(null);
    try {
      const res = await fetch("/api/leads?stats=true");
      if (res.status === 401 || res.status === 403) {
        setError("Access denied");
        setStats([]);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to load");
        setStats([]);
        return;
      }
      const data = await res.json();
      setStats(Array.isArray(data?.telecallers) ? data.telecallers : []);
    } catch {
      setError("Network error");
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedTelecaller) {
      setTelecallerLeads([]);
      return;
    }
    setModalView("work");
  }, [selectedTelecaller]);

  useEffect(() => {
    if (!selectedTelecaller) {
      setTelecallerLeads([]);
      return;
    }
    let cancelled = false;
    setLoadingLeads(true);
    const params = new URLSearchParams({ assignedTo: selectedTelecaller });
    if (modalView !== "work") params.set("bucket", modalView);
    fetch(`/api/leads?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setTelecallerLeads(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setTelecallerLeads([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLeads(false);
      });
    return () => { cancelled = true; };
  }, [selectedTelecaller, modalView]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-neutral-600">Loading live sheet…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchStats(); }}
          className="rounded-lg bg-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-300"
        >
          Retry
        </button>
      </div>
    );
  }

  const totals = stats.reduce(
    (acc, row) => ({
      work: acc.work + row.work,
      green: acc.green + row.green,
      exhaust: acc.exhaust + row.exhaust,
      review: acc.review + row.review,
    }),
    { work: 0, green: 0, exhaust: 0, review: 0 }
  );

  // Show "pool" and "(unassigned)" at the bottom; rest sorted by email
  const BOTTOM_EMAILS = ["pool", "(unassigned)"];
  const sortedStats = [...stats].sort((a, b) => {
    const aBottom = BOTTOM_EMAILS.includes(a.email.toLowerCase());
    const bBottom = BOTTOM_EMAILS.includes(b.email.toLowerCase());
    if (aBottom && !bBottom) return 1;
    if (!aBottom && bBottom) return -1;
    if (aBottom && bBottom) return a.email.localeCompare(b.email);
    return a.email.localeCompare(b.email);
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700">Live sheet – leads per telecaller</h2>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchStats(); }}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-neutral-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-800 text-slate-100 shadow">
            <tr>
              <th className="px-3 py-2 font-semibold">Telecaller</th>
              <th className="px-3 py-2 font-semibold text-right">Work</th>
              <th className="px-3 py-2 font-semibold text-right">{BUCKET_LABELS.green}</th>
              <th className="px-3 py-2 font-semibold text-right">{BUCKET_LABELS.exhaust}</th>
              <th className="px-3 py-2 font-semibold text-right">{BUCKET_LABELS.review}</th>
              <th className="px-3 py-2 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  No data yet
                </td>
              </tr>
            ) : (
              sortedStats.map((row) => {
                const total = row.work + row.green + row.exhaust + row.review;
                return (
                  <tr
                    key={row.email}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTelecaller(row.email)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedTelecaller(row.email)}
                    className="cursor-pointer hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                  >
                    <td className="px-3 py-2 font-medium text-neutral-900">{row.email}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-blue-700">{row.work}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{row.green}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{row.exhaust}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-700">{row.review}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{total}</td>
                  </tr>
                );
              })
            )}
            {stats.length > 0 && (
              <tr className="border-t-2 border-neutral-300 bg-neutral-100 font-semibold">
                <td className="px-3 py-2 text-neutral-800">Total</td>
                <td className="px-3 py-2 text-right tabular-nums text-blue-700">{totals.work}</td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{totals.green}</td>
                <td className="px-3 py-2 text-right tabular-nums text-red-700">{totals.exhaust}</td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-700">{totals.review}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {totals.work + totals.green + totals.exhaust + totals.review}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTelecaller && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedTelecaller(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="telecaller-modal-title"
        >
          <div
            className="flex h-[85vh] max-h-[90vh] w-full max-w-[1400px] flex-col rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
              <h2 id="telecaller-modal-title" className="shrink-0 text-lg font-semibold text-neutral-900">
                Live – {selectedTelecaller}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="flex rounded-lg border border-neutral-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setModalView("work")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                      modalView === "work"
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                  >
                    Work
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (modalView === "work") setModalView("green"); }}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                      modalView !== "work"
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                  >
                    Buckets
                  </button>
                </div>
                {(modalView === "green" || modalView === "review" || modalView === "exhaust") && (
                  <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setModalView("green")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                        modalView === "green"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      }`}
                    >
                      {BUCKET_LABELS.green}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalView("review")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                        modalView === "review"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                      }`}
                    >
                      {BUCKET_LABELS.review}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalView("exhaust")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                        modalView === "exhaust"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-red-700 hover:bg-red-50 hover:text-red-800"
                      }`}
                    >
                      {BUCKET_LABELS.exhaust}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTelecaller(null)}
                className="shrink-0 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
              {loadingLeads ? (
                <p className="py-8 text-center text-neutral-500">Loading leads…</p>
              ) : telecallerLeads.length === 0 ? (
                <p className="py-8 text-center text-neutral-500">
                  {modalView === "work"
                    ? "No work leads"
                    : modalView === "green"
                      ? `No leads in ${BUCKET_LABELS.green} bucket`
                      : modalView === "review"
                        ? `No leads in ${BUCKET_LABELS.review}`
                        : `No leads in ${BUCKET_LABELS.exhaust}`}
                </p>
              ) : (
                (() => {
                  const sorted = [...telecallerLeads].sort((a, b) => {
                    const aBlink = a.callbackTime && isBlinkTime(a.callbackTime);
                    const bBlink = b.callbackTime && isBlinkTime(b.callbackTime);
                    if (aBlink && !bBlink) return -1;
                    if (!aBlink && bBlink) return 1;
                    if (a.category === "overdue" && b.category !== "overdue") return -1;
                    if (a.category !== "overdue" && b.category === "overdue") return 1;
                    if (a.category === "callback" && b.category !== "callback") return -1;
                    if (a.category !== "callback" && b.category === "callback") return 1;
                    return 0;
                  });
                  const flowColor = (flow: string) =>
                    FLOW_COLORS[flow as FlowOption] ?? "bg-neutral-100 text-neutral-700 border-neutral-300";
                  const tagColor = (tag: string, isOverdue: boolean) =>
                    isOverdue ? TAG_COLORS.overdue : (TAG_COLORS[tag as TagOption] ?? "bg-neutral-100 text-neutral-700 border-neutral-300");
                  return (
                    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-neutral-200">
                      <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                        <thead>
                          <tr>
                            <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap rounded-tl-lg border-b-2 border-r-2 border-slate-600 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">ID</th>
                            <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-b-2 border-r-2 border-slate-600 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Source</th>
                            <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-b-2 border-r-2 border-slate-600 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Name</th>
                            <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-b-2 border-r-2 border-slate-600 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Place</th>
                            <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-b-2 border-r-2 border-slate-600 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Number</th>
                            <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-b-2 border-r-2 border-slate-600 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Flow</th>
                            <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-b-2 border-r-2 border-slate-600 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Tags</th>
                            <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap rounded-tr-lg border-b-2 border-r-2 border-slate-600 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                          {sorted.map((lead) => {
                            const shouldBlink = modalView === "work" && !!(lead.callbackTime && isBlinkTime(lead.callbackTime));
                            const rowClass =
                              modalView === "green"
                                ? "bg-emerald-50/50 hover:bg-emerald-50"
                                : modalView === "review"
                                  ? "bg-amber-50/50 hover:bg-amber-50"
                                  : modalView === "exhaust"
                                    ? "bg-red-50/50 hover:bg-red-50"
                                    : shouldBlink
                                      ? "animate-callback-blink bg-amber-50 hover:bg-amber-100"
                                      : lead.category === "overdue"
                                        ? "bg-red-50 hover:bg-red-100"
                                        : lead.category === "callback"
                                          ? "bg-amber-50 hover:bg-amber-100"
                                          : "hover:bg-neutral-50";
                            return (
                          <tr key={lead.id} className={rowClass}>
                                <td className="border-r-2 border-slate-200 px-2 py-1.5 font-mono text-xs text-slate-900">
                                  <div className="flex items-center gap-1">
                                    <span>{lead.id.slice(0, 8)}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setDetailLead(lead); }}
                                      className="shrink-0 rounded p-0.5 bg-blue-900 text-blue-100 transition-colors hover:bg-blue-800 hover:text-white"
                                      title="View full details"
                                      aria-label="View lead details"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                                <td className="border-r-2 border-slate-200 px-2 py-1.5 text-slate-800">{lead.source}</td>
                                <td className="border-r-2 border-slate-200 px-2 py-1.5 text-slate-800">{lead.name}</td>
                                <td className="border-r-2 border-slate-200 px-2 py-1.5 text-slate-800">{lead.place}</td>
                                <td className="border-r-2 border-slate-200 px-2 py-1.5 text-slate-800">{lead.number}</td>
                                <td className="border-r-2 border-slate-200 px-2 py-1.5">
                                  <span className={`inline-flex rounded border px-1.5 py-0.5 text-xs font-medium ${flowColor(lead.flow)}`}>
                                    {lead.flow}
                                  </span>
                                </td>
                                <td className="border-r-2 border-slate-200 px-2 py-1.5">
                                  <span className={`inline-flex rounded border px-1.5 py-0.5 text-xs font-medium ${tagColor(getEffectiveTag(lead.note, lead.tags) || "—", lead.category === "overdue")}`}>
                                    {lead.category === "overdue" ? "Overdue" : getEffectiveTag(lead.note, lead.tags) || "—"}
                                  </span>
                                </td>
                                <td className="border-r-2 border-slate-200 px-2 py-1.5">
                                  {lead.callbackTime ? (
                                    <CallbackCountdown
                                      callbackTime={lead.callbackTime}
                                      isBlinking={isBlinkTime(lead.callbackTime)}
                                    />
                                  ) : (
                                    <span className="text-neutral-400 text-xs" title="No callback scheduled">No callback</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
      {detailLead && (
        <LeadDetailModal lead={detailLead} onClose={() => setDetailLead(null)} />
      )}
    </div>
  );
}
