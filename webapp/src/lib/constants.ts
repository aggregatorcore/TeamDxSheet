import type { TagOption } from "@/types/lead";
import type { FlowOption } from "@/types/lead";

export const FLOW_COLORS: Record<FlowOption, string> = {
  Select: "bg-neutral-100 text-neutral-700 border-neutral-300",
  Connected: "bg-emerald-100 text-emerald-800 border-emerald-400",
  "Not Connected": "bg-amber-100 text-amber-800 border-amber-400",
};

export const TAG_COLORS: Record<TagOption | "overdue", string> = {
  "No Answer": "bg-blue-200 text-blue-900 border-blue-400",
  "Switch Off": "bg-amber-200 text-amber-900 border-amber-400",
  "Busy IVR": "bg-orange-200 text-orange-900 border-orange-400",
  "Incoming Off": "bg-sky-200 text-sky-900 border-sky-400",
  "Invalid Number": "bg-red-200 text-red-900 border-red-400",
  "WhatsApp Not Available": "bg-purple-200 text-purple-900 border-purple-400",
  "WhatsApp No Reply": "bg-violet-200 text-violet-900 border-violet-400",
  "Not Interested": "bg-slate-200 text-slate-900 border-slate-400",
  Interested: "bg-emerald-200 text-emerald-900 border-emerald-400",
  overdue: "bg-red-300 text-red-950 border-red-500",
};

export const GRACE_PERIOD_HOURS = 2;

/** How many seconds before callback time to start blinking */
export const BLINK_BEFORE_SECONDS = 30;

/** WhatsApp No Reply: followup interval in hours */
export const WHATSAPP_FOLLOWUP_HOURS = 1;

/** WhatsApp No Reply: max days before lead hides */
export const WHATSAPP_FOLLOWUP_MAX_DAYS = 2;

/** @deprecated Use openWhatsApp from @/lib/whatsapp instead */
export const WA_TAB_TARGET = "whatsapp_tab";

/** Preferred countries for Budget issue (India excluded), grouped by category */
export const PREFERRED_COUNTRIES: Record<string, string[]> = {
  Schengen: [
    "Austria", "Belgium", "Czech Republic", "Denmark", "Estonia", "Finland",
    "France", "Germany", "Greece", "Hungary", "Iceland", "Italy", "Latvia",
    "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Netherlands",
    "Norway", "Poland", "Portugal", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland",
  ],
  "Non-Schengen": [
    "UK", "Ireland", "Romania", "Bulgaria", "Croatia", "Cyprus",
    "Canada", "Australia", "USA", "New Zealand", "Japan", "South Korea",
    "Singapore", "Malaysia", "Thailand", "Philippines", "Indonesia",
  ],
  Gulf: [
    "UAE", "Saudi Arabia", "Qatar", "Bahrain", "Kuwait", "Oman",
  ],
  Arab: [
    "Egypt", "Jordan", "Lebanon", "Morocco", "Tunisia", "Algeria",
    "Iraq", "Syria", "Yemen", "Libya", "Sudan", "Palestine",
  ],
};

/** India states and union territories for Client location too far */
export const INDIA_STATES_AND_TERRITORIES: Record<string, string[]> = {
  States: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  ],
  "Union Territories": [
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
  ],
};

/** Target countries for Interested flow (flattened) */
export const TARGET_COUNTRIES: string[] = [
  ...PREFERRED_COUNTRIES.Schengen,
  ...PREFERRED_COUNTRIES["Non-Schengen"],
  ...PREFERRED_COUNTRIES.Gulf,
  ...PREFERRED_COUNTRIES.Arab,
].sort();

/** Trade/field options for Interested - Now working */
export const TRADE_FIELDS: string[] = [
  "Electrician", "Plumber", "Carpenter", "Welder", "Mason", "Painter",
  "Mechanic", "Driver", "Cook", "Tailor", "Barber", "Beautician",
  "AC Technician", "Fitter", "Turner", "CNC Operator", "Fabricator",
  "HVAC Technician", "Solar Technician", "Security Guard", "Housekeeping",
  "Gardener", "Construction Worker", "Scaffolder", "Rigger",
  "Heavy Equipment Operator", "Crane Operator", "Forklift Operator",
  "Nurse", "Caregiver", "Lab Technician", "Pharmacy Assistant",
  "Sales", "Retail", "Warehouse", "Supervisor", "Foreman",
  "Other",
];

/** Visa types for Interested flow */
export const VISA_TYPES: string[] = [
  "Work Visa", "Skilled Worker", "Student Visa", "Tourist Visa",
  "Business Visa", "Family Visa", "Permanent Residence", "Other",
];

/** Actions for Interested flow */
export const INTERESTED_ACTIONS: string[] = [
  "Asked client to share documents",
  "Client said they will share something with us",
  "Client will discuss and tell later",
  "Client has trust issues",
  "Client wants to visit",
];

/** No passport script for Interested flow */
export const NO_PASSPORT_SCRIPT =
  "Sorry, without passport process nahi kiya ja sakta. Aap passport banwa kar phir contact karein.";

/** Place options for Interested flow (States + UTs + major cities) */
export const PLACE_OPTIONS: string[] = [
  ...INDIA_STATES_AND_TERRITORIES.States,
  ...INDIA_STATES_AND_TERRITORIES["Union Territories"],
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune",
  "Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal",
  "Ludhiana", "Amritsar", "Jalandhar", "Patna", "Ranchi", "Bhubaneswar",
  "Other",
].sort();

/** Qualification options for Interested flow */
export const QUALIFICATION_OPTIONS: string[] = [
  "8th", "10th", "12th", "ITI", "Diploma", "Graduation", "Post Graduation", "Other",
];

/** Work experience range options (years) */
export const WORK_EXP_YEARS: string[] = ["0", "1", "2", "3", "5", "10", "15+"];

/** Budget range options (in Lakhs) */
export const BUDGET_OPTIONS: string[] = [
  "50k", "75k", "1L", "1.25L", "1.5L", "2L", "2.5L", "3L", "4L", "5L+",
];

/** Previous travel duration options */
export const PREV_TRAVEL_DURATION: string[] = [
  "1 week", "2 weeks", "1 month", "3 months", "6 months", "1 year", "2 years", "Other",
];

/** Max countries for previous travel (1-5) */
export const PREV_TRAVEL_COUNT_OPTIONS = [1, 2, 3, 4, 5] as const;

/** Rejection reasons for Interested flow */
export const REJECTION_REASONS: string[] = [
  "Visa rejected",
  "Documents insufficient",
  "Interview failed",
  "Financial proof insufficient",
  "Medical failed",
  "Background check failed",
  "Other",
];
