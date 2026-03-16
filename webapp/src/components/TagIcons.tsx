"use client";

/** Icons for tag pills in LeadTable. All 24x24 outline, stroke 1.5, currentColor. */
const svgProps = { fill: "none" as const, viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IconNoAnswer({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 0 0-.38 1.21 12.035 12.035 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25h-2.25Z" /></svg>
  );
}
function IconSwitchOff({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" /></svg>
  );
}
function IconBusyIVR({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="m3 3 8.735 8.735m0 0a.374.374 0 1 1 .53.53m-.53-.53.53.53m0 0L21 21M14.652 9.348a3.75 3.75 0 0 1 0 5.304m2.121-7.425a6.75 6.75 0 0 1 0 9.546m2.121-11.667c3.808 3.807 3.808 9.98 0 13.788m-9.546-4.242a3.733 3.733 0 0 1-1.06-2.122m-1.061 4.243a6.75 6.75 0 0 1-1.625-6.929m-.496 9.05c-3.068-3.067-3.664-7.67-1.79-11.334M12 12h.008v.008H12V12Z" /></svg>
  );
}
function IconIncomingOff({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 0 0-.38 1.21 12.035 12.035 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25h-2.25Z" /></svg>
  );
}
function IconInvalidNumber({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
  );
}
function IconNotInterested({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54" /></svg>
  );
}
function IconInterested({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" /></svg>
  );
}
function IconDocumentReceived({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" /></svg>
  );
}
function IconOverdue({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
  );
}
function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
  );
}
function IconTag({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps}><path d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path d="M6 6h.008v.008H6V6Z" /></svg>
  );
}

/** Repeat/cycle icon (two curved arrows) for attempt count on tag pills. */
export function IconRepeat({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

/** Alternate repeat icon: single curved arrow in circle (refresh style). */
export function IconRepeatRefresh({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.453 3.453a4.5 4.5 0 0 0-1.043-3.177m0 0 3.182-3.182a4.5 4.5 0 0 0 1.043 3.177M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

/** Flow icon: Talk Started (baat start hui) – check in circle. */
function IconTalkStarted({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden {...svgProps}>
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

/** Flow icon: Talk Not Started (baat start nhi hui) – X in circle. */
function IconTalkNotStarted({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden {...svgProps}>
      <path d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

const TAG_ICON_MAP: Record<string, ({ className }: { className?: string }) => JSX.Element> = {
  "No Answer": IconNoAnswer,
  "Switch Off": IconSwitchOff,
  "Busy IVR": IconBusyIVR,
  "Incoming Off": IconIncomingOff,
  "Invalid Number": IconInvalidNumber,
  "WhatsApp Flow Active": IconChat,
  "Not Interested": IconNotInterested,
  Interested: IconInterested,
  "Document received": IconDocumentReceived,
  overdue: IconOverdue,
  "WhatsApp No Reply": IconChat,
  "WhatsApp Not Available": IconChat,
};

export function TagIcon({ tag, className }: { tag: string; className?: string }) {
  const Icon = TAG_ICON_MAP[tag] ?? IconTag;
  return <Icon className={className} />;
}

/** Flow icons: Talk Started (Connected), Talk Not Started (Not Connected). */
const FLOW_ICON_MAP: Record<string, ({ className }: { className?: string }) => JSX.Element> = {
  Connected: IconTalkStarted,
  "Not Connected": IconTalkNotStarted,
};

export function FlowIcon({ flow, className }: { flow: string; className?: string }) {
  const Icon = FLOW_ICON_MAP[flow] ?? IconTag;
  return <Icon className={className} />;
}
