"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Lead, TagOption } from "@/types/lead";
import { TAGS_SCHEDULEABLE_CALLBACK } from "@/types/lead";
import { CallbackModal } from "./CallbackModal";
import { WhatsAppModal } from "./WhatsAppModal";
import { WhatsAppFollowupModal } from "./WhatsAppFollowupModal";
import { InvalidNumberModal } from "./InvalidNumberModal";
import { NotInterestedModal } from "./NotInterestedModal";
import { InterestedModal } from "./InterestedModal";
import { InterestedFollowupModal } from "./InterestedFollowupModal";
import { GreenBucketAnimationOverlay } from "./GreenBucketAnimationOverlay";
import { ExhaustAnimationOverlay } from "./ExhaustAnimationOverlay";
import { ReviewAnimationOverlay } from "./ReviewAnimationOverlay";
import { CallbackCountdown } from "./CallbackCountdown";
import { LeadDetailModal } from "./LeadDetailModal";
import { NoteEditModal } from "./NoteEditModal";
import { CallDialModal } from "./CallDialModal";
import { CallbackReminderModal } from "./CallbackReminderModal";
import { OverdueCallModal } from "./OverdueCallModal";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { useCountdown } from "@/hooks/useCountdown";
import { ACTION_LABELS, ACTION_NOTE_PREFIX, BLINK_BEFORE_SECONDS, CALL_NOW_LABEL, GRACE_PERIOD_HOURS, INTERESTED_ACTION_DEFAULT_FOLLOWUP_1HR, NO_PASSPORT_SCRIPT, SUBTAG_TEXT_COLORS, TAG_TEXT_COLORS, WHATSAPP_FOLLOWUP_HOURS } from "@/lib/constants";
import { appendTagHistory, getEffectiveTag, getTagHistory, getWhatsAppSubTag } from "@/lib/leadNote";

