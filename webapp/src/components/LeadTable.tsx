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
import { NewAssignedAnimationOverlay } from "./NewAssignedAnimationOverlay";
import { CallbackCountdown } from "./CallbackCountdown";
import { TagIcon } from "./TagIcons";
import { LeadDetailModal } from "./LeadDetailModal";
import { NoteEditModal } from "./NoteEditModal";
import { CallDialModal } from "./CallDialModal";
import { CallbackReminderModal } from "./CallbackReminderModal";
import { OverdueCallModal } from "./OverdueCallModal";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { useCountdown } from "@/hooks/useCountdown";
import { ACTION_LABELS, ACTION_NOTE_PREFIX, BLINK_BEFORE_SECONDS, CALL_NOW_LABEL, GRACE_PERIOD_HOURS, INTERESTED_ACTION_DEFAULT_FOLLOWUP_1HR, NO_PASSPORT_SCRIPT, SUBFLOW_TEXT_COLORS, TAG_TEXT_COLORS, WHATSAPP_FOLLOWUP_HOURS } from "@/lib/constants";
import { getDisplayId } from "@/lib/displayId";
import { formatCallbackDateShort, formatTokenDisplay } from "@/lib/dateUtils";
import { appendTagHistory, getCallbackDisplayTagFallback, getDisplayAttemptForTag, getEffectiveTag, getTagHistory, getInterestedSubFlow, getLastAttemptForTag, getWhatsAppSubFlow } from "@/lib/leadNote";

/** Single source of truth for callback flow. Uses getEffectiveTag so Incoming Off (from tags or note) is never treated as No Answer callback. Use this only — do not add new branches that check lead.tags for Incoming Off. */
function getCallbackFlowType(lead: Lead): "whatsapp_followup" | "no_answer_callback" | "other_callback" | null {
  if (!lead.callbackTime) return null;
  const effective = getEffectiveTag(lead.note, lead.tags);
  const t = (lead.tags ?? "").trim();
  if (t === "Interested") return null;
  if (t === "WhatsApp Flow Active" || t === "Incoming Off" || effective === "Incoming Off" || t === "WhatsApp No Reply") return "whatsapp_followup";
  if (TAGS_SCHEDULEABLE_CALLBACK.includes(effective as TagOption)) return "no_answer_callback";
  return "other_callback";
}

/** Attempt badge is hidden when count is 1; shown from 2 onwards. */
const ATTEMPT_BADGE_MIN = 2;

/** Corner badge style for attempt count — fixed top-left position inside container. */
const ATTEMPT_CORNER_BADGE_CLASS =
  "absolute top-0 left-0 z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200/90 text-[9px] font-bold tabular-nums leading-none text-amber-900 shadow-sm";
/** Left padding on pill when badge is visible so badge never overlaps icon/text. */
const ATTEMPT_BADGE_PILL_PADDING = "pl-4 pr-2";

/** Shared style for amber callback/followup cards (No Answer, Other callback, Interested Followup). Badge slot (pl-4) always reserved so position is fixed. */
const CALLBACK_CARD_AMBER_CLASS =
  "relative inline-flex h-[30px] min-w-0 max-w-full flex-nowrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 pl-4 pr-2 py-1 shadow-sm";
/** Overdue callback card: same layout as amber card (badge slot pl-4, badge at top-left) so badge position matches. */
const CALLBACK_CARD_OVERDUE_CLASS =
  "relative inline-flex h-[30px] min-w-0 max-w-full flex-nowrap items-center gap-2 rounded-lg border border-slate-200 bg-white pl-4 pr-2 py-1 shadow-sm";
const CALLBACK_CARD_AMBER_DIVIDER_CLASS = "self-stretch w-px min-h-[1.25rem] shrink-0 rounded-full bg-amber-300";

/** Small info icon button to open lead detail/timeline from a callback card. */
function TimelineInfoButton({ onClick }: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:bg-amber-200/80 hover:text-slate-700"
      title="View timeline"
      aria-label="View timeline"
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );
}

