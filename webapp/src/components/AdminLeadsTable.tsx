"use client";

import { useState } from "react";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import type { Lead } from "@/types/lead";

interface AdminLeadsTableProps {
  leads: Lead[];
  variant: "exhaust" | "review";
  onRefresh: () => void;
}

const colWidths = ["8%", "10%", "14%", "12%", "14%", "16%", "16%", "10%"];

export function AdminLeadsTable({ leads, variant, onRefresh }: AdminLeadsTableProps) {
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [modalTab, setModalTab] = useState<"overview" | "timeline" | "documents">("timeline");

  const openModal = (lead: Lead, tab: "overview" | "timeline" | "documents" = "timeline") => {
    setDetailLead(lead);
    setModalTab(tab);
  };

  const isExhaust = variant === "exhaust";
  const headerBg = isExhaust ? "bg-red-800 border-red-600 border-red-700" : "bg-amber-800 border-amber-600 border-amber-700";
  const headerText = isExhaust ? "text-red-100" : "text-amber-100";
  const rowBg = isExhaust ? "bg-red-50/50 hover:bg-red-50" : "bg-amber-50/50 hover:bg-amber-50";
  const borderColor = isExhaust ? "border-red-200" : "border-amber-200";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-lg">
      <div className="min-h-0 flex-1 overflow-auto rounded-b-lg">
        <table
          className="w-full min-w-0 border-collapse"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className={`sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap rounded-tl-lg border-r-2 border-b-2 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] ${headerBg} ${headerText}`}>
                ID
              </th>
              <th className={`sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-b-2 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] ${headerBg} ${headerText}`}>
                Source
              </th>
              <th className={`sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-b-2 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] ${headerBg} ${headerText}`}>
                Name
              </th>
              <th className={`sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-b-2 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] ${headerBg} ${headerText}`}>
                Place
              </th>
              <th className={`sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-b-2 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] ${headerBg} ${headerText}`}>
                Number
              </th>
              <th className={`sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-b-2 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] ${headerBg} ${headerText}`}>
                Assigned To
              </th>
              <th className={`sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-b-2 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] ${headerBg} ${headerText}`}>
                Tags
              </th>
              <th className={`sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap rounded-tr-lg border-r-2 border-b-2 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider shadow-[0_1px_3px_0_rgba(0,0,0,0.12)] ${headerBg} ${headerText}`}>
                Action
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y-2 ${isExhaust ? "divide-red-200" : "divide-amber-200"} bg-white`}>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className={`group transition-colors duration-150 ${rowBg}`}
              >
                <td className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 ${borderColor} px-2 py-1.5 text-xs font-mono text-slate-900 transition-colors duration-150 ${rowBg}`}>
                  <div className="flex items-center gap-1">
                    <span>{lead.id.slice(0, 8)}</span>
                    <button
                      type="button"
                      onClick={() => openModal(lead, "overview")}
                      className="shrink-0 rounded p-0.5 bg-blue-900 text-blue-100 transition-colors hover:bg-blue-800 hover:text-white"
                      title="View overview"
                      aria-label="View lead overview"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 ${borderColor} px-2 py-1.5 text-xs text-slate-800`}>
                  {lead.source}
                </td>
                <td className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 ${borderColor} px-2 py-1.5 text-xs text-slate-800`}>
                  {lead.name}
                </td>
                <td className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 ${borderColor} px-2 py-1.5 text-xs text-slate-800`}>
                  {lead.place}
                </td>
                <td className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 ${borderColor} px-2 py-1.5 text-xs text-slate-800`}>
                  {lead.number}
                </td>
                <td className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 ${borderColor} px-2 py-1.5 text-xs text-slate-800`}>
                  {lead.assignedTo}
                </td>
                <td className={`overflow-hidden border-r-2 ${borderColor} px-2 py-1.5`}>
                  <span className="inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium text-neutral-700">
                    {lead.tags || "—"}
                  </span>
                </td>
                <td className={`overflow-hidden border-r-2 ${borderColor} px-2 py-1.5`}>
                  <button
                    type="button"
                    onClick={() => openModal(lead, "timeline")}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Action
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          initialTab={modalTab}
        />
      )}
    </div>
  );
}
