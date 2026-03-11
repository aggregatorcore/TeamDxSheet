"use client";

import { useRef, useState } from "react";
import {
  PLACE_OPTIONS,
  TARGET_COUNTRIES,
  TRADE_CATEGORIES,
  TRADE_FIELDS,
  VISA_TYPES,
  QUALIFICATION_OPTIONS,
  WORK_EXP_YEARS,
  BUDGET_OPTIONS,
  REJECTION_REASONS,
  PREV_TRAVEL_DURATION,
  PREV_TRAVEL_COUNT_OPTIONS,
  INTERESTED_ACTIONS,
} from "@/lib/constants";

export interface InterestedFormValues {
  name: string;
  place: string;
  qualification: string;
  nowWorking: "" | "yes" | "no";
  tradeField: string;
  workExpFrom: string;
  targetCountry: string;
  visaType: string;
  budgetFrom: string;
  previousTraveler: "" | "yes" | "no";
  prevTravelCount: number;
  prevTravelEntries: { country: string; visa: string; duration: string }[];
  hasRejection: "" | "yes" | "no";
  rejectionCountry: string;
  rejectionReason: string;
  action: string;
  /** Only used in edit form (LeadDetailModal); not in InterestedModal */
  passport?: "" | "yes" | "no";
}

const defaultFormValues: InterestedFormValues = {
  name: "",
  place: "",
  qualification: "",
  nowWorking: "",
  tradeField: "",
  workExpFrom: "",
  targetCountry: "",
  visaType: "",
  budgetFrom: "",
  previousTraveler: "",
  prevTravelCount: 1,
  prevTravelEntries: [{ country: "", visa: "", duration: "" }],
  hasRejection: "",
  rejectionCountry: "",
  rejectionReason: "",
  action: "",
};

interface InterestedFormContentProps {
  value: Partial<InterestedFormValues> & Pick<InterestedFormValues, "name" | "place">;
  onChange: (updates: Partial<InterestedFormValues>) => void;
  leadPlace?: string;
  showAction?: boolean;
  /** Show Passport field (edit form only) */
  showPassport?: boolean;
}

