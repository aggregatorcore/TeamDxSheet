import type { TagOption, ActionType } from "@/types/lead";
import type { FlowOption } from "@/types/lead";

const badgeBase = "font-semibold shadow-sm rounded-md";
export const FLOW_COLORS: Record<FlowOption, string> = {
  Connected: `bg-emerald-500 text-white border border-emerald-600 ${badgeBase}`,
  "Not Connected": `bg-red-500 text-white border border-red-600 ${badgeBase}`,
};

export const TAG_COLORS: Record<TagOption | "overdue", string> = {
  "No Answer": `bg-blue-500 text-white border border-blue-600 ${badgeBase}`,
  "Switch Off": `bg-amber-500 text-white border border-amber-600 ${badgeBase}`,
  "Busy IVR": `bg-orange-500 text-white border border-orange-600 ${badgeBase}`,
  "Incoming Off": `bg-sky-500 text-white border border-sky-600 ${badgeBase}`,
  "Invalid Number": `bg-red-400 text-white border border-red-500 ${badgeBase}`,
  "WhatsApp Flow Active": `bg-emerald-500 text-white border border-emerald-600 ${badgeBase}`,
  "Not Interested": `bg-slate-500 text-white border border-slate-600 ${badgeBase}`,
  Interested: `bg-emerald-500 text-white border border-emerald-600 ${badgeBase}`,
  overdue: `bg-red-600 text-white border border-red-700 ${badgeBase}`,
};

/** Display labels for root flows (Talk Started / Talk Not Started). Use in UI; API/DB still use Connected | Not Connected. */
export const FLOW_DISPLAY_LABELS: Record<FlowOption, string> = {
  Connected: "Talk Started",
  "Not Connected": "Talk Not Started",
};

/** Text-only colors for Flow in table (no button/badge style) */
export const FLOW_TEXT_COLORS: Record<FlowOption, string> = {
  Connected: "text-emerald-600",
  "Not Connected": "text-red-600",
};

/** Tag pill style in table: bold text only, no background/border. Use with rounded-full px-2 py-0.5 text-[11px] font-bold. */
export const TAG_TEXT_COLORS: Record<TagOption | "overdue", string> = {
  "No Answer": "text-blue-900",
  "Switch Off": "text-amber-900",
  "Busy IVR": "text-orange-800",
  "Incoming Off": "text-sky-800",
  "Invalid Number": "text-red-800",
  "WhatsApp Flow Active": "text-emerald-800",
  "Not Interested": "text-slate-800",
  Interested: "text-emerald-800",
  overdue: "text-red-800",
};

/** Sub-flow pill style (WhatsApp Flow Active + Interested sub-flows). Document received is Interested sub-flow, not tag. */
export const SUBFLOW_TEXT_COLORS: Record<string, string> = {
  "WhatsApp No Reply": "text-violet-800",
  "WhatsApp Not Available": "text-purple-800",
  "Document received": "text-teal-800",
};

/** Global: display labels for user actions. Use everywhere for Callback, Followup, Try WhatsApp, Move buckets, Overdue. */
export const ACTION_LABELS: Record<ActionType, string> = {
  callback: "Callback",
  followup: "Followup",
  move_review: "Move to Review",
  move_green: "Move to Green",
  move_exhaust: "Move to Exhaust",
  try_whatsapp: "Try WhatsApp",
  overdue: "Overdue",
};

/** Global: sub-labels for callback action (Call Now, Schedule callback) and move_exhaust (Mark Invalid). */
export const CALL_NOW_LABEL = "Call Now";
export const SCHEDULE_CALLBACK_LABEL = "Schedule callback";
export const MARK_INVALID_LABEL = "Mark Invalid";

/** Global: bucket names for overlays/headers (Review, Green, Exhaust, New Assigned). */
export const BUCKET_LABELS = {
  review: "Review",
  green: "Green",
  exhaust: "Exhaust",
  newAssigned: "New Assigned",
} as const;

export const GRACE_PERIOD_HOURS = 2;

/**
 * Cycle open/closed rule (timeline, LeadDetailModal): A cycle stays OPEN until a tag is applied again (same or other).
 * Cycle closes only when: same tag applied again (new attempt) OR a different tag applied.
 * Overdue / countdown completion does NOT close the cycle.
 */

/** TagHistory value when Try WhatsApp → Conversation start Yes. Timeline shows as "WhatsApp cycle". */
export const CYCLE_NAME_WHATSAPP = "WhatsApp";

/** Default WhatsApp message template for Incoming Off – placeholders: {{leadName}}, {{telecallerName}}, {{companyName}} */
export const WHATSAPP_DEFAULT_TEMPLATE = "Hi {{leadName}}, I am trying to call your number but your number is incoming off. I am {{telecallerName}} from {{companyName}}. Are you looking for abroad visa?";

/** How many seconds before callback time to start blinking */
export const BLINK_BEFORE_SECONDS = 30;

/** WhatsApp No Reply: followup interval in hours */
export const WHATSAPP_FOLLOWUP_HOURS = 1;

/** WhatsApp No Reply: max days before lead hides */
export const WHATSAPP_FOLLOWUP_MAX_DAYS = 2;

/**
 * Auto-schedule rule (global): No Answer, Switch Off, Busy IVR cycles.
 * Attempt 1 = 2h, Attempt 2 = 8h, Attempt 3 = 12h from now; backend applies shift logic.
 * Index 0 = attempt 1, index 1 = attempt 2, index 2 = attempt 3.
 */