/** Live countdown to 1hr from mount, with date. Same alignment as CallbackCountdown: badge + countdown row, date row. Badge is clickable when onFollowupClick is provided. */
function Default1hrCountdown({ onFollowupClick }: { onFollowupClick?: () => void }) {
  const [targetTime] = useState(() => new Date(Date.now() + WHATSAPP_FOLLOWUP_HOURS * 60 * 60 * 1000).toISOString());
  const countdown = useCountdown(targetTime);
  const dateLabel = (() => {
    const ms = new Date(targetTime).getTime();
    return Number.isFinite(ms) ? new Date(ms).toLocaleString() : "—";
  })();
  const badgeClass = "shrink-0 rounded border border-emerald-600 bg-emerald-700 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-emerald-600";
  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-nowrap items-center gap-1">
        {onFollowupClick ? (
          <button type="button" onClick={onFollowupClick} className={badgeClass}>
            {ACTION_LABELS.followup}
          </button>
        ) : (
          <span className={badgeClass}>1h</span>
        )}
        <span className="min-w-[3rem] font-mono text-xs font-medium text-neutral-700">
          {countdown || "—"}
        </span>
      </div>
      <span className="text-[10px] text-neutral-500">{dateLabel}</span>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface LeadTableProps {
  leads: Lead[];
  onRefresh: () => void;
  onLeadUpdate?: (id: string, updates: Partial<Lead>) => void;
  onGreenBucketComplete?: () => void;
}

export function LeadTable({ leads, onRefresh, onLeadUpdate, onGreenBucketComplete }: LeadTableProps) {
  const router = useRouter();
  const [callbackLead, setCallbackLead] = useState<Lead | null>(null);
  const [whatsappLead, setWhatsappLead] = useState<Lead | null>(null);
  const [followupLead, setFollowupLead] = useState<Lead | null>(null);
  const [invalidLead, setInvalidLead] = useState<Lead | null>(null);
  const [notInterestedLead, setNotInterestedLead] = useState<Lead | null>(null);
  const [notInterestedFrom, setNotInterestedFrom] = useState<"callDial" | "callNow" | "callbackReminder" | "interestedFollowup" | null>(null);
  const [interestedLead, setInterestedLead] = useState<Lead | null>(null);
  const [interestedFollowupLead, setInterestedFollowupLead] = useState<Lead | null>(null);
  const [greenBucketLead, setGreenBucketLead] = useState<Lead | null>(null);
  const [greenBucketRect, setGreenBucketRect] = useState<DOMRect | null>(null);
  const [greenBucketPhase, setGreenBucketPhase] = useState<"move" | "slide">("move");
  const [exhaustingLead, setExhaustingLead] = useState<Lead | null>(null);
  const [exhaustRect, setExhaustRect] = useState<DOMRect | null>(null);
  const [exhaustPhase, setExhaustPhase] = useState<"move" | "slide">("move");
  const [reviewingLead, setReviewingLead] = useState<Lead | null>(null);
  const [reviewRect, setReviewRect] = useState<DOMRect | null>(null);
  const [reviewPhase, setReviewPhase] = useState<"move" | "slide">("move");
  const [, setUpdating] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [noteEditLead, setNoteEditLead] = useState<Lead | null>(null);
  const [callDialLead, setCallDialLead] = useState<Lead | null>(null);
  const [callbackReminderLead, setCallbackReminderLead] = useState<Lead | null>(null);
  const [callNowLead, setCallNowLead] = useState<Lead | null>(null);
  const [overdueCallLead, setOverdueCallLead] = useState<Lead | null>(null);
  const [callbackReminderFromOverdue, setCallbackReminderFromOverdue] = useState(false);

  const handleExhaustMoveComplete = useCallback(() => {
    setExhaustPhase("slide");
  }, []);

  const handleReviewMoveComplete = useCallback(() => {
    setReviewPhase("slide");
  }, []);

  const handleGreenBucketMoveComplete = useCallback(() => {
    setGreenBucketPhase("slide");
  }, []);

  useEffect(() => {
    if (exhaustPhase !== "slide") return;
    const t = setTimeout(() => {
      setExhaustingLead(null);
      setExhaustRect(null);
      setExhaustPhase("move");
      onRefresh();
    }, 1200);
    return () => clearTimeout(t);
  }, [exhaustPhase, onRefresh]);

  useEffect(() => {
    if (reviewPhase !== "slide") return;
    const t = setTimeout(() => {
      setReviewingLead(null);
      setReviewRect(null);
      setReviewPhase("move");
      onRefresh();
    }, 1200);
    return () => clearTimeout(t);
  }, [reviewPhase, onRefresh]);

  useEffect(() => {
    if (greenBucketPhase !== "slide") return;
    const t = setTimeout(() => {
      setGreenBucketLead(null);
      setGreenBucketRect(null);
      setGreenBucketPhase("move");
      onRefresh();
      if (onGreenBucketComplete) {
        onGreenBucketComplete();
      } else {
        router.push("/dashboard/green");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [greenBucketPhase, onRefresh, router, onGreenBucketComplete]);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const hasCallbacks = leads.some((l) => l.callbackTime);
  useCurrentTime(!!hasCallbacks);

  /** WhatsApp Flow Active tag: tag + callback, or legacy Incoming Off + whatsappFollowupStartedAt / tags "WhatsApp No Reply". */
  const isWhatsAppFollowupLead = (l: Lead) =>
    !!l.callbackTime &&
    (l.tags === "WhatsApp Flow Active" ||
      (l.tags === "Incoming Off" && !!l.whatsappFollowupStartedAt) ||
      (l as { tags: string }).tags === "WhatsApp No Reply");
  const isFollowupActive = (l: Lead) =>
    !!l.callbackTime && (l.tags === "Incoming Off" || l.tags === "WhatsApp Flow Active");

  /** Blink starts 30 sec before callback, until grace period ends */
  const isBlinkTime = (cb: string) => {
    if (!cb) return false;
    const d = new Date(cb).getTime();
    const now = Date.now();
    const blinkStart = d - BLINK_BEFORE_SECONDS * 1000;
    const graceEnd = d + GRACE_PERIOD_HOURS * 60 * 60 * 1000;
    return now >= blinkStart && now <= graceEnd;
  };

  /** True if lead is overdue: backend says so OR callbackTime + grace has passed (global rule) */
  const isOverdue = (l: Lead) => {
    if (l.category === "overdue") return true;
    if (!l.callbackTime) return false;
    const graceEnd = new Date(l.callbackTime).getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000;
    return Date.now() > graceEnd;
  };

  const isCallbackTime = (cb: string) => {
    if (!cb) return false;
    const d = new Date(cb);
    const now = new Date();
    return d <= now && now <= new Date(d.getTime() + 2 * 60 * 60 * 1000);
  };

  const blinkingLeadId = leads.find((l) => l.callbackTime && isBlinkTime(l.callbackTime))?.id;
  const scrolledToRef = useRef<string | null>(null);

  /** Overdue at very top, then blinking, then callback, then rest (overdue = global rule) */
  const sortedLeads = [...leads].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    const aBlink = a.callbackTime && isBlinkTime(a.callbackTime);
    const bBlink = b.callbackTime && isBlinkTime(b.callbackTime);
    if (aBlink && !bBlink) return -1;
    if (!aBlink && bBlink) return 1;
    if (aBlink && bBlink) {
      const aTime = new Date(a.callbackTime!).getTime();
      const bTime = new Date(b.callbackTime!).getTime();
      return aTime - bTime;
    }
    if (a.category === "callback" && b.category !== "callback") return -1;
    if (a.category !== "callback" && b.category === "callback") return 1;
    return 0;
  });

  const firstOverdueLeadId = sortedLeads.find((l) => isOverdue(l))?.id ?? null;
  const prevFirstOverdueRef = useRef<string | null>(null);

  useEffect(() => {
    if (!firstOverdueLeadId) {
      prevFirstOverdueRef.current = null;
      return;
    }
    if (prevFirstOverdueRef.current === firstOverdueLeadId) return;
    prevFirstOverdueRef.current = firstOverdueLeadId;
    const row = rowRefs.current[firstOverdueLeadId];
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [firstOverdueLeadId]);

  useEffect(() => {
    if (!blinkingLeadId || scrolledToRef.current === blinkingLeadId) return;
    scrolledToRef.current = blinkingLeadId;
    rowRefs.current[blinkingLeadId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [blinkingLeadId]);

  useEffect(() => {
    if (!blinkingLeadId) scrolledToRef.current = null;
  }, [blinkingLeadId]);

  useEffect(() => {
    if (exhaustingLead) {
      rowRefs.current[exhaustingLead.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [exhaustingLead]);

  useEffect(() => {
    if (reviewingLead) {
      rowRefs.current[reviewingLead.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [reviewingLead]);

  useEffect(() => {
    if (greenBucketLead) {
      rowRefs.current[greenBucketLead.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [greenBucketLead]);

  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const bodyTableRef = useRef<HTMLTableElement>(null);

  /* Column widths: ID, Source, Name, Place, Number, Flow/Tag/Action, Sub tags, Notes (manual edit icon) */
  const colWidths = ["8%", "9%", "11%", "9%", "11%", "27%", "20%", "5%"];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-lg">
      {/* Single table with sticky header - header and body always aligned */}
      <div ref={bodyScrollRef} className="min-h-0 flex-1 overflow-auto rounded-b-lg">
        <table
          ref={bodyTableRef}
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
            <col style={{ width: colWidths[7] }} />
          </colgroup>
          <thead>
            <tr>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap rounded-tl-lg border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">ID</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Source</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Name</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Place</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Number</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Flow / Tag / Action</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Sub tags</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap rounded-tr-lg border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-1.5 py-1.5 text-left text-[11px] font-semibold text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]" title="Notes">
                <span className="inline-flex items-center justify-center w-full">
                  <svg className="h-3.5 w-3.5 shrink-0 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-200 bg-white">
          {sortedLeads.map((lead) => {
            const shouldBlink = lead.callbackTime && isBlinkTime(lead.callbackTime);
            const isExhausting = exhaustingLead?.id === lead.id;
            const isReviewing = reviewingLead?.id === lead.id;
            const isGreenBucketing = greenBucketLead?.id === lead.id;
            const exhaustRowClass = isExhausting
              ? exhaustPhase === "move"
                ? "animate-exhaust-blink"
                : "animate-exhaust-slide-out"
              : null;
            const reviewRowClass = isReviewing
              ? reviewPhase === "move"
                ? "animate-review-blink"
                : "animate-review-slide-out"
              : null;
            const greenBucketRowClass = isGreenBucketing
              ? greenBucketPhase === "move"
                ? "animate-green-blink"
                : "animate-green-slide-out"
              : null;
            const flowNorm = String(lead.flow ?? "").trim().toLowerCase();
            const tagsNorm = String(lead.tags ?? "").trim();
            const scheduleableTag = lead.tags !== "" && TAGS_SCHEDULEABLE_CALLBACK.includes(lead.tags as TagOption);
            const incompleteNotConnected = (flowNorm === "not connected" || flowNorm === "select") && scheduleableTag && !lead.callbackTime;
            // Fresh = no tag yet (incl. legacy "Select"), or incomplete Not Connected → row click opens dial modal
            const isFresh =
              (tagsNorm === "" && (flowNorm === "" || flowNorm === "connected" || flowNorm === "select")) ||
              incompleteNotConnected;
            const effectiveTag = getEffectiveTag(lead.note, lead.tags);
            const displayTag = isWhatsAppFollowupLead(lead) ? "WhatsApp Flow Active" : effectiveTag;
            const displaySubTag = isWhatsAppFollowupLead(lead)
              ? getWhatsAppSubTag(lead.note) || (lead.tags === "Incoming Off" && lead.whatsappFollowupStartedAt ? "WhatsApp No Reply" : "")
              : "";
            const tagHistory = getTagHistory(lead.note);
            const hasIncomingOffInCycle = tagHistory.some((entry) => entry.startsWith("Incoming Off"));
            // Show [Incoming Off] ↔ [WhatsApp Flow Active] when we're showing WhatsApp Flow Active with callback (countdown or overdue), or when Not Connected + followup with Incoming Off in history.
            const showIncomingOffCollaborate =
              displayTag !== "Incoming Off" &&
              (hasIncomingOffInCycle || displayTag === "WhatsApp Flow Active") &&
              (lead.flow === "Not Connected" || displayTag === "WhatsApp Flow Active") &&
              (displayTag === "WhatsApp Flow Active" && !!lead.callbackTime
                ? true
                : isFollowupActive(lead));
            const isIncomingOffClickable =
              lead.flow === "Not Connected" && effectiveTag === "Incoming Off";
            const isRowClickable =
              isFresh || isOverdue(lead) || lead.callbackTime || isIncomingOffClickable;
            return (
            <tr
              key={lead.id}
              ref={(el) => {
                rowRefs.current[lead.id] = el;
              }}
              role={isRowClickable ? "button" : undefined}
              tabIndex={isRowClickable ? 0 : undefined}
              onClick={() => {
                // Overdue: Incoming Off → open WhatsApp (Try WhatsApp); others → OverdueCallModal (call now)
                if (isOverdue(lead)) {
                  if (effectiveTag === "Incoming Off") setWhatsappLead(lead);
                  else setOverdueCallLead(lead);
                } else if (isFresh) setCallDialLead(lead);
                else if (isIncomingOffClickable) setWhatsappLead(lead);
                else if (lead.tags === "Interested" && lead.callbackTime) setInterestedFollowupLead(lead);
                else if (lead.callbackTime) setCallbackReminderLead(lead);
              }}
              onKeyDown={
                isRowClickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (isOverdue(lead)) {
                          if (effectiveTag === "Incoming Off") setWhatsappLead(lead);
                          else setOverdueCallLead(lead);
                        } else if (isFresh) setCallDialLead(lead);
                        else if (isIncomingOffClickable) setWhatsappLead(lead);
                        else if (lead.tags === "Interested" && lead.callbackTime) setInterestedFollowupLead(lead);
                        else if (lead.callbackTime) setCallbackReminderLead(lead);
                      }
                    }
                  : undefined
              }
              className={`group transition-colors duration-150 ${
                isRowClickable ? "cursor-pointer " : ""
              }${
                exhaustRowClass ?? reviewRowClass ?? greenBucketRowClass ??
                  (isOverdue(lead)
                    ? "animate-overdue-blink hover:!bg-red-100"
                    : shouldBlink
                      ? "animate-callback-blink hover:!bg-amber-100"
                      : lead.category === "callback"
                        ? "bg-amber-50 hover:bg-amber-100"
                        : isIncomingOffClickable
                          ? "hover:bg-sky-50"
                          : "hover:bg-slate-50")
              }`}
            >
              <td
                className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-200 px-2 py-1.5 text-xs font-mono text-slate-900 transition-colors duration-150 ${
                  isOverdue(lead)
                    ? "bg-transparent group-hover:!bg-red-100"
                    : shouldBlink
                      ? "bg-transparent group-hover:!bg-amber-100"
                      : lead.category === "callback"
                        ? "bg-amber-50 group-hover:bg-amber-100"
                        : isIncomingOffClickable
                          ? "bg-white group-hover:bg-sky-50"
                          : "bg-white group-hover:bg-slate-50"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1">
                  <span>{lead.id.slice(0, 8)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailLead(lead);
                    }}
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
              <td className="overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-200 px-2 py-1.5 text-xs text-slate-800">{lead.source}</td>
              <td className="overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-200 px-2 py-1.5 text-xs text-slate-800">{lead.name}</td>
              <td className="overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-200 px-2 py-1.5 text-xs text-slate-800">{lead.place}</td>
              <td className="overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-200 px-2 py-1.5 text-xs text-slate-800">
                {lead.number.includes(" (Calling)") || lead.number.includes(" (WhatsApp)") ? (
                  <div className="flex flex-col gap-0.5">
                    {lead.number.split(", ").map((part, i) => (
                      <span key={i}>{part}</span>
                    ))}
                  </div>
                ) : (
                  lead.number
                )}
              </td>
              <td className="overflow-hidden border-r-2 border-slate-200 px-2 py-1.5 align-middle">
                {/* Single line: tag, action note, badges, buttons, countdown */}
                <div className="flex min-w-0 flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {(!isFresh || lead.callbackTime) && !(isOverdue(lead) && lead.callbackTime && lead.tags !== "Interested" && !isWhatsAppFollowupLead(lead)) && (
                    <>
                    {showIncomingOffCollaborate ? (
                      <>
                        <span className="inline-flex flex-nowrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 shadow-sm">
                          <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TAG_TEXT_COLORS["Incoming Off"]}`}>
                            Incoming Off
                          </span>
                          <span title="Collaborate" className="shrink-0 inline-flex">
                            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <circle cx="6" cy="12" r="2" strokeWidth={2} />
                              <circle cx="18" cy="12" r="2" strokeWidth={2} />
                              <path strokeLinecap="round" strokeWidth={2} d="M8 12h8" />
                            </svg>
                          </span>
                          <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TAG_TEXT_COLORS["WhatsApp Flow Active"]}`}>
                            <WhatsAppIcon className="h-3.5 w-3.5" />
                            WhatsApp Flow Active
                          </span>
                        </span>
                        {lead.callbackTime && isWhatsAppFollowupLead(lead) && (
                          <span className="h-4 w-px shrink-0 bg-slate-200" aria-hidden />
                        )}
                      </>
                    ) : (
                    <span
                      className={
                        displayTag
                          ? `inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TAG_TEXT_COLORS[displayTag as TagOption] ?? SUBTAG_TEXT_COLORS[displayTag] ?? "text-neutral-700"}`
                          : "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-neutral-500"
                      }
                    >
                      {displayTag || "—"}
                    </span>
                    )}
                    {isOverdue(lead) && (
                      <span className="h-4 w-px shrink-0 bg-red-200" aria-hidden />
                    )}
                    </>
                  )}
                    {/* WhatsApp No Reply + callback: single action = Followup (countdown + button). No Callback badge. */}
                    {lead.callbackTime && isWhatsAppFollowupLead(lead) && (
                      <span className="inline-flex flex-nowrap items-center rounded-lg border border-violet-200/80 bg-violet-50/70 px-2 py-1 shadow-sm">
                        <CallbackCountdown
                          callbackTime={lead.callbackTime}
                          isBlinking={!!(lead.callbackTime && isBlinkTime(lead.callbackTime))}
                          badgeLabel={ACTION_LABELS.followup}
                          inline
                          renderCallNow={
                            <button
                              type="button"
                              onClick={() => setFollowupLead(lead)}
                              className="w-fit rounded bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm hover:bg-violet-600"
                            >
                              {ACTION_LABELS.followup}
                            </button>
                          }
                        />
                      </span>
                    )}
                    {/* No Answer cycle etc. + callback: single action = Callback only. Overdue = one card (tag + overdue block). */}
                    {lead.callbackTime && lead.tags !== "Interested" && !isWhatsAppFollowupLead(lead) && (
                      isOverdue(lead) ? (
                        <span className="inline-flex min-w-0 max-w-full flex-nowrap items-center gap-2 rounded-lg border border-red-200 bg-red-50/80 px-2 py-1 shadow-sm">
                          <span
                            className={
                              displayTag
                                ? `inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TAG_TEXT_COLORS[displayTag as TagOption] ?? SUBTAG_TEXT_COLORS[displayTag] ?? "text-neutral-700"}`
                                : "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-neutral-500"
                            }
                          >
                            {displayTag || "—"}
                          </span>
                          <span className="h-4 w-px shrink-0 bg-red-200" aria-hidden />
                          <CallbackCountdown
                            callbackTime={lead.callbackTime}
                            isBlinking={!!(lead.callbackTime && isBlinkTime(lead.callbackTime))}
                            inline
                            renderCallNow={
                              <button
                                type="button"
                                onClick={() => setCallNowLead(lead)}
                                className="w-fit rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 hover:bg-amber-500"
                              >
                                {CALL_NOW_LABEL}
                              </button>
                            }
                          />
                        </span>
                      ) : (
                        <CallbackCountdown
                          callbackTime={lead.callbackTime}
                          isBlinking={!!(lead.callbackTime && isBlinkTime(lead.callbackTime))}
                          inline
                          renderCallNow={
                            <button
                              type="button"
                              onClick={() => setCallNowLead(lead)}
                              className="w-fit rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 hover:bg-amber-500"
                            >
                              {CALL_NOW_LABEL}
                            </button>
                          }
                        />
                      )
                    )}
                    {lead.tags === "Interested" && lead.note && (() => {
                      const actionParts = lead.note.split(" | ").filter((p) => p.startsWith(ACTION_NOTE_PREFIX));
                      const actionPart = actionParts.length > 0 ? actionParts[actionParts.length - 1] : undefined;
                      const action = actionPart?.startsWith(ACTION_NOTE_PREFIX) ? actionPart.slice(ACTION_NOTE_PREFIX.length).trim() : actionPart?.trim();
                      const isDefaultFollowupAction = action === INTERESTED_ACTION_DEFAULT_FOLLOWUP_1HR;
                      const showCountdown = lead.callbackTime || isDefaultFollowupAction;
                      return action ? (
                        <div className="inline-flex flex-wrap items-center gap-2">
                          {showCountdown &&
                            (lead.callbackTime ? (
                              <div className="flex flex-nowrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setInterestedFollowupLead(lead)}
                                  className="w-fit shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700"
                                >
                                  {ACTION_LABELS.followup}
                                </button>
                                <CallbackCountdown
                                  callbackTime={lead.callbackTime}
                                  isBlinking={!!(lead.callbackTime && isBlinkTime(lead.callbackTime))}
                                  badgeLabel=""
                                  inline
                                  renderCallNow={
                                    isCallbackTime(lead.callbackTime) ? (
                                      <button
                                        type="button"
                                        onClick={() => setCallbackReminderLead(lead)}
                                        className="w-fit rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 hover:bg-amber-500"
                                      >
                                        {CALL_NOW_LABEL}
                                      </button>
                                    ) : undefined
                                  }
                                />
                              </div>
                            ) : (
                              <Default1hrCountdown onFollowupClick={() => setInterestedFollowupLead(lead)} />
                            ))}
                          {!showCountdown && (
                            <button
                              type="button"
                              onClick={() => setInterestedFollowupLead(lead)}
                              className="w-fit shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700"
                            >
                              {ACTION_LABELS.followup}
                            </button>
                          )}
                        </div>
                      ) : null;
                    })()}
                </div>
              </td>
              <td className="max-w-0 overflow-hidden border-r-2 border-slate-200 px-2 py-1.5 align-middle text-xs text-slate-600" title={displaySubTag || undefined}>
                <span className="block min-w-0 truncate">
                  {displaySubTag}
                </span>
              </td>
              <td className="max-w-0 overflow-hidden border-r-2 border-slate-200 px-1.5 py-1.5 align-middle text-xs text-slate-600" onClick={(e) => e.stopPropagation()} title="Add or edit note">
                <div className="flex min-w-0 items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setNoteEditLead(lead)}
                    className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
                    title="Add or edit note"
                    aria-label="Add or edit note"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          );
          })}
        </tbody>
        </table>
      </div>

      {noteEditLead && (
        <NoteEditModal
          lead={noteEditLead}
          onClose={() => setNoteEditLead(null)}
          onSuccess={(updates) => {
            onLeadUpdate?.(noteEditLead.id, updates);
            onRefresh();
          }}
        />
      )}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onUpdate={(updates) => {
            setDetailLead((prev) => (prev ? { ...prev, ...updates } : null));
            onLeadUpdate?.(detailLead.id, updates);
          }}
          onScheduleCallback={(lead) => {
            setDetailLead(null);
            setCallbackLead(lead);
          }}
        />
      )}
      {callDialLead && (
        <CallDialModal
          lead={callDialLead}
          onClose={() => setCallDialLead(null)}
          onSuccess={onRefresh}
          onConnectInterested={(l) => {
            setCallDialLead(null);
            setInterestedLead(l);
          }}
          onConnectDocumentReceived={(l) => {
            setCallDialLead(null);
            fetch("/api/leads", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: l.id, tags: "Interested" }),
            }).then((res) => {
              if (res.ok) setInterestedFollowupLead({ ...l, tags: "Interested" });
              else setInterestedFollowupLead(l);
            }).catch(() => setInterestedFollowupLead(l));
          }}
          onConnectNotInterested={(l) => {
            setNotInterestedFrom("callDial");
            setCallDialLead(null);
            setNotInterestedLead(l);
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
              const rect = rowRefs.current[l.id]?.getBoundingClientRect() ?? null;
              setCallDialLead(null);
              setReviewPhase("move");
              setReviewingLead({ ...l, tags: "Not Interested" });
              setReviewRect(rect);
              onRefresh();
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
              const rect = rowRefs.current[l.id]?.getBoundingClientRect() ?? null;
              setCallDialLead(null);
              setReviewPhase("move");
              setReviewingLead({ ...l, tags: "Not Interested" });
              setReviewRect(rect);
              onRefresh();
            }
          }}
          onInvalidNumber={(l) => {
            setCallDialLead(null);
            setInvalidLead(l);
          }}
          onIncomingOffSaved={(updatedLead) => {
            setCallDialLead(null);
            onRefresh();
            setWhatsappLead(updatedLead);
          }}
        />
      )}
      {(callbackReminderLead || callNowLead) && (
        <CallbackReminderModal
          lead={callbackReminderLead ?? callNowLead!}
          entryStep={
            callbackReminderFromOverdue
              ? "result"
              : (() => {
                  const l = callbackReminderLead ?? callNowLead;
                  return l?.callbackTime && isBlinkTime(l.callbackTime) ? "callNow" : "reminder";
                })()
          }
          onClose={() => {
            setCallbackReminderFromOverdue(false);
            setCallbackReminderLead(null);
            setCallNowLead(null);
          }}
          onSuccess={() => {
            setCallbackReminderFromOverdue(false);
            setCallbackReminderLead(null);
            setCallNowLead(null);
            onRefresh();
          }}
          onConnectInterested={(l) => {
            setCallbackReminderFromOverdue(false);
            setCallbackReminderLead(null);
            setCallNowLead(null);
            setInterestedLead(l);
          }}
          onConnectNotInterested={(l) => {
            setNotInterestedFrom(callbackReminderLead ? "callbackReminder" : "callNow");
            setCallbackReminderFromOverdue(false);
            setCallbackReminderLead(null);
            setCallNowLead(null);
            setNotInterestedLead(l);
          }}
          onInvalidNumber={(l) => {
            setCallbackReminderFromOverdue(false);
            setCallbackReminderLead(null);
            setCallNowLead(null);
            setInvalidLead(l);
          }}
        />
      )}
      {overdueCallLead && (
        <OverdueCallModal
          lead={overdueCallLead}
          onClose={() => setOverdueCallLead(null)}
          onDial={(l) => {
            setOverdueCallLead(null);
            setCallbackReminderLead(l);
            setCallNowLead(null);
            setCallbackReminderFromOverdue(true);
          }}
        />
      )}
      {callbackLead && (
        <CallbackModal
          leadName={callbackLead.name}
          leadId={callbackLead.id}
          leadNumber={callbackLead.number}
          id={callbackLead.id}
          onClose={() => setCallbackLead(null)}
          onSuccess={onRefresh}
        />
      )}
      {whatsappLead && (
        <WhatsAppModal
          leadName={whatsappLead.name}
          number={whatsappLead.number}
          id={whatsappLead.id}
          note={whatsappLead.note}
          onClose={() => setWhatsappLead(null)}
          onSuccess={(movedToExhaust) => {
            if (movedToExhaust) {
              const rect = rowRefs.current[movedToExhaust.id]?.getBoundingClientRect() ?? null;
              setExhaustPhase("move");
              setExhaustingLead({
                ...whatsappLead,
                tags: movedToExhaust.tags as Lead["tags"],
              });
              setExhaustRect(rect);
            } else {
              onRefresh();
            }
            setWhatsappLead(null);
          }}
        />
      )}
      {followupLead && (
        <WhatsAppFollowupModal
          leadName={followupLead.name}
          number={followupLead.number}
          id={followupLead.id}
          whatsappFollowupStartedAt={followupLead.whatsappFollowupStartedAt}
          onClose={() => setFollowupLead(null)}
          onSuccess={onRefresh}
        />
      )}
      {notInterestedLead && (
        <NotInterestedModal
          leadName={notInterestedLead.name}
          leadNumber={notInterestedLead.number}
          id={notInterestedLead.id}
          onClose={() => {
            setNotInterestedFrom(null);
            setNotInterestedLead(null);
          }}
          onBack={
            notInterestedFrom
              ? () => {
                  const lead = notInterestedLead;
                  setNotInterestedLead(null);
                  setNotInterestedFrom(null);
                  if (lead && notInterestedFrom === "callDial") setCallDialLead(lead);
                  if (lead && notInterestedFrom === "callNow") setCallNowLead(lead);
                  if (lead && notInterestedFrom === "callbackReminder") setCallbackReminderLead(lead);
                  if (lead && notInterestedFrom === "interestedFollowup") setInterestedFollowupLead(lead);
                }
              : undefined
          }
          onConfirm={async (result) => {
            const isBudgetIssue = result.reason === "Budget issue" && result.budget && result.preferredCountry;
            if (isBudgetIssue) {
              const note = appendTagHistory(
                `Not Interested: Budget issue - Budget: ${result.budget}, Preferred Country: ${result.preferredCountry}`,
                "Not Interested"
              );
              const res = await fetch("/api/leads", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: notInterestedLead.id,
                  tags: "Not Interested",
                  note,
                  moveToReview: true,
                }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed (${res.status})`);
              }
              const rect = rowRefs.current[notInterestedLead.id]?.getBoundingClientRect() ?? null;
              setNotInterestedLead(null);
              setReviewPhase("move");
              setReviewingLead({ ...notInterestedLead, tags: "Not Interested" });
              setReviewRect(rect);
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
                body: JSON.stringify({
                  id: notInterestedLead.id,
                  tags: "Not Interested",
                  note: noteWithHistory,
                  moveToReview: true,
                }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed (${res.status})`);
              }
              const rect = rowRefs.current[notInterestedLead.id]?.getBoundingClientRect() ?? null;
              setNotInterestedLead(null);
              setReviewPhase("move");
              setReviewingLead({ ...notInterestedLead, tags: "Not Interested" });
              setReviewRect(rect);
            }
          }}
        />
      )}
      {interestedLead && (
        <InterestedModal
          leadName={interestedLead.name}
          leadPlace={interestedLead.place}
          leadNumber={interestedLead.number}
          id={interestedLead.id}
          onClose={() => setInterestedLead(null)}
          onConfirm={async (result) => {
            if (!result.hasPassport) {
              const note = appendTagHistory(NO_PASSPORT_SCRIPT, "Interested");
              const res = await fetch("/api/leads", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: interestedLead.id,
                  tags: "Interested",
                  note,
                  moveToReview: true,
                }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed (${res.status})`);
              }
              const rect = rowRefs.current[interestedLead.id]?.getBoundingClientRect() ?? null;
              setInterestedLead(null);
              setReviewPhase("move");
              setReviewingLead({ ...interestedLead, tags: "Interested" });
              setReviewRect(rect);
            } else {
              const noteParts: string[] = [];
              if (result.name != null) noteParts.push(`Name: ${result.name.trim() || "-"}`);
              if (result.place != null) noteParts.push(`Place: ${result.place.trim() || "-"}`);
              if (result.qualification) noteParts.push(`Qualification: ${result.qualification}`);
              if (result.nowWorking && result.tradeField) {
                noteParts.push(`Working: ${result.tradeField}`);
              }
              if (result.workExperience) noteParts.push(`Experience: ${result.workExperience}`);
              if (result.workExpFrom) noteParts.push(`Experience from: ${result.workExpFrom} yrs`);
              if (result.targetCountry) noteParts.push(`Target: ${result.targetCountry}`);
              if (result.visaType) noteParts.push(`Visa: ${result.visaType}`);
              if (result.budget) noteParts.push(`Budget: ${result.budget}`);
              if (result.budgetFrom) noteParts.push(`Budget from: ${result.budgetFrom}`);
              if (result.previousTraveler) {
                if (result.prevTravelEntries && result.prevTravelEntries.length > 0) {
                  const parts = result.prevTravelEntries.map(
                    (e) => `${e.country || "-"} (${e.visa || "-"}, ${e.duration || "-"})`
                  );
                  noteParts.push(`Prev travel: ${parts.join("; ")}`);
                } else if (result.prevTravelCountry || result.prevTravelVisa || result.prevTravelDuration) {
                  noteParts.push(
                    `Prev travel: ${result.prevTravelCountry || "-"} (${result.prevTravelVisa || "-"}, ${result.prevTravelDuration || "-"})`
                  );
                }
              }
              if (result.hasRejection && (result.rejectionCountry || result.rejectionReason)) {
                noteParts.push(
                  `Rejection: ${result.rejectionCountry || "-"} - ${result.rejectionReason || "-"}`
                );
              }
              noteParts.push(`${ACTION_NOTE_PREFIX}${result.action}`);
              const note = appendTagHistory(noteParts.join(" | "), "Interested");
              const body: Record<string, unknown> = {
                id: interestedLead.id,
                tags: "Interested",
                note,
              };
              if (result.name?.trim()) body.name = result.name.trim();
              if (result.place?.trim()) body.place = result.place.trim();
              // Document received → move directly to Green bucket (same as followup "Yes")
              if (result.action === "Document received") {
                body.moveToGreenBucket = true;
              }
              // Default 1hr followup countdown for "Client said they will share something with us"
              if (result.action === INTERESTED_ACTION_DEFAULT_FOLLOWUP_1HR) {
                body.callbackTime = new Date(Date.now() + WHATSAPP_FOLLOWUP_HOURS * 60 * 60 * 1000).toISOString();
                body.category = "callback";
              }
              const res = await fetch("/api/leads", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed (${res.status})`);
              }
              setInterestedLead(null);
              if (result.action === "Document received") {
                const rect = rowRefs.current[interestedLead.id]?.getBoundingClientRect() ?? null;
                setGreenBucketPhase("move");
                setGreenBucketLead({ ...interestedLead, tags: "Interested", note });
                setGreenBucketRect(rect);
              } else {
                onRefresh();
              }
            }
          }}
        />
      )}
      {interestedFollowupLead && (
        <InterestedFollowupModal
          lead={interestedFollowupLead}
          action={(() => {
            const parts = interestedFollowupLead.note?.split(" | ").filter((p) => p.startsWith(ACTION_NOTE_PREFIX)) ?? [];
            const last = parts.length > 0 ? parts[parts.length - 1] : undefined;
            return last?.startsWith(ACTION_NOTE_PREFIX) ? last.slice(ACTION_NOTE_PREFIX.length).trim() : last?.trim();
          })()}
          onClose={() => setInterestedFollowupLead(null)}
          onSuccess={onRefresh}
          onDocumentReceived={(lead) => {
            const rect = rowRefs.current[lead.id]?.getBoundingClientRect() ?? null;
            setInterestedFollowupLead(null);
            setGreenBucketPhase("move");
            setGreenBucketLead(lead);
            setGreenBucketRect(rect);
          }}
          onNotInterested={(l) => {
            setInterestedFollowupLead(null);
            setNotInterestedLead(l);
            setNotInterestedFrom("interestedFollowup");
          }}
        />
      )}
      {invalidLead && (
        <InvalidNumberModal
          leadName={invalidLead.name}
          leadNumber={invalidLead.number}
          id={invalidLead.id}
          onClose={() => setInvalidLead(null)}
          onConfirm={async () => {
            setUpdating(invalidLead.id);
            const res = await fetch("/api/leads", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: invalidLead.id, moveToAdmin: true }),
            });
            setUpdating(null);
            if (res.ok) {
              const rect = rowRefs.current[invalidLead.id]?.getBoundingClientRect() ?? null;
              setInvalidLead(null);
              setExhaustPhase("move");
              setExhaustingLead({ ...invalidLead, tags: "Invalid Number" });
              setExhaustRect(rect);
            }
          }}
        />
      )}
      {exhaustingLead && exhaustPhase === "move" && (
        <ExhaustAnimationOverlay
          lead={{
            id: exhaustingLead.id,
            name: exhaustingLead.name,
            number: exhaustingLead.number,
            tags: exhaustingLead.tags,
          }}
          rowRect={exhaustRect}
          onComplete={handleExhaustMoveComplete}
        />
      )}
      {reviewingLead && reviewPhase === "move" && (
        <ReviewAnimationOverlay
          lead={{
            id: reviewingLead.id,
            name: reviewingLead.name,
            number: reviewingLead.number,
            tags: reviewingLead.tags,
          }}
          rowRect={reviewRect}
          onComplete={handleReviewMoveComplete}
        />
      )}
      {greenBucketLead && greenBucketPhase === "move" && (
        <GreenBucketAnimationOverlay
          lead={{
            id: greenBucketLead.id,
            name: greenBucketLead.name,
            number: greenBucketLead.number,
            tags: greenBucketLead.tags,
          }}
          rowRect={greenBucketRect}
          onComplete={handleGreenBucketMoveComplete}
        />
      )}
    </div>
  );
}
