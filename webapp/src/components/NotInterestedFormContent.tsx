"use client";

import { useState } from "react";
import { NOT_INTERESTED_REASONS, NOT_INTERESTED_OTHER_MIN_CHARS } from "@/types/lead";
import { ACTION_LABELS, PREFERRED_COUNTRIES, INDIA_STATES_AND_TERRITORIES } from "@/lib/constants";

export interface NotInterestedResult {
  reason: string;
  budget?: string;
  preferredCountry?: string;
  appliedCountry?: string;
  consultancyName?: string;
  charges?: string;
  trustIssueFraud?: "yes" | "no";
  trustIssueFraudCountry?: string;
  trustIssueFraudAmount?: string;
  trustIssueNote?: string;
  clientLocation?: string;
  clientLocationNote?: string;
}

export interface NotInterestedFormContentProps {
  onConfirm: (result: NotInterestedResult) => Promise<void>;
  onBack?: () => void;
}

export function NotInterestedFormContent({
  onConfirm,
  onBack,
}: NotInterestedFormContentProps) {
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherText, setOtherText] = useState("");
  const [budget, setBudget] = useState("");
  const [preferredCountry, setPreferredCountry] = useState("");
  const [appliedCountry, setAppliedCountry] = useState("");
  const [consultancyName, setConsultancyName] = useState("");
  const [charges, setCharges] = useState("");
  const [trustIssueFraud, setTrustIssueFraud] = useState<"yes" | "no" | "">("");
  const [trustIssueFraudCountry, setTrustIssueFraudCountry] = useState("");
  const [trustIssueFraudAmount, setTrustIssueFraudAmount] = useState("");
  const [trustIssueNote, setTrustIssueNote] = useState("");
  const [clientLocation, setClientLocation] = useState("");
  const [clientLocationNote, setClientLocationNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isOther = selectedReason === "Other";
  const isBudgetIssue = selectedReason === "Budget issue";
  const isAlreadyApplied = selectedReason === "Already applied to another consultancy";
  const isTrustIssue = selectedReason === "Trust issue";
  const isClientLocationTooFar = selectedReason === "Client location too far";
  const canConfirm =
    selectedReason &&
    (!isOther || otherText.trim().length >= NOT_INTERESTED_OTHER_MIN_CHARS) &&
    (!isBudgetIssue || (budget.trim() && preferredCountry.trim())) &&
    (!isTrustIssue || trustIssueNote.trim().length > 0) &&
    (!isClientLocationTooFar || (clientLocation.trim().length > 0 && clientLocationNote.trim().length > 0));

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setError(null);
    const reason = isOther ? otherText.trim() : selectedReason;
    const result: NotInterestedResult = { reason };
    if (isBudgetIssue) {
      result.budget = budget.trim();
      result.preferredCountry = preferredCountry.trim();
    }
    if (isAlreadyApplied) {
      if (appliedCountry.trim()) result.appliedCountry = appliedCountry.trim();
      if (consultancyName.trim()) result.consultancyName = consultancyName.trim();
      if (charges.trim()) result.charges = charges.trim();
    }
    if (isTrustIssue) {
      result.trustIssueNote = trustIssueNote.trim();
      if (trustIssueFraud) result.trustIssueFraud = trustIssueFraud;
      if (trustIssueFraud === "yes") {
        if (trustIssueFraudCountry.trim()) result.trustIssueFraudCountry = trustIssueFraudCountry.trim();
        if (trustIssueFraudAmount.trim()) result.trustIssueFraudAmount = trustIssueFraudAmount.trim();
      }
    }
    if (isClientLocationTooFar) {
      result.clientLocation = clientLocation.trim();
      result.clientLocationNote = clientLocationNote.trim();
    }
    setLoading(true);
    try {
      await onConfirm(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleReasonChange = (reason: string) => {
    setSelectedReason(reason);
    setOtherText("");
    setBudget("");
    setPreferredCountry("");
    setAppliedCountry("");
    setConsultancyName("");
    setCharges("");
    setTrustIssueFraud("");
    setTrustIssueFraudCountry("");
    setTrustIssueFraudAmount("");
    setTrustIssueNote("");
    setClientLocation("");
    setClientLocationNote("");
    setError(null);
  };

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-700">Reason</p>
        <div className="flex flex-wrap gap-2">
          {NOT_INTERESTED_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleReasonChange(r)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                selectedReason === r
                  ? "border-slate-500 bg-slate-200 text-slate-900 ring-2 ring-slate-500/30"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {isAlreadyApplied && (
        <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 space-y-3">
          <p className="text-xs font-medium text-sky-900">Details <span className="text-sky-600 font-normal">(optional)</span></p>
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-sky-800">Country applied for</label>
              <select value={appliedCountry} onChange={(e) => { setAppliedCountry(e.target.value); setError(null); }} className="w-full rounded-lg border border-sky-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20">
                <option value="">Select (optional)</option>
                {Object.entries(PREFERRED_COUNTRIES).map(([category, countries]) => (
                  <optgroup key={category} label={category}>{countries.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-sky-800">Consultancy name</label>
              <input type="text" value={consultancyName} onChange={(e) => { setConsultancyName(e.target.value); setError(null); }} placeholder="e.g. ABC Consultants" className="w-full rounded-lg border border-sky-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-sky-800">Charges</label>
              <input type="text" value={charges} onChange={(e) => { setCharges(e.target.value); setError(null); }} placeholder="e.g. 50,000" className="w-full rounded-lg border border-sky-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
            </div>
          </div>
        </div>
      )}
      {isTrustIssue && (
        <div className="space-y-3">
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 space-y-3">
            <p className="text-xs font-medium text-rose-900">Previously faced fraud?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setTrustIssueFraud("yes"); setError(null); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${trustIssueFraud === "yes" ? "border-2 border-rose-500 bg-rose-100 text-rose-900 ring-2 ring-rose-500/30" : "border border-rose-200 bg-white text-slate-700 hover:bg-rose-50"}`}>Yes</button>
              <button type="button" onClick={() => { setTrustIssueFraud("no"); setTrustIssueFraudCountry(""); setTrustIssueFraudAmount(""); setError(null); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${trustIssueFraud === "no" ? "border-2 border-rose-500 bg-rose-100 text-rose-900 ring-2 ring-rose-500/30" : "border border-rose-200 bg-white text-slate-700 hover:bg-rose-50"}`}>No</button>
            </div>
            {trustIssueFraud === "yes" && (
              <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-rose-200">
                <div>
                  <label className="mb-1 block text-xs font-medium text-rose-800">Country</label>
                  <select value={trustIssueFraudCountry} onChange={(e) => { setTrustIssueFraudCountry(e.target.value); setError(null); }} className="w-full rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20">
                    <option value="">Select</option>
                    {Object.entries(PREFERRED_COUNTRIES).map(([category, countries]) => (
                      <optgroup key={category} label={category}>{countries.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-rose-800">Amount</label>
                  <input type="text" value={trustIssueFraudAmount} onChange={(e) => { setTrustIssueFraudAmount(e.target.value); setError(null); }} placeholder="e.g. 50,000" className="w-full rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
                </div>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
            <label className="mb-1 block text-xs font-medium text-rose-900">What trust issue do you have with us?</label>
            <textarea value={trustIssueNote} onChange={(e) => { setTrustIssueNote(e.target.value); setError(null); }} placeholder="Describe the trust issue..." rows={2} className="w-full rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none" />
          </div>
        </div>
      )}
      {isClientLocationTooFar && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-3">
          <p className="text-xs font-medium text-emerald-900">Client location</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-emerald-800">State / Territory</label>
            <select value={clientLocation} onChange={(e) => { setClientLocation(e.target.value); setError(null); }} className="w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value="">Select state / territory</option>
              {Object.entries(INDIA_STATES_AND_TERRITORIES).map(([group, items]) => (
                <optgroup key={group} label={group}>{items.map((s) => <option key={s} value={s}>{s}</option>)}</optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-emerald-800">Note</label>
            <textarea value={clientLocationNote} onChange={(e) => { setClientLocationNote(e.target.value); setError(null); }} placeholder="Additional details..." rows={2} className="w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none" />
          </div>
        </div>
      )}
      {isBudgetIssue && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-3">
          <p className="text-xs font-medium text-amber-900">Additional details</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-amber-800">Budget</label>
              <input type="text" value={budget} onChange={(e) => { setBudget(e.target.value); setError(null); }} placeholder="e.g. 5-10 Lakh" className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-amber-800">Preferred country</label>
              <select value={preferredCountry} onChange={(e) => { setPreferredCountry(e.target.value); setError(null); }} className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                <option value="">Select</option>
                {Object.entries(PREFERRED_COUNTRIES).map(([category, countries]) => (
                  <optgroup key={category} label={category}>{countries.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      {isOther && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Please specify <span className="text-slate-500 font-normal">(min {NOT_INTERESTED_OTHER_MIN_CHARS} chars)</span></label>
          <textarea value={otherText} onChange={(e) => { setOtherText(e.target.value); setError(null); }} placeholder="Enter reason..." rows={2} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 resize-none" />
          <p className={`mt-1 text-xs ${otherText.length >= NOT_INTERESTED_OTHER_MIN_CHARS ? "text-emerald-600" : "text-slate-500"}`}>{otherText.length} / {NOT_INTERESTED_OTHER_MIN_CHARS}</p>
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      <div className="flex gap-2 pt-0">
        {onBack && (
          <button type="button" onClick={onBack} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors">Back</button>
        )}
        <button type="button" onClick={handleConfirm} disabled={loading || !canConfirm} className={`rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${onBack ? "flex-1" : "flex-1"}`}>{loading ? "Moving..." : ACTION_LABELS.move_review}</button>
      </div>
    </div>
  );
}
