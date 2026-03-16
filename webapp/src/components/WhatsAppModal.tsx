"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { WhatsAppSubFlow } from "@/types/lead";
import { openWhatsApp, getWaChatUrl } from "@/lib/whatsapp";
import { ACTION_NOTE_PREFIX, CYCLE_NAME_WHATSAPP, FLOW_DISPLAY_LABELS, SUBFLOW_NOTE_PREFIX, WHATSAPP_DEFAULT_TEMPLATE, WHATSAPP_FOLLOWUP_HOURS } from "@/lib/constants";
import { FlowIcon } from "./TagIcons";
import { appendTagHistory } from "@/lib/leadNote";

const WHATSAPP_TEMPLATES_KEY = "whatsapp_templates";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
}

function fillTemplate(body: string, leadName: string, telecallerName = "Telecaller", companyName = "Company Name"): string {
  return body
    .replace(/\{\{leadName\}\}/gi, leadName)
    .replace(/\{\{telecallerName\}\}/gi, telecallerName)
    .replace(/\{\{companyName\}\}/gi, companyName);
}

function loadCustomTemplates(): WhatsAppTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WHATSAPP_TEMPLATES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates: WhatsAppTemplate[]) {
  try {
    localStorage.setItem(WHATSAPP_TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    /* ignore */
  }
}

interface WhatsAppModalProps {
  leadName: string;
  number: string;
  id: string;
  /** Current lead note (for TagHistory). When Conversation start = Yes, we append WhatsApp cycle. */
  note?: string;
  /** Opened from CallDial "Incoming Off" without saving – apply Incoming Off only when user clicks WhatsApp Not Available or WhatsApp No Reply + Apply; closing after Send to WhatsApp keeps lead fresh. */
  openedFromCallDialIncomingOff?: boolean;
  onClose: () => void;
  /** When provided, Back (when not in sub-step) goes to previous modal (e.g. CallDial). One step only. */
  onBack?: () => void;
  /** When WhatsApp Not Available: pass moved lead to run exhaust animation. When WhatsApp No Reply: pass { noReply: true, id } to refresh and highlight collaboration row. */
  onSuccess: (result?: { id: string; name: string; number: string; tags: string } | { noReply: true; id: string }) => void;
}

const DEFAULT_TEMPLATE_ID = "incoming-off";

export function WhatsAppModal({
  leadName,
  number,
  id,
  note = "",
  openedFromCallDialIncomingOff = false,
  onClose,
  onBack,
  onSuccess,
}: WhatsAppModalProps) {
  const [whatsappTried, setWhatsappTried] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"yes" | "no" | null>(null);
  const [yesChoice, setYesChoice] = useState<"same" | "another" | null>(null);
  const [anotherNumber, setAnotherNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subFlow, setSubFlow] = useState<WhatsAppSubFlow | "">("");
  const [customTemplates, setCustomTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showChooseTemplate, setShowChooseTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const chooseTemplateRef = useRef<HTMLDivElement>(null);

  const defaultTemplate: WhatsAppTemplate = useMemo(
    () => ({ id: DEFAULT_TEMPLATE_ID, name: "Default message", body: WHATSAPP_DEFAULT_TEMPLATE }),
    []
  );
  const allTemplates = useMemo(() => [defaultTemplate, ...customTemplates], [defaultTemplate, customTemplates]);
  const selectedTemplate = allTemplates.find((t) => t.id === selectedTemplateId) ?? defaultTemplate;
  const filledMessage = useMemo(
    () => fillTemplate(selectedTemplate.body, leadName),
    [selectedTemplate.body, leadName]
  );
  const [editMessage, setEditMessage] = useState(filledMessage);
  const [showMessageEdit, setShowMessageEdit] = useState(false);
  useEffect(() => {
    setEditMessage(filledMessage);
  }, [filledMessage]);

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

  useEffect(() => {
    if (!showChooseTemplate) return;
    const onMouseDown = (e: MouseEvent) => {
      if (chooseTemplateRef.current && !chooseTemplateRef.current.contains(e.target as Node)) {
        setShowChooseTemplate(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showChooseTemplate]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSendToWhatsApp = () => {
    // When opened from CallDial Incoming Off: do NOT PATCH here. Tag is applied only on "WhatsApp Not Available" or "WhatsApp No Reply" + Apply. So closing after this keeps lead fresh.
    openWhatsApp(getWaChatUrl(number, editMessage.trim() || filledMessage));
    setWhatsappTried(true);
  };

  const handleCreateTemplate = () => {
    const name = newTemplateName.trim() || "New template";
    const body = newTemplateBody.trim() || WHATSAPP_DEFAULT_TEMPLATE;
    const id = "custom-" + Date.now();
    const next = [...customTemplates, { id, name, body }];
    setCustomTemplates(next);
    saveCustomTemplates(next);
    setSelectedTemplateId(id);
    setNewTemplateName("");
    setNewTemplateBody("");
    setShowCreateTemplate(false);
  };

  const handleSameNumberContinue = async () => {
    setLoading(true);
    const newNote = appendTagHistory(note, CYCLE_NAME_WHATSAPP);
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, flow: "Connected", tags: "", category: "active", note: newNote }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
    }
  };

  const handleAnotherNumberSubmit = async () => {
    const trimmed = anotherNumber.replace(/\D/g, "").trim();
    if (trimmed.length < 10) {
      setError("Enter valid 10-digit number");
      return;
    }
    setError(null);
    setLoading(true);
    const dualNumber = `${number} (Calling), ${trimmed} (WhatsApp)`;
    const newNote = appendTagHistory(note, CYCLE_NAME_WHATSAPP);
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, flow: "Connected", tags: "", category: "active", number: dualNumber, note: newNote }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      setError("Failed to save");
    }
  };

  const handleConversationNo = async () => {
    if (!subFlow) return;
    setError(null);
    setLoading(true);
    try {
      if (subFlow === "WhatsApp Not Available") {
        const actionNote = `${ACTION_NOTE_PREFIX}${subFlow}`;
        const subFlowNote = `${SUBFLOW_NOTE_PREFIX}${subFlow}`;
        const baseNote = openedFromCallDialIncomingOff ? appendTagHistory(note ?? "", "Incoming Off") : (note ?? "");
        const noteWithHistory = appendTagHistory(baseNote, CYCLE_NAME_WHATSAPP);
        const newNote = noteWithHistory?.trim() ? `${noteWithHistory} | ${subFlowNote} | ${actionNote}` : `${subFlowNote} | ${actionNote}`;
        const res = await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, tags: "Incoming Off", moveToAdminWithTag: true, note: newNote }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          onSuccess({ id, name: leadName, number, tags: "Incoming Off" });
          onClose();
        } else {
          setError(data?.error || `Failed (${res.status})`);
        }
        return;
      }
      if (subFlow === "WhatsApp No Reply") {
        const now = new Date();
        const nextFollowup = new Date(now.getTime() + WHATSAPP_FOLLOWUP_HOURS * 60 * 60 * 1000);
        const actionNote = `${ACTION_NOTE_PREFIX}Followup in ${WHATSAPP_FOLLOWUP_HOURS}hr`;
        const subFlowNote = `${SUBFLOW_NOTE_PREFIX}${subFlow}`;
        const baseNote = openedFromCallDialIncomingOff ? appendTagHistory(note ?? "", "Incoming Off") : (note ?? "");
        const noteWithHistory = appendTagHistory(baseNote, CYCLE_NAME_WHATSAPP);
        const newNote = noteWithHistory?.trim() ? `${noteWithHistory} | ${subFlowNote} | ${actionNote}` : `${subFlowNote} | ${actionNote}`;
        const res = await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            tags: "WhatsApp Flow Active",
            category: "callback",
            callbackTime: nextFollowup.toISOString(),
            whatsappFollowupStartedAt: now.toISOString(),
            note: newNote,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          onSuccess({ noReply: true, id });
          onClose();
        } else {
          setError(data?.error || `Failed (${res.status})`);
        }
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header – WhatsApp green */}
        <div className="relative flex items-center gap-3 bg-gradient-to-br from-[#25D366] to-[#128C7E] px-5 py-4">
          {(onBack != null || whatsappTried) ? (
            <button
              type="button"
              onClick={() => {
                if (whatsappTried) setWhatsappTried(false);
                else if (onBack) onBack();
                else onClose();
              }}
              className="shrink-0 rounded-full p-2 text-white/95 hover:bg-white/20 transition-colors"
              aria-label="Back"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          ) : (
            <span className="w-10 shrink-0" aria-hidden />
          )}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white tracking-tight">Incoming Off</h2>
            <p className="truncate text-sm text-white/90">{leadName} · {number}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-white/95 hover:bg-red-500/80 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto bg-slate-50/50">
        {!whatsappTried && (
          <>
        <p className="text-sm text-slate-600 leading-relaxed">
          Connect on WhatsApp and send a message. Pick a template below — it will open pre-filled in WhatsApp.
        </p>

        {/* Templates card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Templates</span>
            <button
              type="button"
              onClick={() => setShowCreateTemplate((v) => !v)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 shadow-sm"
            >
              {showCreateTemplate ? "Cancel" : "Create template"}
            </button>
            <button
              type="button"
              onClick={() => setShowChooseTemplate((v) => !v)}
              className="rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/80 transition-colors"
            >
              Choose template
            </button>
          </div>
          <div className="relative" ref={chooseTemplateRef}>
            <p className="text-sm font-semibold text-slate-800">{selectedTemplate.name}</p>
            {showChooseTemplate && (
              <div className="absolute top-full left-0 right-0 z-10 mt-2 max-h-52 overflow-auto rounded-xl border-2 border-slate-200 bg-white py-1 shadow-xl">
                {allTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(t.id);
                      setShowChooseTemplate(false);
                    }}
                    className={`block w-full px-4 py-2.5 text-left text-sm transition-colors ${
                      t.id === selectedTemplateId ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {showCreateTemplate && (
            <div className="space-y-3 mt-4 pt-4 border-t border-slate-200">
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name"
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <textarea
                value={newTemplateBody}
                onChange={(e) => setNewTemplateBody(e.target.value)}
                placeholder="Message (use {{leadName}}, {{telecallerName}}, {{companyName}})"
                rows={4}
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={handleCreateTemplate}
                className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 shadow-sm"
              >
                Save template
              </button>
            </div>
          )}
          {/* Message preview */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Message</span>
              <button
                type="button"
                onClick={() => setShowMessageEdit((v) => !v)}
                className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
              >
                {showMessageEdit ? "Done" : "Edit"}
              </button>
            </div>
            {showMessageEdit ? (
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                rows={5}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Message that will open in WhatsApp…"
              />
            ) : (
              <div className="min-h-0 h-44 min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 border-l-4 border-l-emerald-400 bg-[#f0f2f5] px-4 py-3.5 text-sm text-slate-800 leading-relaxed shadow-inner">
                <span className={`block min-w-0 break-words whitespace-pre-wrap ${editMessage ? "text-slate-800" : "text-slate-400 italic"}`}>{editMessage || "—"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Send CTA */}
        <button
          type="button"
          onClick={handleSendToWhatsApp}
          className={`flex w-full items-center justify-center gap-3 rounded-xl px-5 py-4 font-semibold text-base shadow-lg transition-all ${
            whatsappTried
              ? "border-2 border-[#25D366] bg-emerald-50 text-[#128C7E]"
              : "bg-[#25D366] text-white hover:bg-[#20BD5A] hover:shadow-xl active:scale-[0.99]"
          }`}
        >
          <svg className="h-6 w-6 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {whatsappTried ? (
            <>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366] text-white text-xs font-bold">✓</span>
              Message ready — open WhatsApp again
            </>
          ) : (
            "Send to WhatsApp"
          )}
        </button>
          </>
        )}

        {whatsappTried ? (
          <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">Did the conversation start on WhatsApp?</h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOption(selectedOption === "yes" ? null : "yes")}
                  className={`rounded-xl px-4 py-3 font-semibold transition-all ${
                    selectedOption === "yes"
                      ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30 shadow-sm"
                      : "border-2 border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOption(selectedOption === "no" ? null : "no")}
                  className={`rounded-xl px-4 py-3 font-semibold transition-all ${
                    selectedOption === "no"
                      ? "border-2 border-red-500 bg-red-50 text-red-800 ring-2 ring-red-500/30 shadow-sm"
                      : "border-2 border-slate-200 bg-slate-50 text-slate-700 hover:border-red-200 hover:bg-red-50/50"
                  }`}
                >
                  No
                </button>
              </div>
              {selectedOption === "yes" && (
                <div className="flex flex-col gap-4 pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700">Same number or another number?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setYesChoice(yesChoice === "same" ? null : "same")}
                      className={`rounded-xl px-4 py-2.5 font-medium transition-all ${
                        yesChoice === "same"
                          ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30"
                          : "border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Same number
                    </button>
                    <button
                      type="button"
                      onClick={() => setYesChoice(yesChoice === "another" ? null : "another")}
                      className={`rounded-xl px-4 py-2.5 font-medium transition-all ${
                        yesChoice === "another"
                          ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30"
                          : "border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Another number
                    </button>
                  </div>
                  {yesChoice === "same" && (
                    <button
                      onClick={handleSameNumberContinue}
                      disabled={loading}
                      className="rounded-xl bg-[#25D366] px-4 py-3 font-semibold text-white hover:bg-[#20BD5A] disabled:opacity-50 shadow-md"
                    >
                      {loading ? "Saving..." : "Confirm"}
                    </button>
                  )}
                  {yesChoice === "another" && (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-slate-600">Enter WhatsApp / calling number:</p>
                      <input
                        type="tel"
                        value={anotherNumber}
                        onChange={(e) => {
                          setAnotherNumber(e.target.value);
                          setError(null);
                        }}
                        placeholder="e.g. 9876543210"
                        className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      {error && <p className="text-sm text-red-600">{error}</p>}
                      <button
                        onClick={handleAnotherNumberSubmit}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 font-semibold text-white hover:bg-[#20BD5A] disabled:opacity-50 shadow-md"
                      >
                        {loading ? "Saving..." : (
                          <>
                            <FlowIcon flow="Connected" className="h-5 w-5 shrink-0" />
                            Save & Mark {FLOW_DISPLAY_LABELS.Connected}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {selectedOption === "no" && (
                <div className="flex flex-col gap-4 pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700">Sub flow</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSubFlow(subFlow === "WhatsApp Not Available" ? "" : "WhatsApp Not Available");
                        setError(null);
                      }}
                      className={`rounded-xl px-4 py-2.5 font-medium transition-all ${
                        subFlow === "WhatsApp Not Available"
                          ? "border-2 border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/30 shadow-sm"
                          : "border-2 border-slate-200 bg-white text-slate-700 hover:bg-amber-50"
                      }`}
                    >
                      WhatsApp Not Available
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubFlow(subFlow === "WhatsApp No Reply" ? "" : "WhatsApp No Reply");
                        setError(null);
                      }}
                      className={`rounded-xl px-4 py-2.5 font-medium transition-all ${
                        subFlow === "WhatsApp No Reply"
                          ? "border-2 border-violet-500 bg-violet-50 text-violet-900 ring-2 ring-violet-500/30 shadow-sm"
                          : "border-2 border-slate-200 bg-white text-slate-700 hover:bg-violet-50"
                      }`}
                    >
                      WhatsApp No Reply
                    </button>
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="button"
                    onClick={handleConversationNo}
                    disabled={loading || !subFlow}
                    className="rounded-xl bg-slate-800 px-4 py-3 font-semibold text-white hover:bg-slate-900 disabled:opacity-50 shadow-md"
                  >
                    {loading ? "Saving..." : "Apply"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
    </div>
  );
}
