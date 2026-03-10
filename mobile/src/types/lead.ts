export type FlowOption = "Select" | "Connected" | "Not Connected";

export type TagOption =
  | "No Answer"
  | "Switch Off"
  | "Busy IVR"
  | "Incoming Off"
  | "Invalid Number"
  | "WhatsApp Not Available"
  | "WhatsApp No Reply"
  | "Not Interested"
  | "Interested";

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
  callbackTime: string | null;
  whatsappFollowupStartedAt?: string;
  assignedTo: string;
  category: LeadCategory;
}

export const FLOW_OPTIONS: FlowOption[] = ["Select", "Connected", "Not Connected"];

export const TAG_OPTIONS: TagOption[] = [
  "No Answer",
  "Switch Off",
  "Busy IVR",
  "Incoming Off",
  "Invalid Number",
  "WhatsApp Not Available",
  "WhatsApp No Reply",
  "Not Interested",
  "Interested",
];

export const TAGS_FOR_NOT_CONNECTED: TagOption[] = [
  "No Answer",
  "Switch Off",
  "Busy IVR",
  "Incoming Off",
  "Invalid Number",
];

export const WHATSAPP_SUB_TAGS: TagOption[] = [
  "WhatsApp Not Available",
  "WhatsApp No Reply",
];

export const TAGS_FOR_CONNECTED: TagOption[] = ["Not Interested", "Interested"];

export const NOT_INTERESTED_REASONS = [
  "Budget issue",
  "Already applied to another consultancy",
  "Trust issue",
  "Client location too far",
  "Other",
] as const;

export const NOT_INTERESTED_OTHER_MIN_CHARS = 50;
