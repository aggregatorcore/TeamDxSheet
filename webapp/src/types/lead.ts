/** Global: only 2 flows – Connected, Not Connected. No "Select". */
export type FlowOption = "Connected" | "Not Connected";

/** Global: all tags – single source of truth. Use TAG_OPTIONS / TAGS_FOR_* everywhere. */
export type TagOption =
  | "No Answer"
  | "Switch Off"
  | "Busy IVR"
  | "Incoming Off"
  | "Invalid Number"
  | "WhatsApp Flow Active"
  | "Not Interested"
  | "Interested"
  | "Document received";

/** Sub-tags under WhatsApp Flow Active only (not in TAG_OPTIONS). */
export type WhatsAppSubTag = "WhatsApp Not Available" | "WhatsApp No Reply";

export type LeadCategory = "active" | "callback" | "overdue";

export interface Lead {
  id: string;
  rowIndex?: number;
  source: string;
  name: string;
  place: string;
  number: string;
  flow: FlowOption;
  tags: TagOption | "";
  note?: string;
  callbackTime: string;
  whatsappFollowupStartedAt?: string;
  assignedTo: string;
  category: LeadCategory;
  /** When lead was created in system (ISO string). For timeline. */
  createdAt?: string;
}

export const FLOW_OPTIONS: FlowOption[] = ["Connected", "Not Connected"];

export const TAG_OPTIONS: TagOption[] = [
  "No Answer",
  "Switch Off",
  "Busy IVR",
  "Incoming Off",
  "Invalid Number",
  "WhatsApp Flow Active",
  "Not Interested",
  "Interested",
  "Document received",
];

/** Sub-tags under tag "WhatsApp Flow Active". Not standalone tags. */
export const WHATSAPP_SUB_TAGS: WhatsAppSubTag[] = ["WhatsApp Not Available", "WhatsApp No Reply"];

export const TAGS_FOR_NOT_CONNECTED: TagOption[] = [
  "No Answer",
  "Switch Off",
  "Busy IVR",
  "Incoming Off",
  "Invalid Number",
];

export const TAGS_FOR_CONNECTED: TagOption[] = ["Not Interested", "Interested", "Document received"];

/** Tags that allow scheduling a callback (No Answer cycle – Not Connected sub-set). Global: use for schedule step. */
export const TAGS_SCHEDULEABLE_CALLBACK: TagOption[] = ["No Answer", "Switch Off", "Busy IVR"];

/** When lead has tag "WhatsApp Flow Active", sub-tag stored in note (SubTag: WhatsApp No Reply) or legacy tags "Incoming Off" + whatsappFollowupStartedAt. */
export const WHATSAPP_FOLLOWUP_TAG_DISPLAY = "WhatsApp No Reply";

export const NOT_INTERESTED_REASONS = [
  "Budget issue",
  "Already applied to another consultancy",
  "Trust issue",
  "Client location too far",
  "Other",
] as const;

export const NOT_INTERESTED_OTHER_MIN_CHARS = 50;

/** Global: user actions (what user can do) – Callback, Followup, Move buckets, Try WhatsApp. Single source of truth. */
export type ActionType =
  | "callback"
  | "followup"
  | "move_review"
  | "move_green"
  | "move_exhaust"
  | "try_whatsapp";

export const ACTIONS: ActionType[] = [
  "callback",
  "followup",
  "move_review",
  "move_green",
  "move_exhaust",
  "try_whatsapp",
];
