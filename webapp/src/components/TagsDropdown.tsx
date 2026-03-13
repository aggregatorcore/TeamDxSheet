"use client";

import { TAGS_FOR_NOT_CONNECTED, TAGS_FOR_CONNECTED } from "@/types/lead";
import { TAG_COLORS } from "@/lib/constants";
import type { TagOption } from "@/types/lead";

interface TagsDropdownProps {
  value: TagOption | "";
  flow: string;
  onChange: (value: TagOption | "") => void;
  disabled?: boolean;
}

export function TagsDropdown({
  value,
  flow,
  onChange,
  disabled,
}: TagsDropdownProps) {
  const show = flow === "Not Connected" || flow === "Connected";
  if (!show) return null;

  const options = flow === "Connected" ? TAGS_FOR_CONNECTED : TAGS_FOR_NOT_CONNECTED;
  const displayValue = value;
  const colorClass = displayValue ? TAG_COLORS[displayValue] : "bg-neutral-100 text-neutral-700 border-neutral-300";

  return (
    <select
      value={displayValue}
      onChange={(e) => onChange((e.target.value || "") as TagOption | "")}
      disabled={disabled}
      className={`rounded border px-1.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      <option value="">Select tag</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
