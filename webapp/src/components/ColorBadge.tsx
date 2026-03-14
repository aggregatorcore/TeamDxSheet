"use client";

import { ACTION_LABELS, TAG_COLORS } from "@/lib/constants";
import type { TagOption } from "@/types/lead";

interface ColorBadgeProps {
  tag: TagOption | "";
  category?: string;
}

export function ColorBadge({ tag, category }: ColorBadgeProps) {
  if (category === "overdue") {
    return (
      <span
        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TAG_COLORS.overdue}`}
      >
        {ACTION_LABELS.overdue}
      </span>
    );
  }
  if (!tag) return null;
  const colorClass = TAG_COLORS[tag as TagOption] ?? "bg-neutral-200 text-neutral-800";
  return (
    <span
      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}
    >
      {tag}
    </span>
  );
}
