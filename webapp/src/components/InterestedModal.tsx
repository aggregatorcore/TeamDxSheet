"use client";

import { useEffect, useState } from "react";
import {
  TARGET_COUNTRIES,
  TRADE_FIELDS,
  VISA_TYPES,
  INTERESTED_ACTIONS,
  NO_PASSPORT_SCRIPT,
  PLACE_OPTIONS,
  QUALIFICATION_OPTIONS,
  WORK_EXP_YEARS,
  BUDGET_OPTIONS,
  REJECTION_REASONS,
  PREV_TRAVEL_DURATION,
  PREV_TRAVEL_COUNT_OPTIONS,
} from "@/lib/constants";

export interface InterestedResult {
  hasPassport: boolean;
  name?: string;
  place?: string;
  qualification?: string;
  nowWorking?: boolean;
  tradeField?: string;
  workExperience?: string;
  workExpFrom?: string;
  targetCountry?: string;
  visaType?: string;
  budget?: string;
  budgetFrom?: string;
  previousTraveler?: boolean;
  prevTravelCountry?: string;
  prevTravelVisa?: string;
  prevTravelDuration?: string;
  /** Multiple travel entries: Country, Visa, Duration per entry */
  prevTravelEntries?: { country: string; visa: string; duration: string }[];
  hasRejection?: boolean;
  rejectionCountry?: string;
  rejectionReason?: string;
  action?: string;
}

interface InterestedModalProps {
  leadName: string;
  leadPlace?: string;
  leadNumber: string;
  id: string;
  onClose: () => void;
  onConfirm: (result: InterestedResult) => Promise<void>;
}

