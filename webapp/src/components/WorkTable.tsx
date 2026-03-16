"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/types/lead";
import { CallbackCountdown } from "./CallbackCountdown";
import { CallDialModal } from "./CallDialModal";
import { LeadDetailModal } from "./LeadDetailModal";
import { getDisplayId } from "@/lib/displayId";
import { formatCallbackDateShort, formatTokenDisplay } from "@/lib/dateUtils";
import { appendTagHistory } from "@/lib/leadNote";

/**
 * Work page: sirf us ek lead pe focus jiska token/time aa gaya hai.
 * Token-wise order (callback_time asc) – jis ki baari pehle, wahi dikhta hai; complete hone par next lead.
 */
interface WorkTableProps {
  leads: Lead[];
  onRefresh: () => void;
  onLeadUpdate?: (id: string, updates: Partial<Lead>) => void;
}

export function WorkTable({ leads, onRefresh, onLeadUpdate }: WorkTableProps) {
  const [callDialLead, setCallDialLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  /** Token order: callback_time asc, then id. First = jis ki baari aa gayi. */
  const focusLead = useMemo(() => {
    const withTime = leads.filter((l) => l.callbackTime?.trim());
    if (withTime.length === 0) return null;
    const sorted = [...withTime].sort((a, b) => {
      const at = new Date(a.callbackTime!).getTime();
      const bt = new Date(b.callbackTime!).getTime();
      if (at !== bt) return at - bt;
      return (a.id ?? "").localeCompare(b.id ?? "");
    });
    return sorted[0] ?? null;
  }, [leads]);

  const tokenDisplayText = focusLead ? formatTokenDisplay(focusLead) : "";

  if (!focusLead) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-lg">
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-3 py-2">
          <h2 className="text-sm font-semibold text-slate-800">Work</h2>
          <p className="text-xs text-slate-600">Sirf us lead pe focus jiska time aa gaya hai (token order).</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">Koi callback scheduled nahi</p>
          <p className="text-xs text-slate-500">My Leads se callback schedule karo, yahan wahi lead dikhegi jis ki baari pehle hai.</p>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-lg">
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-3 py-2">
          <h2 className="text-sm font-semibold text-slate-800">Work</h2>
          <p className="text-xs text-slate-600">{tokenDisplayText ? `Token #${tokenDisplayText} – is lead pe focus karo. Complete karo to next lead aa jaygi.` : "Is lead pe focus karo. Complete karo to next lead aa jaygi."}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2">
              <span className="text-xs font-medium text-slate-500">Token</span>
              <span className="ml-2 font-mono text-sm font-semibold text-slate-800">{tokenDisplayText || focusLead.token ?? "—"}</span>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Name</p>
                <p className="text-sm font-medium text-slate-900">{focusLead.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Number</p>
                <p className="font-mono text-sm text-slate-800">{focusLead.number || "—"}</p>
              </div>
              {focusLead.place && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Place</p>
                  <p className="text-sm text-slate-700">{focusLead.place}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500">ID</p>
                <p className="text-xs font-mono text-slate-600">{getDisplayId(focusLead.id)}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Callback time</p>
                <div className="flex flex-wrap items-center gap-2">
                  <CallbackCountdown
                    callbackTime={focusLead.callbackTime!}
                    inline
                    renderCallNow={
                      <button
                        type="button"
                        onClick={() => setCallDialLead(focusLead)}
                        className="rounded border border-amber-600 bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                      >
                        Call Now
                      </button>
                    }
                  />
                  <span className="text-[10px] text-slate-500">{formatCallbackDateShort(focusLead.callbackTime!)}</span>
                </div>
              </div>
              {focusLead.tags && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Tag</p>
                  <p className="text-sm text-slate-700">{focusLead.tags}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setCallDialLead(focusLead)}
                className="rounded-lg border border-amber-600 bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Call
              </button>
              <button
                type="button"
                onClick={() => setDetailLead(focusLead)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View timeline
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => {
            setDetailLead(null);
            onRefresh();
          }}
          onUpdate={(updates) => {
            setDetailLead((prev) => (prev ? { ...prev, ...updates } : null));
            onLeadUpdate?.(detailLead.id, updates);
          }}
          onScheduleCallback={(lead) => {
            setDetailLead(null);
            setCallDialLead(lead);
          }}
        />
      )}

      {callDialLead && (
        <CallDialModal
          lead={callDialLead}
          onClose={() => {
            setCallDialLead(null);
            onRefresh();
          }}
          onSuccess={onRefresh}
          onConnectInterested={() => {
            setCallDialLead(null);
            onRefresh();
          }}
          onConnectNotInterested={() => {
            setCallDialLead(null);
            onRefresh();
          }}
          onConnectDocumentReceived={() => {
            setCallDialLead(null);
            onRefresh();
          }}
          onConfirmNotInterested={async (l, result) => {
            const isBudgetIssue = result.reason === "Budget issue" && result.budget && result.preferredCountry;
            if (isBudgetIssue) {
              const note = appendTagHistory(
                `Not Interested: Budget issue - Budget: ${result.budget}, Preferred Country: ${result.preferredCountry}`,
                "Not Interested"
              );
              const res = await fetch("/api/leads", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: l.id, tags: "Not Interested", note, moveToReview: true }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed (${res.status})`);
              }
            } else {
              let note = `Not Interested: ${result.reason}`;
              if (result.reason === "Already applied to another consultancy") {
                const parts: string[] = [];
                if (result.appliedCountry) parts.push(`Country: ${result.appliedCountry}`);
                if (result.consultancyName) parts.push(`Consultancy: ${result.consultancyName}`);
                if (result.charges) parts.push(`Charges: ${result.charges}`);
                if (parts.length) note += ` - ${parts.join(", ")}`;
              }
              if (result.reason === "Trust issue") {
                const parts: string[] = [];
                if (result.trustIssueFraud) parts.push(`Previous fraud: ${result.trustIssueFraud}`);
                if (result.trustIssueFraud === "yes") {
                  if (result.trustIssueFraudCountry) parts.push(`Fraud country: ${result.trustIssueFraudCountry}`);
                  if (result.trustIssueFraudAmount) parts.push(`Fraud amount: ${result.trustIssueFraudAmount}`);
                }
                if (result.trustIssueNote) parts.push(`Our trust issue: ${result.trustIssueNote}`);
                if (parts.length) note += ` - ${parts.join("; ")}`;
              }
              if (result.reason === "Client location too far") {
                const parts: string[] = [];
                if (result.clientLocation) parts.push(`Location: ${result.clientLocation}`);
                if (result.clientLocationNote) parts.push(`Note: ${result.clientLocationNote}`);
                if (parts.length) note += ` - ${parts.join("; ")}`;
              }
              const noteWithHistory = appendTagHistory(note, "Not Interested");
              const res = await fetch("/api/leads", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: l.id, tags: "Not Interested", note: noteWithHistory, moveToReview: true }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed (${res.status})`);
              }
            }
            setCallDialLead(null);
            onRefresh();
          }}
          onInvalidNumber={() => {
            setCallDialLead(null);
            onRefresh();
          }}
          onIncomingOffClick={() => {
            setCallDialLead(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
