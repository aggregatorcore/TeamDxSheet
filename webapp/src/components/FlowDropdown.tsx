"use client";

import { FLOW_OPTIONS } from "@/types/lead";
import { FLOW_COLORS, FLOW_DISPLAY_LABELS } from "@/lib/constants";
import type { FlowOption } from "@/types/lead";
import { FlowIcon } from "./TagIcons";

interface FlowDropdownProps {
  value: FlowOption;
  onChange: (value: FlowOption) => void;
  disabled?: boolean;
}

export function FlowDropdown({ value, onChange, disabled }: FlowDropdownProps) {
  const colorClass = FLOW_COLORS[value] ?? FLOW_COLORS["Not Connected"];
  return (
    <div className="inline-flex items-center gap-1.5">
      <FlowIcon flow={value} className="h-4 w-4 shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FlowOption)}
        disabled={disabled}
        className={`rounded border px-1.5 py-0.5 text-xs font-medium ${colorClass}`}
      >
        {FLOW_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {FLOW_DISPLAY_LABELS[opt]}
          </option>
        ))}
      </select>
    </div>
  );
}
