"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { TagOption } from "@/types/lead";
import { openWhatsApp, getWaChatUrl } from "@/lib/whatsapp";
import { ACTION_NOTE_PREFIX, CYCLE_NAME_WHATSAPP, SUBTAG_NOTE_PREFIX, WHATSAPP_DEFAULT_TEMPLATE, WHATSAPP_FOLLOWUP_HOURS } from "@/lib/constants";
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
  onClose: () => void;
  onSuccess: (movedToExhaust?: { id: string; name: string; number: string; tags: string }) => void;
}

const DEFAULT_TEMPLATE_ID = "incoming-off";

export function WhatsAppModal({
  leadName,
  number,
  id,
  note = "",
  onClose,
  onSuccess,
}: WhatsAppModalProps) {
  const [whatsappTried, setWhatsappTried] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"yes" | "no" | null>(null);
  const [yesChoice, setYesChoice] = useState<"same" | "another" | null>(null);
  const [anotherNumber, setAnotherNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subTag, setSubTag] = useState<TagOption | "">("");
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
    if (!subTag) return;
    setError(null);
    setLoading(true);
    try {
      if (subTag === "WhatsApp Not Available") {
        const actionNote = `${ACTION_NOTE_PREFIX}${subTag}`;
        const subTagNote = `${SUBTAG_NOTE_PREFIX}${subTag}`;
        const noteWithHistory = appendTagHistory(note ?? "", CYCLE_NAME_WHATSAPP);
        const newNote = noteWithHistory?.trim() ? `${noteWithHistory} | ${subTagNote} | ${actionNote}` : `${subTagNote} | ${actionNote}`;
        const res = await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, tags: "WhatsApp Flow Active", moveToAdminWithTag: true, note: newNote }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          onSuccess({ id, name: leadName, number, tags: "WhatsApp Flow Active" });
          onClose();
        } else {
          setError(data?.error || `Failed (${res.status})`);
        }
        return;
      }
      if (subTag === "WhatsApp No Reply") {
        const now = new Date();
        const nextFollowup = new Date(now.getTime() + WHATSAPP_FOLLOWUP_HOURS * 60 * 60 * 1000);
        const actionNote = `${ACTION_NOTE_PREFIX}Followup in ${WHATSAPP_FOLLOWUP_HOURS}hr`;
        const subTagNote = `${SUBTAG_NOTE_PREFIX}${subTag}`;
        const noteWithHistory = appendTagHistory(note ?? "", CYCLE_NAME_WHATSAPP);
        const newNote = noteWithHistory?.trim() ? `${noteWithHistory} | ${subTagNote} | ${actionNote}` : `${subTagNote} | ${actionNote}`;
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
          onSuccess();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center gap-2 bg-gradient-to-br from-slate-700 to-slate-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 text-white/90 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">Incoming Off</h2>
              <p className="truncate text-xs text-slate-300">{leadName} • {number}</p>
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

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
        <p className="text-sm text-slate-600">
          Try to connect on WhatsApp and send message on WhatsApp. Select a template and send – the message will open in WhatsApp&apos;s type box.
        </p>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-700">Templates</p>
            <button
              type="button"
              onClick={() => setShowCreateTemplate((v) => !v)}
              className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              {showCreateTemplate ? "Cancel" : "Create template"}
            </button>
          </div>
          <div className="relative" ref={chooseTemplateRef}>
            <button
              type="button"
              onClick={() => setShowChooseTemplate((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <span>Choose template</span>
              <span className="text-slate-500">({selectedTemplate.name})</span>
              <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${showChooseTemplate ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showChooseTemplate && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {allTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(t.id);
                      setShowChooseTemplate(false);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      t.id === selectedTemplateId ? "bg-green-50 font-medium text-green-800" : "text-slate-800"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {showCreateTemplate && (
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
              />
              <textarea
                value={newTemplateBody}
                onChange={(e) => setNewTemplateBody(e.target.value)}
                placeholder="Message (use {{leadName}}, {{telecallerName}}, {{companyName}})"
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleCreateTemplate}
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save template
              </button>
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-600">Message</label>
              <button
                type="button"
                onClick={() => setShowMessageEdit((v) => !v)}
                className="rounded bg-slate-600 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
              >
                {showMessageEdit ? "Done" : "Edit"}
              </button>
            </div>
            {showMessageEdit ? (
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="Message that will open in WhatsApp…"
              />
            ) : (
              <div className="flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const idx = allTemplates.findIndex((t) => t.id === selectedTemplateId);
                    const prevIdx = idx <= 0 ? allTemplates.length - 1 : idx - 1;
                    setSelectedTemplateId(allTemplates[prevIdx].id);
                  }}
                  className="shrink-0 rounded-l-lg border border-slate-200 bg-slate-100 px-2 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                  aria-label="Previous template"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="min-h-0 min-w-0 h-48 flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 whitespace-pre-wrap">
                  {editMessage || "—"}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const idx = allTemplates.findIndex((t) => t.id === selectedTemplateId);
                    const nextIdx = (idx + 1) % allTemplates.length;
                    setSelectedTemplateId(allTemplates[nextIdx].id);
                  }}
                  className="shrink-0 rounded-r-lg border border-slate-200 bg-slate-100 px-2 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                  aria-label="Next template"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSendToWhatsApp}
          className={`mb-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium ${
            whatsappTried
              ? "border-2 border-green-500 bg-green-50 text-green-800"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {whatsappTried ? (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold">✓</span>
              Send to WhatsApp (message in type box)
            </>
          ) : (
            "Send to WhatsApp"
          )}
        </button>

        {whatsappTried ? (
          <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="mb-3 text-sm font-medium text-neutral-800">Did WhatsApp conversation start?</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOption(selectedOption === "yes" ? null : "yes")}
                  className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                    selectedOption === "yes"
                      ? "border-2 border-green-500 bg-green-100 text-green-800 ring-2 ring-green-500/30"
                      : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOption(selectedOption === "no" ? null : "no")}
                  className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                    selectedOption === "no"
                      ? "border-2 border-red-500 bg-red-100 text-red-800 ring-2 ring-red-500/30"
                      : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                  }`}
                >
                  No
                </button>
              </div>
              {selectedOption === "yes" && (
                <div className="flex flex-col gap-3 pt-2 border-t border-neutral-200">
                  <p className="text-sm font-medium text-neutral-800">Same number continue or Another number?</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setYesChoice(yesChoice === "same" ? null : "same")}
                      className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                        yesChoice === "same"
                          ? "border-2 border-green-500 bg-green-100 text-green-800 ring-2 ring-green-500/30"
                          : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      Same number continue
                    </button>
                    <button
                      type="button"
                      onClick={() => setYesChoice(yesChoice === "another" ? null : "another")}
                      className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                        yesChoice === "another"
                          ? "border-2 border-green-500 bg-green-100 text-green-800 ring-2 ring-green-500/30"
                          : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      Another number
                    </button>
                  </div>
                  {yesChoice === "same" && (
                    <button
                      onClick={handleSameNumberContinue}
                      disabled={loading}
                      className="rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Confirm"}
                    </button>
                  )}
                  {yesChoice === "another" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-neutral-600">Enter WhatsApp / calling working number from client:</p>
                      <input
                        type="tel"
                        value={anotherNumber}
                        onChange={(e) => {
                          setAnotherNumber(e.target.value);
                          setError(null);
                        }}
                        placeholder="e.g. 9876543210"
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                      {error && <p className="text-sm text-red-600">{error}</p>}
                      <button
                        onClick={handleAnotherNumberSubmit}
                        disabled={loading}
                        className="rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? "Saving..." : "Save & Mark Connected"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {selectedOption === "no" && (
                <div className="flex flex-col gap-3 pt-2 border-t border-neutral-200">
                  <p className="text-sm font-medium text-neutral-800">Sub-tag</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSubTag(subTag === "WhatsApp Not Available" ? "" : "WhatsApp Not Available");
                        setError(null);
                      }}
                      className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                        subTag === "WhatsApp Not Available"
                          ? "border-2 border-amber-500 bg-amber-100 text-amber-900 ring-2 ring-amber-500/30 shadow-sm"
                          : "border-2 border-transparent border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      WhatsApp Not Available
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubTag(subTag === "WhatsApp No Reply" ? "" : "WhatsApp No Reply");
                        setError(null);
                      }}
                      className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                        subTag === "WhatsApp No Reply"
                          ? "border-2 border-violet-500 bg-violet-100 text-violet-900 ring-2 ring-violet-500/30 shadow-sm"
                          : "border-2 border-transparent border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      WhatsApp No Reply
                    </button>
                  </div>
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleConversationNo}
                    disabled={loading || !subTag}
                    className="rounded-lg bg-neutral-800 px-4 py-2.5 font-medium text-white hover:bg-neutral-900 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Apply"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