export function InterestedModal({
  leadName,
  leadPlace = "",
  leadNumber,
  onClose,
  onConfirm,
}: InterestedModalProps) {
  void leadNumber;
  const [loading, setLoading] = useState(false);
  const [passport, setPassport] = useState<"yes" | "no" | "">("");
  const [error, setError] = useState<string | null>(null);

  // Form fields (when passport = yes)
  const [name, setName] = useState(leadName);
  const [place, setPlace] = useState(leadPlace);
  const [qualification, setQualification] = useState("");
  const [nowWorking, setNowWorking] = useState<"yes" | "no" | "">("");
  const [tradeField, setTradeField] = useState("");
  const [workExpFrom, setWorkExpFrom] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [visaType, setVisaType] = useState("");
  const [budgetFrom, setBudgetFrom] = useState("");
  const [previousTraveler, setPreviousTraveler] = useState<"yes" | "no" | "">("");
  const [prevTravelCount, setPrevTravelCount] = useState<number>(1);
  const [prevTravelEntries, setPrevTravelEntries] = useState<{ country: string; visa: string; duration: string }[]>([
    { country: "", visa: "", duration: "" },
  ]);
  const [hasRejection, setHasRejection] = useState<"yes" | "no" | "">("");
  const [rejectionCountry, setRejectionCountry] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [action, setAction] = useState("");

  const isNoPassport = passport === "no";
  const isYesPassport = passport === "yes";
  const isNowWorkingYes = nowWorking === "yes";
  const isPrevTravelerYes = previousTraveler === "yes";
  const isHasRejectionYes = hasRejection === "yes";

  const canConfirmNoPassport = isNoPassport;
  const canConfirmYesPassport = isYesPassport && action.trim().length > 0;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, loading]);

  const handleConfirm = async () => {
    setError(null);
    if (isNoPassport) {
      setLoading(true);
      try {
        await onConfirm({
          hasPassport: false,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!canConfirmYesPassport) return;
    setLoading(true);
    try {
      const result: InterestedResult = {
        hasPassport: true,
        action: action.trim(),
      };
      if (name.trim()) result.name = name.trim();
      if (place.trim()) result.place = place.trim();
      if (qualification.trim()) result.qualification = qualification.trim();
      if (isNowWorkingYes) {
        result.nowWorking = true;
        if (tradeField.trim()) result.tradeField = tradeField.trim();
      }
      if (workExpFrom.trim()) {
        result.workExperience = `${workExpFrom} years`;
        result.workExpFrom = workExpFrom.trim();
      }
      if (targetCountry.trim()) result.targetCountry = targetCountry.trim();
      if (visaType.trim()) result.visaType = visaType.trim();
      if (budgetFrom.trim()) {
        result.budget = budgetFrom.trim();
        result.budgetFrom = budgetFrom.trim();
      }
      if (isPrevTravelerYes) {
        result.previousTraveler = true;
        const entries = prevTravelEntries
          .filter((e) => e.country.trim() || e.visa.trim() || e.duration.trim())
          .map((e) => ({
            country: e.country.trim(),
            visa: e.visa.trim(),
            duration: e.duration.trim(),
          }));
        if (entries.length > 0) result.prevTravelEntries = entries;
      }
      if (isHasRejectionYes) {
        result.hasRejection = true;
        if (rejectionCountry.trim()) result.rejectionCountry = rejectionCountry.trim();
        if (rejectionReason.trim()) result.rejectionReason = rejectionReason.trim();
      }
      await onConfirm(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPassport("");
    setName(leadName);
    setPlace(leadPlace);
    setQualification("");
    setNowWorking("");
    setTradeField("");
    setWorkExpFrom("");
    setTargetCountry("");
    setVisaType("");
    setBudgetFrom("");
    setPreviousTraveler("");
    setPrevTravelCount(1);
    setPrevTravelEntries([{ country: "", visa: "", duration: "" }]);
    setHasRejection("");
    setRejectionCountry("");
    setRejectionReason("");
    setAction("");
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Interested / Connect</h2>
              <p className="text-xs text-slate-300">
                {!passport
                  ? "Client details collect karein"
                  : isNoPassport
                    ? "Lead Review mein jayegi"
                    : "Form complete karein"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto flex-1">
          {/* Step 1: Passport */}
          {!passport && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-3">
              <p className="text-sm font-medium text-emerald-900">
                Client ke paas passport hai?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPassport("yes")}
                  className="flex-1 rounded-lg border-2 border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setPassport("no")}
                  className="flex-1 rounded-lg border-2 border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
                >
                  No
                </button>
              </div>
            </div>
          )}

          {/* No passport - script */}
          {isNoPassport && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-sm font-medium text-amber-900 mb-2">Script:</p>
              <p className="text-sm text-amber-800 italic">
                &ldquo;{NO_PASSPORT_SCRIPT}&rdquo;
              </p>
              <p className="text-xs text-amber-700 mt-2">
                Confirm karne par lead Review bucket mein chali jayegi.
              </p>
              <button
                type="button"
                onClick={resetForm}
                className="mt-3 text-xs text-amber-700 underline hover:no-underline"
              >
                Back
              </button>
            </div>
          )}

          {/* Yes passport - full form */}
          {isYesPassport && (
            <>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-emerald-700 underline hover:no-underline"
              >
                Back
              </button>
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Client name"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Place
                    </label>
                    <select
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select</option>
                      {[
                        ...PLACE_OPTIONS,
                        ...(leadPlace && !PLACE_OPTIONS.includes(leadPlace) ? [leadPlace] : []),
                      ].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Qualification
                  </label>
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select</option>
                    {QUALIFICATION_OPTIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                  <p className="text-xs font-medium text-slate-700">
                    Abhi working hai?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNowWorking("yes")}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        nowWorking === "yes"
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNowWorking("no");
                        setTradeField("");
                      }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        nowWorking === "no"
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      No
                    </button>
                  </div>
                  {isNowWorkingYes && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Field / Trade
                      </label>
                      <select
                        value={tradeField}
                        onChange={(e) => setTradeField(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Select</option>
                        {TRADE_FIELDS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Work experience
                  </label>
                  <select
                    value={workExpFrom}
                    onChange={(e) => setWorkExpFrom(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select</option>
                    {WORK_EXP_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y} yrs
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Target country
                    </label>
                    <select
                      value={targetCountry}
                      onChange={(e) => setTargetCountry(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select</option>
                      {TARGET_COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Visa type
                    </label>
                    <select
                      value={visaType}
                      onChange={(e) => setVisaType(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select</option>
                      {VISA_TYPES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Budget
                  </label>
                  <select
                    value={budgetFrom}
                    onChange={(e) => setBudgetFrom(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select</option>
                    {BUDGET_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                  <p className="text-xs font-medium text-slate-700">
                    Pehle India se bahar travel kiya?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviousTraveler("yes")}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        previousTraveler === "yes"
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviousTraveler("no");
                        setPrevTravelCount(1);
                        setPrevTravelEntries([{ country: "", visa: "", duration: "" }]);
                      }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        previousTraveler === "no"
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
                          value={prevTravelCount}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            setPrevTravelCount(n);
                            setPrevTravelEntries((prev) => {
                              const next = [...prev];
                              while (next.length < n) {
                                next.push({ country: "", visa: "", duration: "" });
                              }
                              return next.slice(0, n);
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          {PREV_TRAVEL_COUNT_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      {prevTravelEntries.slice(0, prevTravelCount).map((entry, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
                        >
                          <p className="text-xs font-medium text-slate-600">
                            Country {i + 1}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-700">
                                Country
                              </label>
                              <select
                                value={entry.country}
                                onChange={(e) => {
                                  setPrevTravelEntries((prev) => {
                                    const next = [...prev];
                                    next[i] = { ...next[i], country: e.target.value };
                                    return next;
                                  });
                                }}
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              >
                                <option value="">Select</option>
                                {TARGET_COUNTRIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-700">
                                Visa
                              </label>
                              <select
                                value={entry.visa}
                                onChange={(e) => {
                                  setPrevTravelEntries((prev) => {
                                    const next = [...prev];
                                    next[i] = { ...next[i], visa: e.target.value };
                                    return next;
                                  });
                                }}
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              >
                                <option value="">Select</option>
                                {VISA_TYPES.map((v) => (
                                  <option key={v} value={v}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-700">
                                Duration
                              </label>
                              <select
                                value={entry.duration}
                                onChange={(e) => {
                                  setPrevTravelEntries((prev) => {
                                    const next = [...prev];
                                    next[i] = { ...next[i], duration: e.target.value };
                                    return next;
                                  });
                                }}
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              >
                                <option value="">Select</option>
                                {PREV_TRAVEL_DURATION.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
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
                  <p className="text-xs font-medium text-slate-700">
                    Kisi country ki rejection hai?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHasRejection("yes")}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        hasRejection === "yes"
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasRejection("no");
                        setRejectionCountry("");
                        setRejectionReason("");
                      }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        hasRejection === "no"
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
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Country
                        </label>
                        <select
                          value={rejectionCountry}
                          onChange={(e) => setRejectionCountry(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">Select</option>
                          {TARGET_COUNTRIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Reason
                        </label>
                        <select
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">Select</option>
                          {REJECTION_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                    Action <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select</option>
                    {INTERESTED_ACTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              loading ||
              (!canConfirmNoPassport && !canConfirmYesPassport)
            }
            className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "Saving..."
              : isNoPassport
                ? "Move to Review"
                : "Save & Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