/** Live countdown to 1hr from mount, with date. Same alignment as CallbackCountdown: badge + countdown row, date row. Badge is clickable when onFollowupClick is provided. */
function Default1hrCountdown({ onFollowupClick }: { onFollowupClick?: () => void }) {
  const [targetTime] = useState(() => new Date(Date.now() + WHATSAPP_FOLLOWUP_HOURS * 60 * 60 * 1000).toISOString());
  const countdown = useCountdown(targetTime);
  const dateLabel = formatCallbackDateShort(targetTime);
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
  const [notInterestedFrom, setNotInterestedFrom] = useState<"callDial" | "callNow" | "callbackReminder" | "interestedFollowup" | "whatsappFollowup" | null>(null);
  const [interestedLead, setInterestedLead] = useState<Lead | null>(null);
  const [interestedFrom, setInterestedFrom] = useState<"callbackReminder" | "whatsappFollowup" | null>(null);
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
  const [newAssignedLead, setNewAssignedLead] = useState<Lead | null>(null);
  const [newAssignedRect, setNewAssignedRect] = useState<DOMRect | null>(null);
  const [newAssignedPhase, setNewAssignedPhase] = useState<"move" | "slide">("move");
  const [, setUpdating] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [noteEditLead, setNoteEditLead] = useState<Lead | null>(null);
  const [callDialLead, setCallDialLead] = useState<Lead | null>(null);
  const [callbackReminderLead, setCallbackReminderLead] = useState<Lead | null>(null);
  const [callNowLead, setCallNowLead] = useState<Lead | null>(null);
  const [overdueCallLead, setOverdueCallLead] = useState<Lead | null>(null);
  const [callbackReminderFromOverdue, setCallbackReminderFromOverdue] = useState(false);
  const [highlightLeadId, setHighlightLeadId] = useState<string | null>(null);
  const [whatsappOpenedFromCallDialIncomingOff, setWhatsappOpenedFromCallDialIncomingOff] = useState(false);
  /** Excel-like cell selection: { rowIndex, colIndex } or null. Arrow keys move; click to select. */
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  /** Incoming Off + WhatsApp collaboration: expanded row id for drawer (click center "CB" pill to toggle). */
  const [expandedCollaborationLeadId, setExpandedCollaborationLeadId] = useState<string | null>(null);

  const handleExhaustMoveComplete = useCallback(() => {
    setExhaustPhase("slide");
  }, []);

  const handleReviewMoveComplete = useCallback(() => {
    setReviewPhase("slide");
  }, []);

  const handleGreenBucketMoveComplete = useCallback(() => {
    setGreenBucketPhase("slide");
  }, []);

  const handleNewAssignedMoveComplete = useCallback(() => {
    setNewAssignedPhase("slide");
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

  useEffect(() => {
    if (newAssignedPhase !== "slide") return;
    const t = setTimeout(() => {
      setNewAssignedLead(null);
      setNewAssignedRect(null);
      setNewAssignedPhase("move");
      onRefresh();
    }, 1200);
    return () => clearTimeout(t);
  }, [newAssignedPhase, onRefresh]);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const hasCallbacks = leads.some((l) => l.callbackTime);
  useCurrentTime(!!hasCallbacks);

  /** WhatsApp follow-up: violet card. From getCallbackFlowType only — do not branch on lead.tags elsewhere. */
  const isWhatsAppFollowupLead = (l: Lead) => getCallbackFlowType(l) === "whatsapp_followup";
  const isFollowupActive = (l: Lead) => getCallbackFlowType(l) === "whatsapp_followup";

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

  /** Group order: 1 = Overdue, 2 = Call now, 3 = Follow up, 4 = Interested (incl. Interested Followup), 5 = Fresh. */
  const getLeadGroupOrder = (l: Lead): number => {
    if (isOverdue(l)) return 1;
    const isInterested = l.flow === "Connected" && (l.tags === "Interested" || String(l.tags) === "Document received");
    if (isInterested) return 4;
    if (l.callbackTime?.trim()) {
      const cbMs = new Date(l.callbackTime.trim()).getTime();
      if (Number.isFinite(cbMs)) {
        const now = Date.now();
        const graceEnd = cbMs + GRACE_PERIOD_HOURS * 60 * 60 * 1000;
        if (now > graceEnd) return 1;
        if (now >= cbMs && now <= graceEnd) return 2; // call now
        if (now < cbMs) return 3; // follow up
      }
    }
    return 5; // fresh
  };

  const blinkingLeadId = leads.find((l) => l.callbackTime && isBlinkTime(l.callbackTime))?.id;
  const scrolledToRef = useRef<string | null>(null);

  /** Group order: Overdue → Call now → Follow up → Interested → Fresh. Within group, sort by callback time then by id so order is stable (avoids countdown jump when modal closes). */
  const sortedLeads = [...leads].sort((a, b) => {
    const ga = getLeadGroupOrder(a);
    const gb = getLeadGroupOrder(b);
    if (ga !== gb) return ga - gb;
    if (ga <= 3 && a.callbackTime && b.callbackTime) {
      const at = new Date(a.callbackTime).getTime();
      const bt = new Date(b.callbackTime).getTime();
      if (at !== bt) return at - bt;
    }
    return (a.id ?? "").localeCompare(b.id ?? "");
  });

  const firstOverdueLeadId = sortedLeads.find((l) => isOverdue(l))?.id ?? null;
  const prevFirstOverdueRef = useRef<string | null>(null);
  const sortedLeadsRef = useRef<Lead[]>([]);
  sortedLeadsRef.current = sortedLeads;

  const openRowModal = useCallback((lead: Lead) => {
    const effectiveTag = getEffectiveTag(lead.note, lead.tags);
    const tagsNorm = String(lead.tags ?? "").trim();
    const flowNorm = String(lead.flow ?? "").trim().toLowerCase();
    const scheduleableTag = lead.tags !== "" && TAGS_SCHEDULEABLE_CALLBACK.includes(lead.tags as TagOption);
    const incompleteNotConnected = (flowNorm === "not connected" || flowNorm === "select") && scheduleableTag && !lead.callbackTime;
    // Not Connected + no tag = fresh (dial modal); include "not connected" so Dial opens, not Detail
    const isFresh = (tagsNorm === "" && (flowNorm === "" || flowNorm === "connected" || flowNorm === "select" || flowNorm === "not connected")) || incompleteNotConnected;
    const isIncomingOffClickable = lead.flow === "Not Connected" && effectiveTag === "Incoming Off";
    if (isOverdue(lead)) {
      if (getCallbackFlowType(lead) === "whatsapp_followup") setFollowupLead(lead);
      else if (effectiveTag === "Incoming Off") {
        setWhatsappOpenedFromCallDialIncomingOff(false);
        setWhatsappLead(lead);
      } else setOverdueCallLead(lead);
    } else if ((lead.tags === "Interested" || String(lead.tags) === "Document received") && lead.callbackTime) setInterestedFollowupLead(lead);
    else if (getCallbackFlowType(lead) === "whatsapp_followup") setFollowupLead(lead);
    else if (lead.callbackTime) setCallbackReminderLead(lead);
    else if (isFresh) setCallDialLead(lead);
    else if (effectiveTag === "Incoming Off") setCallDialLead(lead);
    else if (isIncomingOffClickable) {
      setWhatsappOpenedFromCallDialIncomingOff(false);
      setWhatsappLead(lead);
    } else {
      // Fallback: open lead detail so click on row always opens at least one modal
      setDetailLead(lead);
    }
  }, []);


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

  useEffect(() => {
    if (newAssignedLead) {
      rowRefs.current[newAssignedLead.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [newAssignedLead]);

  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const bodyTableRef = useRef<HTMLTableElement>(null);

  const COL_COUNT = 8;
  useEffect(() => {
    if (!selectedCell) return;
    const rowCount = leads.length;
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "Enter" && !isInput) {
        e.preventDefault();
        if (selectedCell.colIndex !== 5) return;
        const lead = sortedLeadsRef.current[selectedCell.rowIndex];
        if (lead) openRowModal(lead);
        return;
      }
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const nextRowIndex = e.key === "ArrowUp" ? Math.max(0, selectedCell.rowIndex - 1) : Math.min(rowCount - 1, selectedCell.rowIndex + 1);
        const lead = sortedLeadsRef.current[nextRowIndex];
        if (lead) rowRefs.current[lead.id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      setSelectedCell((prev) => {
        if (!prev) return null;
        switch (e.key) {
          case "ArrowUp": return { ...prev, rowIndex: Math.max(0, prev.rowIndex - 1) };
          case "ArrowDown": return { ...prev, rowIndex: Math.min(rowCount - 1, prev.rowIndex + 1) };
          case "ArrowLeft": return { ...prev, colIndex: Math.max(0, prev.colIndex - 1) };
          case "ArrowRight": return { ...prev, colIndex: Math.min(COL_COUNT - 1, prev.colIndex + 1) };
          default: return prev;
        }
      });
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedCell, leads.length, openRowModal]);

  /* Column widths: ID, Source, Name, Place, Number, Flow/Tag/Action, Sub flow, Notes (manual edit icon). Flow column wider so callback time doesn’t clip. */
  const colWidths = ["9%", "6%", "10%", "8%", "10%", "33%", "18%", "6%"];

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
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap rounded-tl-lg border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">ID / Source</th>
              <th className="sticky top-0 z-20 min-w-[4.5rem] overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]" title="Token">Token</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Name</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Place</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Number</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Flow / Tag / Action</th>
              <th className="sticky top-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-600 border-b-2 border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]">Sub flow</th>
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
          {sortedLeads.map((lead, rowIndex) => {
            const shouldBlink = lead.callbackTime && isBlinkTime(lead.callbackTime);
            const isExhausting = exhaustingLead?.id === lead.id;
            const isReviewing = reviewingLead?.id === lead.id;
            const isGreenBucketing = greenBucketLead?.id === lead.id;
            const isNewAssigned = newAssignedLead?.id === lead.id;
            const isCollaborationHighlight = highlightLeadId === lead.id;
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
            const newAssignedRowClass = isNewAssigned
              ? newAssignedPhase === "move"
                ? "animate-new-assigned-blink"
                : "animate-new-assigned-slide-out"
              : null;
            const flowNorm = String(lead.flow ?? "").trim().toLowerCase();
            const tagsNorm = String(lead.tags ?? "").trim();
            const scheduleableTag = lead.tags !== "" && TAGS_SCHEDULEABLE_CALLBACK.includes(lead.tags as TagOption);
            const incompleteNotConnected = (flowNorm === "not connected" || flowNorm === "select") && scheduleableTag && !lead.callbackTime;
            // Fresh = no tag yet (incl. Not Connected), or incomplete Not Connected → row click opens dial modal
            const isFresh =
              (tagsNorm === "" && (flowNorm === "" || flowNorm === "connected" || flowNorm === "select" || flowNorm === "not connected")) ||
              incompleteNotConnected;
            const effectiveTag = getEffectiveTag(lead.note, lead.tags);
            const displayTag = isWhatsAppFollowupLead(lead)
              ? "WhatsApp Flow Active"
              : (String(effectiveTag) === "Document received" ? "Interested" : effectiveTag);
            const displaySubFlow = isWhatsAppFollowupLead(lead)
              ? getWhatsAppSubFlow(lead.note) || (lead.tags === "Incoming Off" && lead.whatsappFollowupStartedAt ? "WhatsApp No Reply" : "")
              : (lead.flow === "Connected" && (lead.tags === "Interested" || String(lead.tags) === "Document received"))
                ? getInterestedSubFlow(lead.note, lead.tags)
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
            const resolvedDisplayTag =
              displayTag === "Incoming Off" && !showIncomingOffCollaborate ? "" : displayTag;
            // Callback card: always show a tag — never "—". Fallback from note when tags/effectiveTag empty (e.g. old data).
            const callbackCardTagRaw =
              resolvedDisplayTag || (lead.tags?.trim() ?? "") || effectiveTag || "";
            const callbackCardTag =
              callbackCardTagRaw || getCallbackDisplayTagFallback(lead.note);
            // Interested + sub-flow (action in note or legacy Document received) → we show the followup card; Document received is sub-flow not tag
            const interestedActionFromNote =
              lead.flow === "Connected" && (lead.tags === "Interested" || String(lead.tags) === "Document received")
                ? getInterestedSubFlow(lead.note, lead.tags)
                : "";
            const showInterestedFollowupCard = !!interestedActionFromNote;
            const isRowClickable =
              isFresh || isOverdue(lead) || lead.callbackTime || isIncomingOffClickable;
            return (
            <tr
              key={lead.id}
              ref={(el) => {
                rowRefs.current[lead.id] = el;
              }}
              role={isRowClickable ? "button" : undefined}
              onDoubleClick={() => {
                if (isRowClickable && selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === 5) openRowModal(lead);
              }}
              className={`group scroll-mt-8 transition-colors duration-150 ${
                isRowClickable ? "cursor-pointer " : ""
              }${
                exhaustRowClass ?? reviewRowClass ?? greenBucketRowClass ?? newAssignedRowClass ??
                  (isOverdue(lead)
                    ? "animate-overdue-blink hover:!bg-red-100"
                    : shouldBlink && isWhatsAppFollowupLead(lead)
                      ? "animate-followup-sweep hover:!bg-violet-100"
                      : shouldBlink
                        ? "animate-callback-blink hover:!bg-amber-100"
                        : lead.category === "callback" || showInterestedFollowupCard
                          ? "bg-amber-50 hover:bg-amber-100"
                          : isIncomingOffClickable
                            ? "hover:bg-sky-50"
                            : "hover:bg-slate-50")
              }${isCollaborationHighlight ? " !bg-emerald-100 ring-2 ring-emerald-400 ring-inset animate-pulse shadow-[inset_0_0_0_2px_rgba(52,211,153,0.5)]" : ""}`}
            >
              <td
                className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-200 px-2 py-1.5 text-xs font-mono text-slate-900 transition-colors duration-150 ${
                  selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === 0 ? "ring-2 ring-blue-500 ring-inset" : ""
                } ${
                  isCollaborationHighlight
                    ? "bg-emerald-100/90 group-hover:bg-emerald-100"
                    : isOverdue(lead)
                    ? "bg-transparent group-hover:!bg-red-100"
                    : shouldBlink && isWhatsAppFollowupLead(lead)
                      ? "bg-transparent group-hover:!bg-violet-100"
                      : shouldBlink
                        ? "bg-transparent group-hover:!bg-amber-100"
                        : lead.category === "callback" || showInterestedFollowupCard
                          ? "bg-amber-50 group-hover:bg-amber-100"
                          : isIncomingOffClickable
                            ? "bg-white group-hover:bg-sky-50"
                            : "bg-white group-hover:bg-slate-50"
                }`}
                onClick={(e) => { e.stopPropagation(); if (expandedCollaborationLeadId) setExpandedCollaborationLeadId(null); setSelectedCell({ rowIndex, colIndex: 0 }); }}
              >
                <div className="flex min-w-0 items-center gap-1">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-slate-900">{getDisplayId(lead.id)}</span>
                    {lead.source ? <span className="block truncate text-[11px] font-normal text-slate-500">{lead.source}</span> : null}
                  </span>
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
              <td className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-200 px-2 py-1.5 text-xs text-slate-800 ${selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === 1 ? "ring-2 ring-blue-500 ring-inset" : ""} ${isCollaborationHighlight ? "bg-emerald-100/90" : ""}`} onClick={(e) => { e.stopPropagation(); if (expandedCollaborationLeadId) setExpandedCollaborationLeadId(null); setSelectedCell({ rowIndex, colIndex: 1 }); }}>{formatTokenDisplay(lead)}</td>
              <td className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-200 px-2 py-1.5 text-xs text-slate-800 ${selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === 2 ? "ring-2 ring-blue-500 ring-inset" : ""} ${isCollaborationHighlight ? "bg-emerald-100/90" : ""}`} onClick={(e) => { e.stopPropagation(); if (expandedCollaborationLeadId) setExpandedCollaborationLeadId(null); setSelectedCell({ rowIndex, colIndex: 2 }); }}>{lead.name}</td>
              <td className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-200 px-2 py-1.5 text-xs text-slate-800 ${selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === 3 ? "ring-2 ring-blue-500 ring-inset" : ""} ${isCollaborationHighlight ? "bg-emerald-100/90" : ""}`} onClick={(e) => { e.stopPropagation(); if (expandedCollaborationLeadId) setExpandedCollaborationLeadId(null); setSelectedCell({ rowIndex, colIndex: 3 }); }}>{lead.place}</td>
              <td className={`overflow-hidden text-ellipsis whitespace-nowrap border-r-2 border-slate-200 px-2 py-1.5 text-xs text-slate-800 ${selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === 4 ? "ring-2 ring-blue-500 ring-inset" : ""} ${isCollaborationHighlight ? "bg-emerald-100/90" : ""}`} onClick={(e) => { e.stopPropagation(); if (expandedCollaborationLeadId) setExpandedCollaborationLeadId(null); setSelectedCell({ rowIndex, colIndex: 4 }); }}>
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
              <td className={`overflow-hidden border-r-2 border-slate-200 px-2 py-1.5 align-middle ${selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === 5 ? "ring-2 ring-blue-500 ring-inset" : ""} ${isCollaborationHighlight ? "bg-emerald-100/90" : ""}`} onClick={(e) => { e.stopPropagation(); if (expandedCollaborationLeadId && !(e.target as HTMLElement).closest("[data-collaboration-block]")) setExpandedCollaborationLeadId(null); setSelectedCell({ rowIndex, colIndex: 5 }); if (!(e.target as HTMLElement).closest("button")) openRowModal(lead); }}>
                {/* Single line: tag, action note, badges, buttons, countdown */}
                <div className="flex min-w-0 flex-wrap items-center gap-2" onClick={(e) => { e.stopPropagation(); if (expandedCollaborationLeadId && !(e.target as HTMLElement).closest("[data-collaboration-block]")) setExpandedCollaborationLeadId(null); setSelectedCell({ rowIndex, colIndex: 5 }); if (!(e.target as HTMLElement).closest("button")) openRowModal(lead); }}>
                  {(!isFresh || lead.callbackTime) && !(lead.callbackTime && lead.tags !== "Interested" && !isWhatsAppFollowupLead(lead)) && (
                    <>
                    {showIncomingOffCollaborate ? (
                      <span data-collaboration-block className="inline-flex items-center gap-2">
                        {expandedCollaborationLeadId === lead.id ? (
                          <>
                          <span className={`relative inline-flex h-[30px] flex-nowrap items-center gap-1.5 rounded-lg border pl-4 pr-2 py-1 shadow-sm ${isOverdue(lead) ? "border-red-200/80 bg-red-50/70" : "border-slate-200 bg-slate-50"}`}>
                            {getLastAttemptForTag(lead.note, "Incoming Off") >= ATTEMPT_BADGE_MIN && (
                              <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${getLastAttemptForTag(lead.note, "Incoming Off")}`}>{getLastAttemptForTag(lead.note, "Incoming Off")}</span>
                            )}
                            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${TAG_TEXT_COLORS["Incoming Off"]}`}>
                              <TagIcon tag="Incoming Off" className="h-3 w-3 shrink-0" />
                              Incoming Off
                            </span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedCollaborationLeadId(null); }} title="Collapse" className="shrink-0 inline-flex rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <circle cx="6" cy="12" r="2" strokeWidth={2} />
                                <circle cx="18" cy="12" r="2" strokeWidth={2} />
                                <path strokeLinecap="round" strokeWidth={2} d="M8 12h8" />
                              </svg>
                            </button>
                            <span className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full py-0.5 text-[11px] font-bold ${getLastAttemptForTag(lead.note, "WhatsApp Flow Active") >= ATTEMPT_BADGE_MIN ? ATTEMPT_BADGE_PILL_PADDING : "px-2"} ${TAG_TEXT_COLORS["WhatsApp Flow Active"]}`}>
                              {getLastAttemptForTag(lead.note, "WhatsApp Flow Active") >= ATTEMPT_BADGE_MIN && (
                                <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${getLastAttemptForTag(lead.note, "WhatsApp Flow Active")}`}>{getLastAttemptForTag(lead.note, "WhatsApp Flow Active")}</span>
                              )}
                              <TagIcon tag="WhatsApp Flow Active" className="h-3 w-3 shrink-0" />
                              WhatsApp Flow Active
                            </span>
                          </span>
                          {isOverdue(lead) && (
                            <span className="self-stretch w-px min-h-[1.25rem] shrink-0 rounded-full bg-red-300" aria-hidden />
                          )}
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedCollaborationLeadId(lead.id); }}
                            className={`relative inline-flex h-[30px] flex-nowrap items-center gap-2 rounded-lg border py-1 shadow-sm ${getDisplayAttemptForTag(lead.note, "Incoming Off", !!lead.callbackTime) >= ATTEMPT_BADGE_MIN ? "pl-4 pr-2" : "px-2"} ${isOverdue(lead) ? "border-red-200/80 bg-red-50/70 hover:bg-red-100/80" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
                            title="Incoming Off + WhatsApp Flow Active — click to expand"
                          >
                            {getDisplayAttemptForTag(lead.note, "Incoming Off", !!lead.callbackTime) >= ATTEMPT_BADGE_MIN && (
                              <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${getDisplayAttemptForTag(lead.note, "Incoming Off", !!lead.callbackTime)}`}>{getDisplayAttemptForTag(lead.note, "Incoming Off", !!lead.callbackTime)}</span>
                            )}
                            <span className="shrink-0 inline-flex items-center gap-0.5 text-sky-600" title="Incoming Off">
                              <TagIcon tag="Incoming Off" className="h-3.5 w-3.5" />
                            </span>
                            <span className="shrink-0 inline-flex text-slate-400" title="Collaborate">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <circle cx="6" cy="12" r="2" strokeWidth={2} />
                                <circle cx="18" cy="12" r="2" strokeWidth={2} />
                                <path strokeLinecap="round" strokeWidth={2} d="M8 12h8" />
                              </svg>
                            </span>
                            <span className={`relative shrink-0 inline-flex items-center gap-0.5 text-emerald-600 ${getDisplayAttemptForTag(lead.note, "WhatsApp Flow Active", !!lead.callbackTime) >= ATTEMPT_BADGE_MIN ? "pl-4" : ""}`} title="WhatsApp Flow Active">
                              {getDisplayAttemptForTag(lead.note, "WhatsApp Flow Active", !!lead.callbackTime) >= ATTEMPT_BADGE_MIN && (
                                <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${getDisplayAttemptForTag(lead.note, "WhatsApp Flow Active", !!lead.callbackTime)}`}>{getDisplayAttemptForTag(lead.note, "WhatsApp Flow Active", !!lead.callbackTime)}</span>
                              )}
                              <TagIcon tag="WhatsApp Flow Active" className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        )}
                      </span>
                    ) : resolvedDisplayTag && (resolvedDisplayTag !== "Interested" || !showInterestedFollowupCard) ? (
                    <span
                      className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full py-0.5 text-[11px] font-bold ${getLastAttemptForTag(lead.note, resolvedDisplayTag) >= ATTEMPT_BADGE_MIN ? ATTEMPT_BADGE_PILL_PADDING : "px-2"} ${TAG_TEXT_COLORS[resolvedDisplayTag as TagOption] ?? SUBFLOW_TEXT_COLORS[resolvedDisplayTag] ?? "text-neutral-800"}`}
                    >
                      {getLastAttemptForTag(lead.note, resolvedDisplayTag) >= ATTEMPT_BADGE_MIN && (
                        <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${getLastAttemptForTag(lead.note, resolvedDisplayTag)}`}>{getLastAttemptForTag(lead.note, resolvedDisplayTag)}</span>
                      )}
                      <TagIcon tag={resolvedDisplayTag} className="h-3 w-3 shrink-0" />
                      {resolvedDisplayTag}
                    </span>
                    ) : null}
                    {isOverdue(lead) && !showIncomingOffCollaborate && (
                      <span className="self-stretch w-px min-h-[1.25rem] shrink-0 rounded-full bg-red-300" aria-hidden />
                    )}
                    </>
                  )}
                    {/* WhatsApp follow-up: violet card (from getCallbackFlowType only). */}
                    {getCallbackFlowType(lead) === "whatsapp_followup" && (
                      <span className="inline-flex h-[30px] flex-nowrap items-center rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm">
                        <CallbackCountdown
                          callbackTime={lead.callbackTime}
                          isBlinking={!!(lead.callbackTime && isBlinkTime(lead.callbackTime))}
                          badgeLabel={ACTION_LABELS.followup}
                          badgeVariant="violet"
                          inline
                          renderCallNow={
                            <button
                              type="button"
                              onClick={() => setFollowupLead(lead)}
                              className="w-fit rounded border border-violet-600 bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm hover:bg-violet-700 hover:border-violet-700"
                            >
                              {ACTION_LABELS.followup}
                            </button>
                          }
                        />
                      </span>
                    )}
                    {/* No Answer cycle only: from getCallbackFlowType. */}
                    {getCallbackFlowType(lead) === "no_answer_callback" && (
                      isOverdue(lead) ? (
                        <span className={CALLBACK_CARD_OVERDUE_CLASS}>
                          {callbackCardTag !== "—" && (() => { const attempt = getDisplayAttemptForTag(lead.note, callbackCardTag, !!lead.callbackTime); return attempt >= ATTEMPT_BADGE_MIN && (
                            <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${attempt}`}>{attempt}</span>
                          ); })()}
                          <span
                            className={
                              callbackCardTag !== "—"
                                ? `inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${TAG_TEXT_COLORS[callbackCardTag as TagOption] ?? SUBFLOW_TEXT_COLORS[callbackCardTag] ?? "text-neutral-800"}`
                                : "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-neutral-500"
                            }
                          >
                            {callbackCardTag !== "—" && <TagIcon tag={callbackCardTag} className="h-3 w-3 shrink-0" />}
                            {callbackCardTag}
                          </span>
                          <span className="self-stretch w-px min-h-[1.25rem] shrink-0 rounded-full bg-red-300" aria-hidden />
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
                          <TimelineInfoButton onClick={(e) => { e.stopPropagation(); setDetailLead(lead); }} />
                        </span>
                      ) : (
                        <span className={CALLBACK_CARD_AMBER_CLASS}>
                          {callbackCardTag !== "—" && (() => { const attempt = getDisplayAttemptForTag(lead.note, callbackCardTag, !!lead.callbackTime); return attempt >= ATTEMPT_BADGE_MIN && (
                            <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${attempt}`}>{attempt}</span>
                          ); })()}
                          <span
                            className={
                              callbackCardTag !== "—"
                                ? `inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${TAG_TEXT_COLORS[callbackCardTag as TagOption] ?? SUBFLOW_TEXT_COLORS[callbackCardTag] ?? "text-neutral-800"}`
                                : "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-neutral-500"
                            }
                          >
                            {callbackCardTag !== "—" && <TagIcon tag={callbackCardTag} className="h-3 w-3 shrink-0" />}
                            {callbackCardTag}
                          </span>
                          <span className={CALLBACK_CARD_AMBER_DIVIDER_CLASS} aria-hidden />
                          <CallbackCountdown
                            callbackTime={lead.callbackTime}
                            isBlinking={!!(lead.callbackTime && isBlinkTime(lead.callbackTime))}
                            inline
                            renderCallNow={
                              <button
                                type="button"
                                onClick={() => setCallNowLead(lead)}
                                className="w-fit rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 shadow-sm hover:bg-amber-500"
                              >
                                {CALL_NOW_LABEL}
                              </button>
                            }
                          />
                          <TimelineInfoButton onClick={(e) => { e.stopPropagation(); setDetailLead(lead); }} />
                        </span>
                      )
                    )}
                    {/* Other callback (legacy/other tag): from getCallbackFlowType — tag + countdown so cell never empty. */}
                    {getCallbackFlowType(lead) === "other_callback" && (
                      isOverdue(lead) ? (
                        <span className={CALLBACK_CARD_OVERDUE_CLASS}>
                          {callbackCardTag !== "—" && (() => { const attempt = getDisplayAttemptForTag(lead.note, callbackCardTag, !!lead.callbackTime); return attempt >= ATTEMPT_BADGE_MIN && (
                            <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${attempt}`}>{attempt}</span>
                          ); })()}
                          <span
                            className={
                              callbackCardTag !== "—"
                                ? `inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${TAG_TEXT_COLORS[callbackCardTag as TagOption] ?? SUBFLOW_TEXT_COLORS[callbackCardTag] ?? "text-neutral-800"}`
                                : "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-neutral-500"
                            }
                          >
                            {callbackCardTag !== "—" && <TagIcon tag={callbackCardTag} className="h-3 w-3 shrink-0" />}
                            {callbackCardTag}
                          </span>
                          <span className="self-stretch w-px min-h-[1.25rem] shrink-0 rounded-full bg-red-300" aria-hidden />
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
                          <TimelineInfoButton onClick={(e) => { e.stopPropagation(); setDetailLead(lead); }} />
                        </span>
                      ) : (
                        <span className={CALLBACK_CARD_AMBER_CLASS}>
                          {callbackCardTag !== "—" && (() => { const attempt = getDisplayAttemptForTag(lead.note, callbackCardTag, !!lead.callbackTime); return attempt >= ATTEMPT_BADGE_MIN && (
                            <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${attempt}`}>{attempt}</span>
                          ); })()}
                          <span
                            className={
                              callbackCardTag !== "—"
                                ? `inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${TAG_TEXT_COLORS[callbackCardTag as TagOption] ?? SUBFLOW_TEXT_COLORS[callbackCardTag] ?? "text-neutral-800"}`
                                : "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-neutral-500"
                            }
                          >
                            {callbackCardTag !== "—" && <TagIcon tag={callbackCardTag} className="h-3 w-3 shrink-0" />}
                            {callbackCardTag}
                          </span>
                          <span className={CALLBACK_CARD_AMBER_DIVIDER_CLASS} aria-hidden />
                          <CallbackCountdown
                            callbackTime={lead.callbackTime}
                            isBlinking={!!(lead.callbackTime && isBlinkTime(lead.callbackTime))}
                            inline
                            renderCallNow={
                              <button
                                type="button"
                                onClick={() => setCallbackReminderLead(lead)}
                                className="w-fit rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 shadow-sm hover:bg-amber-500"
                              >
                                {CALL_NOW_LABEL}
                              </button>
                            }
                          />
                          <TimelineInfoButton onClick={(e) => { e.stopPropagation(); setDetailLead(lead); }} />
                        </span>
                      )
                    )}
                    {showInterestedFollowupCard && (() => {
                      const action = interestedActionFromNote;
                      const isDefaultFollowupAction = action === INTERESTED_ACTION_DEFAULT_FOLLOWUP_1HR;
                      const showCountdown = lead.callbackTime || isDefaultFollowupAction;
                      const interestedOverdue = isOverdue(lead);
                      const interestedCardClass = interestedOverdue
                        ? "relative inline-flex h-[30px] min-w-0 max-w-full flex-nowrap items-center gap-2 rounded-lg border border-red-200/80 bg-red-50/70 pl-4 pr-2 py-1 shadow-sm"
                        : CALLBACK_CARD_AMBER_CLASS;
                      const interestedDividerClass = interestedOverdue
                        ? "self-stretch w-px min-h-[1.25rem] shrink-0 rounded-full bg-red-300"
                        : CALLBACK_CARD_AMBER_DIVIDER_CLASS;
                      return action ? (
                        <span className={interestedCardClass}>
                          {(() => { const attempt = getDisplayAttemptForTag(lead.note, "Interested", !!lead.callbackTime); return attempt >= ATTEMPT_BADGE_MIN && (
                            <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${attempt}`}>{attempt}</span>
                          ); })()}
                          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${TAG_TEXT_COLORS["Interested"]}`}>
                            <TagIcon tag="Interested" className="h-3 w-3 shrink-0" />
                            Interested
                          </span>
                          <span className={interestedDividerClass} aria-hidden />
                          {showCountdown &&
                            (lead.callbackTime ? (
                              <>
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
                              </>
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
                          <TimelineInfoButton onClick={(e) => { e.stopPropagation(); setDetailLead(lead); }} />
                        </span>
                      ) : null;
                    })()}
                </div>
              </td>
              <td className={`max-w-0 overflow-hidden border-r-2 border-slate-200 px-2 py-1.5 align-middle text-xs ${selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === 6 ? "ring-2 ring-blue-500 ring-inset" : ""}`} title={displaySubFlow ?? undefined} onClick={(e) => { e.stopPropagation(); if (expandedCollaborationLeadId) setExpandedCollaborationLeadId(null); setSelectedCell({ rowIndex, colIndex: 6 }); }}>
                {displaySubFlow ? (
                  <span className={`relative inline-flex min-w-0 max-w-full items-center gap-1.5 truncate rounded-full py-0.5 text-[11px] font-bold ${getLastAttemptForTag(lead.note, displaySubFlow) >= ATTEMPT_BADGE_MIN ? ATTEMPT_BADGE_PILL_PADDING : "px-2"} ${SUBFLOW_TEXT_COLORS[displaySubFlow] ?? "text-slate-700"}`}>
                    {getLastAttemptForTag(lead.note, displaySubFlow) >= ATTEMPT_BADGE_MIN && (
                      <span className={ATTEMPT_CORNER_BADGE_CLASS} title={`Attempt ${getLastAttemptForTag(lead.note, displaySubFlow)}`}>{getLastAttemptForTag(lead.note, displaySubFlow)}</span>
                    )}
                    <TagIcon tag={displaySubFlow} className="h-3 w-3 shrink-0" />
                    <span className="min-w-0 truncate">{displaySubFlow}</span>
                  </span>
                ) : null}
              </td>
              <td className={`group/cell max-w-0 overflow-hidden border-r-2 border-slate-600 bg-slate-800 px-1.5 py-1.5 align-middle text-xs ${selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === 7 ? "ring-2 ring-blue-500 ring-inset" : ""}`} onClick={(e) => { e.stopPropagation(); if (expandedCollaborationLeadId) setExpandedCollaborationLeadId(null); setSelectedCell({ rowIndex, colIndex: 7 }); }} title="Add or edit note">
                <div className="flex min-w-0 items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setNoteEditLead(lead)}
                    className="shrink-0 rounded-md bg-slate-700/60 p-1.5 text-white opacity-0 transition-all duration-200 group-hover/cell:opacity-100 group-hover/cell:bg-slate-700 hover:bg-slate-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 focus:ring-offset-slate-800"
                    title="Add or edit note"
                    aria-label="Add or edit note"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
          onIncomingOffClick={(lead) => {
            setCallDialLead(null);
            setWhatsappOpenedFromCallDialIncomingOff(true);
            setWhatsappLead(lead);
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
            setInterestedFrom("callbackReminder");
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
          onMoveToNewAssigned={(lead) => {
            setCallbackReminderFromOverdue(false);
            setCallbackReminderLead(null);
            setCallNowLead(null);
            const rect = rowRefs.current[lead.id]?.getBoundingClientRect() ?? null;
            setNewAssignedLead(lead);
            setNewAssignedRect(rect);
            setNewAssignedPhase("move");
          }}
          onIncomingOffClick={(lead) => {
            setCallbackReminderFromOverdue(false);
            setCallbackReminderLead(null);
            setCallNowLead(null);
            setWhatsappOpenedFromCallDialIncomingOff(true);
            setWhatsappLead(lead);
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
          openedFromCallDialIncomingOff={whatsappOpenedFromCallDialIncomingOff}
          onClose={() => {
            setWhatsappOpenedFromCallDialIncomingOff(false);
            setWhatsappLead(null);
            onRefresh();
          }}
          onBack={
            whatsappOpenedFromCallDialIncomingOff && whatsappLead
              ? () => {
                  const l = whatsappLead;
                  setWhatsappLead(null);
                  setWhatsappOpenedFromCallDialIncomingOff(false);
                  if (l) setCallDialLead(l);
                }
              : undefined
          }
          onSuccess={(result) => {
            if (result && "noReply" in result && result.noReply) {
              setWhatsappLead(null);
              setHighlightLeadId(result.id);
              onRefresh();
              setTimeout(() => setHighlightLeadId(null), 2500);
              setTimeout(() => {
                rowRefs.current[result.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }, 50);
              return;
            }
            if (result && "tags" in result) {
              const rect = rowRefs.current[result.id]?.getBoundingClientRect() ?? null;
              setExhaustPhase("move");
              setExhaustingLead({
                ...whatsappLead,
                tags: result.tags as Lead["tags"],
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
          lead={followupLead}
          leadName={followupLead.name}
          number={followupLead.number}
          id={followupLead.id}
          whatsappFollowupStartedAt={followupLead.whatsappFollowupStartedAt}
          onClose={() => setFollowupLead(null)}
          onSuccess={onRefresh}
          onConnectInterested={(l) => {
            setFollowupLead(null);
            setInterestedLead(l);
            setInterestedFrom("whatsappFollowup");
            onRefresh();
          }}
          onConnectNotInterested={(l) => {
            setNotInterestedFrom("whatsappFollowup");
            setFollowupLead(null);
            setNotInterestedLead(l);
          }}
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
                  if (lead && notInterestedFrom === "whatsappFollowup") setFollowupLead(lead);
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
          onClose={() => {
            setInterestedLead(null);
            setInterestedFrom(null);
          }}
          onBack={
            interestedFrom
              ? () => {
                  const lead = interestedLead;
                  const from = interestedFrom;
                  setInterestedLead(null);
                  setInterestedFrom(null);
                  if (lead && from === "callbackReminder") setCallbackReminderLead(lead);
                  if (lead && from === "whatsappFollowup") setFollowupLead(lead);
                }
              : undefined
          }
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
              setInterestedFrom(null);
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
              setInterestedFrom(null);
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
      {newAssignedLead && newAssignedPhase === "move" && (
        <NewAssignedAnimationOverlay
          lead={{
            id: newAssignedLead.id,
            name: newAssignedLead.name,
            number: newAssignedLead.number,
            tags: newAssignedLead.tags,
          }}
          rowRect={newAssignedRect}
          onComplete={handleNewAssignedMoveComplete}
        />
      )}
    </div>
  );
}
