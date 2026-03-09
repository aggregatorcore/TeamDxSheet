"use client";

import { useState, useRef } from "react";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import type { Lead } from "@/types/lead";

interface GreenBucketTableProps {
  leads: Lead[];
  onRefresh: () => void;
}

const colWidths = ["10%", "10%", "14%", "12%", "14%", "20%", "20%"];

export function GreenBucketTable({ leads, onRefresh }: GreenBucketTableProps) {
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-lg">
      {/* Single table with sticky header - matches LeadTable structure */}
      <div ref={bodyScrollRef} className="min-h-0 flex-1 overflow-auto rounded-b-lg">
        <table
          className="w-full min-w-0 border-collapse"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: colWidths[0] }} />
            <col style={{ width: colWidths[1] }} />
            <col style={{ width: colWidths[2] }} />
            <col style={{ width: colWidths[3] }} />
            <col style={{ width: colWidths[4] }} />
            <col style={{ width: colWidths[5] }} />
            <col style={{ width: colWidths[6] }} />
          </colgroup>
          <thead>
            <tr>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap rounded-tl-lg border-r-2 border-emerald-600 border-b-2 border-emerald-700 bg-emerald-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">
                ID
              </th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-600 border-b-2 border-emerald-700 bg-emerald-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">
                Source
              </th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-600 border-b-2 border-emerald-700 bg-emerald-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">
                Name
              </th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-600 border-b-2 border-emerald-700 bg-emerald-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">
                Place
              </th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-600 border-b-2 border-emerald-700 bg-emerald-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">
                Number
              </th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-600 border-b-2 border-emerald-700 bg-emerald-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">
                Action
              </th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap rounded-tr-lg border-r-2 border-emerald-600 border-b-2 border-emerald-700 bg-emerald-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">
                Note
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-emerald-200 bg-white">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="group transition-colors duration-150 bg-emerald-50/30 hover:bg-emerald-50/50"
              >
                <td className="overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-200 px-2 py-1.5 text-xs font-mono text-slate-900 transition-colors duration-150 bg-emerald-50/30 group-hover:bg-emerald-50/50">
                  <div className="flex items-center gap-1">
                    <span>{lead.id.slice(0, 8)}</span>
                    <button
                      type="button"
                      onClick={() => setDetailLead(lead)}
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
                <td className="overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-200 px-2 py-1.5 text-xs text-slate-800">
                  {lead.source}
                </td>
                <td className="overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-200 px-2 py-1.5 text-xs text-slate-800">
                  {lead.name}
                </td>
                <td className="overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-200 px-2 py-1.5 text-xs text-slate-800">
                  {lead.place}
                </td>
                <td className="overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-200 px-2 py-1.5 text-xs text-slate-800">
                  {lead.number}
                </td>
                <td className="overflow-hidden border-r-2 border-emerald-200 px-2 py-1.5">
                  <span className="inline-block whitespace-nowrap rounded-lg border-2 border-amber-700 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                    Document received
                  </span>
                </td>
                <td className="overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-emerald-200 px-2 py-1.5 text-xs text-slate-600">
                  {lead.note ? (lead.note.length > 50 ? lead.note.slice(0, 50) + "…" : lead.note) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailLead && (
        <LeadDetailModal lead={detailLead} onClose={() => setDetailLead(null)} />
      )}
    </div>
  );
}
