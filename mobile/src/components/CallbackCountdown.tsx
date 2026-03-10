import React from "react";
import { Text, StyleSheet } from "react-native";
import { useCountdown } from "../hooks/useCountdown";

interface CallbackCountdownProps {
  callbackTime: string | null;
  isBlink?: boolean;
}

export function CallbackCountdown({
  callbackTime,
  isBlink = false,
}: CallbackCountdownProps) {
  const countdown = useCountdown(callbackTime);
  const isCallNow = countdown === "Call Now";
  const isOverdue = countdown === "Overdue";

  if (!callbackTime) return null;

  return (
    <>
      <Text
        style={[
          styles.countdown,
          isBlink && styles.blink,
          isCallNow && styles.callNow,
          isOverdue && styles.overdue,
        ]}
      >
        {countdown || "..."}
      </Text>
      <Text style={styles.time}>
        {new Date(callbackTime).toLocaleString()}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  countdown: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    fontVariant: ["tabular-nums"],
  },
  blink: {
    color: "#B45309",
  },
  callNow: {
    color: "#B45309",
  },
  overdue: {
    color: "#B91C1C",
  },
  time: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
});