export const CALLBACK_AUTO_SCHEDULE_HOURS = [2, 8, 12] as const;

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

/** Trade/field options by category for Interested flow */
export const TRADE_CATEGORIES: Record<string, string[]> = {
  Construction: [
    "Mason", "Painter", "Construction Worker", "Scaffolder", "Rigger",
    "Heavy Equipment Operator", "Crane Operator", "Forklift Operator",
    "Foreman", "Site Supervisor", "Civil Supervisor", "Brick Layer",
    "Tiles Fitter", "Marble Fitter", "Cement Worker", "Steel Fixer",
    "Shuttering Carpenter", "Road Construction Worker", "Building Painter",
  ],
  "Electrical & HVAC": [
    "Electrician", "AC Technician", "HVAC Technician", "Solar Technician",
    "Wireman", "Electrical Fitter", "Panel Fitter", "Maintenance Electrician",
  ],
  Plumbing: [
    "Plumber", "Pipe Fitter", "Drainage Worker", "Water Line Fitter",
  ],
  "Metal & Manufacturing": [
    "Welder", "Fitter", "Turner", "CNC Operator", "Fabricator",
    "Machinist", "Grinder", "Millwright", "Tool Maker", "Sheet Metal Worker",
    "Lathe Operator", "Drilling Operator", "Assembly Worker",
  ],
  "Wood & Carpentry": [
    "Carpenter", "Furniture Maker", "Wood Carver", "Cabinet Maker",
  ],
  Automotive: [
    "Mechanic", "Driver", "Auto Electrician", "Diesel Mechanic",
    "Tyre Technician", "Auto Body Painter", "Vehicle Cleaner",
  ],
  "Hospitality & Food": [
    "Cook", "Chef", "Kitchen Helper", "Waiter", "Housekeeping",
    "Hotel Staff", "Catering Worker", "Baker", "Butler",
  ],
  "Personal Care": [
    "Tailor", "Barber", "Beautician", "Hair Stylist", "Spa Therapist",
    "Massage Therapist", "Salon Worker",
  ],
  Healthcare: [
    "Nurse", "Caregiver", "Lab Technician", "Pharmacy Assistant",
    "Medical Assistant", "Hospital Attendant", "Home Care Worker",
  ],
  "Security & Facilities": [
    "Security Guard", "Gardener", "Housekeeping", "Facility Supervisor",
    "Gate Keeper", "Parking Attendant",
  ],
  "Sales & Admin": [
    "Sales", "Retail", "Warehouse", "Supervisor", "Store Keeper",
    "Office Boy", "Receptionist", "Data Entry", "Accountant",
  ],
  Other: ["Other"],
};

/** All trade/field options flattened (for searchable dropdown) */
export const TRADE_FIELDS: string[] = [
  ...new Set(
    Object.values(TRADE_CATEGORIES).flat().sort((a, b) => a.localeCompare(b))
  ),
];

/** Visa types for Interested flow */
export const VISA_TYPES: string[] = [
  "Work Visa", "Skilled Worker", "Student Visa", "Tourist Visa",
  "Business Visa", "Family Visa", "Permanent Residence", "Other",
];

/** Global: prefix for action note in lead.note (e.g. "Action: Asked client to share documents") */
export const ACTION_NOTE_PREFIX = "Action: ";

/** Prefix for user-written manual note in lead.note. Only this part is editable in NoteEditModal. */
export const MANUAL_NOTE_PREFIX = "Manual: ";

/** Prefix for WhatsApp Flow Active sub-flow in lead.note (SubFlow: WhatsApp No Reply). Legacy notes may use "SubTag: ". */
export const SUBFLOW_NOTE_PREFIX = "SubFlow: ";

/** Action that gets default 1hr followup countdown when selected */
export const INTERESTED_ACTION_DEFAULT_FOLLOWUP_1HR = "Asked client to share documents";

/** Global: action notes for Interested flow – single source of truth. Use INTERESTED_ACTIONS everywhere. */
export const INTERESTED_ACTIONS: string[] = [
  "Asked client to share documents",
  "Client said they will share something with us",
  "Client will discuss and tell later",
  "Client has trust issues",
  "Client wants to visit",
  "Document received",
];

/** No passport script for Interested flow */
export const NO_PASSPORT_SCRIPT =
  "Sorry, without passport process nahi kiya ja sakta. Aap passport banwa kar phir contact karein.";

/** All world countries (for Place / location dropdown) */
export const WORLD_COUNTRIES: string[] = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho",
  "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea",
  "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "UAE", "Uganda", "UK", "Ukraine", "USA", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

/** Target country options for Interested flow (all world countries) */
export const TARGET_COUNTRIES: string[] = [...WORLD_COUNTRIES].sort();

/** Place options for Interested flow (India states/UTs/cities + all world countries) */
export const PLACE_OPTIONS: string[] = [
  ...INDIA_STATES_AND_TERRITORIES.States,
  ...INDIA_STATES_AND_TERRITORIES["Union Territories"],
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune",
  "Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal",
  "Ludhiana", "Amritsar", "Jalandhar", "Patna", "Ranchi", "Bhubaneswar",
  ...WORLD_COUNTRIES,
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