export function InterestedFormContent({
  value: val,
  onChange,
  leadPlace = "",
  showAction = true,
  showPassport = false,
}: InterestedFormContentProps) {
  const v = { ...defaultFormValues, ...val };
  const [tradeFieldOpen, setTradeFieldOpen] = useState(false);
  const tradeFieldRef = useRef<HTMLDivElement>(null);

  const isNowWorkingYes = v.nowWorking === "yes";
  const isPrevTravelerYes = v.previousTraveler === "yes";
  const isHasRejectionYes = v.hasRejection === "yes";

  const placeOptions = [
    ...PLACE_OPTIONS,
    ...(leadPlace && !PLACE_OPTIONS.includes(leadPlace) ? [leadPlace] : []),
    ...(v.place && !PLACE_OPTIONS.includes(v.place) && v.place !== leadPlace ? [v.place] : []),
  ];
  const placeOptionsUnique = [...new Set(placeOptions)];

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Name</label>
          <input
            type="text"
            value={v.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Client name"
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Place</label>
          <select
            value={v.place}
            onChange={(e) => onChange({ place: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select</option>
            {placeOptionsUnique.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Qualification</label>
        <select
          value={v.qualification}
          onChange={(e) => onChange({ qualification: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">Select</option>
          {QUALIFICATION_OPTIONS.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
        <p className="text-xs font-medium text-slate-700">Abhi working hai?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ nowWorking: "yes" })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              v.nowWorking === "yes"
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ nowWorking: "no", tradeField: "" })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              v.nowWorking === "no"
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            No
          </button>
        </div>
        {isNowWorkingYes && (
          <div ref={tradeFieldRef} className="relative">
            <label className="mb-1 block text-xs font-medium text-slate-700">Field / Trade</label>
            <input
              type="text"
              value={v.tradeField}
              onChange={(e) => {
                onChange({ tradeField: e.target.value });
                setTradeFieldOpen(true);
              }}
              onFocus={() => setTradeFieldOpen(true)}
              onBlur={() => setTimeout(() => setTradeFieldOpen(false), 150)}
              placeholder="Type to search or enter custom..."
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {tradeFieldOpen && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {Object.entries(TRADE_CATEGORIES).map(([category, fields]) => {
                  const keyword = v.tradeField.trim().toLowerCase();
                  const filtered = keyword
                    ? fields.filter((f) => f.toLowerCase().includes(keyword))
                    : fields;
                  if (filtered.length === 0) return null;
                  return (
                    <div key={category}>
                      <div className="px-2.5 py-1 text-xs font-semibold text-slate-500">{category}</div>
                      {filtered.map((f) => (
                        <button
                          key={f}
                          type="button"
                          className="w-full px-2.5 py-1.5 text-left text-sm hover:bg-emerald-50"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onChange({ tradeField: f });
                            setTradeFieldOpen(false);
                          }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  );
                })}
                {v.tradeField.trim() && !TRADE_FIELDS.some((f) => f.toLowerCase() === v.tradeField.trim().toLowerCase()) && (
                  <div className="border-t border-slate-100 px-2.5 py-1.5 text-xs text-slate-500">
                    Press Enter or tap outside to use &quot;{v.tradeField.trim()}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Work experience</label>
        <select
          value={v.workExpFrom}
          onChange={(e) => onChange({ workExpFrom: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">Select</option>
          {WORK_EXP_YEARS.map((y) => (
            <option key={y} value={y}>{y} yrs</option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Target country</label>
          <select
            value={v.targetCountry}
            onChange={(e) => onChange({ targetCountry: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select</option>
            {TARGET_COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Visa type</label>
          <select
            value={v.visaType}
            onChange={(e) => onChange({ visaType: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select</option>
            {VISA_TYPES.map((visa) => (
              <option key={visa} value={visa}>{visa}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Budget</label>
        <select
          value={v.budgetFrom}
          onChange={(e) => onChange({ budgetFrom: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">Select</option>
          {BUDGET_OPTIONS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {showPassport && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
          <p className="text-xs font-medium text-slate-700">Passport</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ passport: "yes" })}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                v.passport === "yes"
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => onChange({ passport: "no" })}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                v.passport === "no"
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              No
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
        <p className="text-xs font-medium text-slate-700">Pehle India se bahar travel kiya?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ previousTraveler: "yes" })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              v.previousTraveler === "yes"
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                previousTraveler: "no",
                prevTravelCount: 1,
                prevTravelEntries: [{ country: "", visa: "", duration: "" }],
              })
            }
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              v.previousTraveler === "no"
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            No
          </button>
        </div>
        {isPrevTravelerYes && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Kitni country main travel kiya hai?
              </label>
              <select
                value={v.prevTravelCount}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  const next = [...v.prevTravelEntries];
                  while (next.length < n) next.push({ country: "", visa: "", duration: "" });
                  onChange({ prevTravelCount: n, prevTravelEntries: next.slice(0, n) });
                }}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {PREV_TRAVEL_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            {v.prevTravelEntries.slice(0, v.prevTravelCount).map((entry, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <p className="text-xs font-medium text-slate-600">Country {i + 1}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Country</label>
                    <select
                      value={entry.country}
                      onChange={(e) => {
                        const next = [...v.prevTravelEntries];
                        next[i] = { ...next[i], country: e.target.value };
                        onChange({ prevTravelEntries: next });
                      }}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select</option>
                      {TARGET_COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Visa</label>
                    <select
                      value={entry.visa}
                      onChange={(e) => {
                        const next = [...v.prevTravelEntries];
                        next[i] = { ...next[i], visa: e.target.value };
                        onChange({ prevTravelEntries: next });
                      }}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select</option>
                      {VISA_TYPES.map((visa) => (
                        <option key={visa} value={visa}>{visa}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Duration</label>
                    <select
                      value={entry.duration}
                      onChange={(e) => {
                        const next = [...v.prevTravelEntries];
                        next[i] = { ...next[i], duration: e.target.value };
                        onChange({ prevTravelEntries: next });
                      }}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select</option>
                      {PREV_TRAVEL_DURATION.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
        <p className="text-xs font-medium text-slate-700">Kisi country ki rejection hai?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ hasRejection: "yes" })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              v.hasRejection === "yes"
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ hasRejection: "no", rejectionCountry: "", rejectionReason: "" })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              v.hasRejection === "no"
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            No
          </button>
        </div>
        {isHasRejectionYes && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Country</label>
              <select
                value={v.rejectionCountry}
                onChange={(e) => onChange({ rejectionCountry: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Select</option>
                {TARGET_COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Reason</label>
              <select
                value={v.rejectionReason}
                onChange={(e) => onChange({ rejectionReason: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Select</option>
                {REJECTION_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {showAction && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Action <span className="text-red-500">*</span>
          </label>
          <select
            value={v.action}
            onChange={(e) => onChange({ action: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select</option>
            {INTERESTED_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
