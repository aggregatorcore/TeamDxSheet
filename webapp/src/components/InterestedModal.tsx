"use client";

import { useEffect, useState } from "react";
import { NO_PASSPORT_SCRIPT } from "@/lib/constants";
import { InterestedFormContent, type InterestedFormValues } from "./InterestedFormContent";

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
  const [formValues, setFormValues] = useState<InterestedFormValues>(() => ({
    ...defaultFormValues,
    name: leadName,
    place: leadPlace,
  }));

  const isNoPassport = passport === "no";
  const isYesPassport = passport === "yes";
  const isNowWorkingYes = formValues.nowWorking === "yes";
  const isPrevTravelerYes = formValues.previousTraveler === "yes";
  const isHasRejectionYes = formValues.hasRejection === "yes";

  const canConfirmNoPassport = isNoPassport;
  const canConfirmYesPassport = isYesPassport && formValues.action.trim().length > 0;

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
      const v = formValues;
      const result: InterestedResult = {
        hasPassport: true,
        action: v.action.trim(),
      };
      if (v.name.trim()) result.name = v.name.trim();
      if (v.place.trim()) result.place = v.place.trim();
      if (v.qualification.trim()) result.qualification = v.qualification.trim();
      if (isNowWorkingYes) {
        result.nowWorking = true;
        if (v.tradeField.trim()) result.tradeField = v.tradeField.trim();
      }
      if (v.workExpFrom.trim()) {
        result.workExperience = `${v.workExpFrom} years`;
        result.workExpFrom = v.workExpFrom.trim();
      }
      if (v.targetCountry.trim()) result.targetCountry = v.targetCountry.trim();
      if (v.visaType.trim()) result.visaType = v.visaType.trim();
      if (v.budgetFrom.trim()) {
        result.budget = v.budgetFrom.trim();
        result.budgetFrom = v.budgetFrom.trim();
      }
      if (isPrevTravelerYes) {
        result.previousTraveler = true;
        const entries = v.prevTravelEntries
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
        if (v.rejectionCountry.trim()) result.rejectionCountry = v.rejectionCountry.trim();
        if (v.rejectionReason.trim()) result.rejectionReason = v.rejectionReason.trim();
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
    setFormValues({ ...defaultFormValues, name: leadName, place: leadPlace });
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

          {/* Yes passport - full form (same as LeadDetailModal edit) */}
          {isYesPassport && (
            <>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-emerald-700 underline hover:no-underline"
              >
                Back
              </button>
              <InterestedFormContent
                value={formValues}
                onChange={(updates) => setFormValues((prev) => ({ ...prev, ...updates }))}
                leadPlace={leadPlace}
                showAction={true}
              />
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
