"use client";

import { useEffect, useState } from "react";
import { ACTION_LABELS, BUCKET_LABELS, NO_PASSPORT_SCRIPT } from "@/lib/constants";
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
  /** When provided, Back at root step goes to previous modal (one step). */
  onBack?: () => void;
  onConfirm: (result: InterestedResult) => Promise<void>;
}

export function InterestedModal({
  leadName,
  leadPlace = "",
  leadNumber,
  onClose,
  onBack,
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

  const handleBack = () => {
    if (passport) setPassport("");
    else if (onBack) onBack();
    else onClose();
  };
  const showBackButton = passport !== "" || !!onBack;
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
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex shrink-0 items-center gap-2 bg-gradient-to-br from-slate-700 to-slate-800 px-4 py-3">
          {showBackButton ? (
            <button
              type="button"
              onClick={handleBack}
              className="shrink-0 rounded p-1.5 text-white/90 hover:bg-white/20 transition-colors"
              aria-label="Back"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          ) : (
            <span className="w-9 shrink-0" aria-hidden />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Interested / Connect</h2>
              <p className="text-xs text-slate-300">
                {!passport
                  ? "Collect client details"
                  : isNoPassport
                    ? `Lead will go to ${BUCKET_LABELS.review}`
                    : "Complete the form"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 bg-red-500 text-white hover:bg-red-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto flex-1">
          {/* Step 1: Passport */}
          {!passport && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-3">
              <p className="text-sm font-medium text-emerald-900">
                Does the client have a passport?
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
                On confirm, the lead will move to the {BUCKET_LABELS.review} bucket.
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
        <div className="p-4 pt-0 shrink-0">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              loading ||
              (!canConfirmNoPassport && !canConfirmYesPassport)
            }
            className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "Saving..."
              : isNoPassport
                ? ACTION_LABELS.move_review
                : "Save & Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
