"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/types/lead";
import { formatCallbackDateShort, formatTokenDisplay, getDateKey } from "@/lib/dateUtils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface WaitingListTableProps {
  leads: Lead[];
  onRefresh?: () => void;
}

export function WaitingListTable({ leads, onRefresh }: WaitingListTableProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of leads) {
      if (!l.callbackTime?.trim()) continue;
      const key = getDateKey(l.callbackTime);
      if (key) map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [leads]);

  const leadsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const list = leads.filter((l) => l.callbackTime?.trim() && getDateKey(l.callbackTime) === selectedDate);
    list.sort((a, b) => new Date(a.callbackTime!).getTime() - new Date(b.callbackTime!).getTime());
    return list;
  }, [leads, selectedDate]);

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = () => setCalendarMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCalendarMonth(new Date(year, month + 1, 1));

  const gridDays: { day: number; dateKey: string }[] = [];
  const leadingBlanks = firstDay;
  for (let i = 0; i < leadingBlanks; i++) gridDays.push({ day: 0, dateKey: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    gridDays.push({ day: d, dateKey });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-lg">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-800">Waiting list</h2>
        <p className="text-xs text-slate-600">Select a date to see scheduled leads.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Calendar */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Prev
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {MONTHS[month]} {year}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Next
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1 text-[10px] font-medium text-slate-500">
                  {w}
                </div>
              ))}
              {gridDays.map(({ day, dateKey }, i) => (
                <div key={i} className="min-h-[36px]">
                  {day === 0 ? (
                    <span className="block h-9" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(dateKey)}
                      className={`flex h-9 w-full flex-col items-center justify-center rounded text-xs transition-colors ${
                        selectedDate === dateKey
                          ? "bg-slate-800 text-white"
                          : (countByDate[dateKey] ?? 0) > 0
                            ? "bg-slate-100 text-slate-800 hover:bg-slate-200"
                            : "text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <span>{day}</span>
                      {(countByDate[dateKey] ?? 0) > 0 && (
                        <span className="mt-0.5 text-[10px] font-semibold tabular-nums">
                          {countByDate[dateKey]}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Table for selected date */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {!selectedDate ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Select a date from the calendar to see scheduled leads.
              </div>
            ) : leadsForSelectedDate.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No leads scheduled for this date.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-0 border-collapse text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-slate-600">Token</th>
                      <th className="px-3 py-2 text-xs font-medium text-slate-600">Name</th>
                      <th className="px-3 py-2 text-xs font-medium text-slate-600">Number</th>
                      <th className="px-3 py-2 text-xs font-medium text-slate-600">Callback time</th>
                      <th className="px-3 py-2 text-xs font-medium text-slate-600">Tag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leadsForSelectedDate.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs text-slate-800">
                          {formatTokenDisplay(lead) || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-800">{lead.name || "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-800">{lead.number || "—"}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">
                          {formatCallbackDateShort(lead.callbackTime)}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">{lead.tags || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {onRefresh && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
