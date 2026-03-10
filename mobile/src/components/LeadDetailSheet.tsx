import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from "react-native";
import * as Linking from "expo-linking";
import type { Lead, FlowOption, TagOption } from "../types/lead";
import {
  TAGS_FOR_NOT_CONNECTED,
  TAGS_FOR_CONNECTED,
} from "../types/lead";

/** Mobile: only Connected & Not Connected (no Select) */
const FLOW_OPTIONS_MOBILE: FlowOption[] = ["Connected", "Not Connected"];
import { useCountdown } from "../hooks/useCountdown";
import { BLINK_BEFORE_SECONDS, GRACE_PERIOD_HOURS } from "../lib/constants";

/** Clean number for tel: - digits only, take first segment if multiple */
export function getTelNumber(raw: string): string {
  const first = raw.replace(/\s/g, "").split(",")[0] ?? "";
  return first.replace(/\D/g, "");
}

/** Number for WhatsApp: digits only, prepend 91 if 10 digits */
export function getWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

function isBlinkTime(callbackTime: string | null): boolean {
  if (!callbackTime) return false;
  const d = new Date(callbackTime).getTime();
  const now = Date.now();
  const blinkStart = d - BLINK_BEFORE_SECONDS * 1000;
  const graceEnd = d + GRACE_PERIOD_HOURS * 60 * 60 * 1000;
  return now >= blinkStart && now <= graceEnd;
}

interface LeadDetailSheetProps {
  lead: Lead;
  visible: boolean;
  onClose: () => void;
  onFlowChange?: (lead: Lead, flow: FlowOption) => void;
  onTagSelect?: (lead: Lead, tag: TagOption | "") => void;
  onScheduleCallback?: (lead: Lead) => void;
  onMarkInvalid?: (lead: Lead) => void;
  onDocumentReceived?: (lead: Lead) => void;
  updating?: boolean;
}

export function LeadDetailSheet({
  lead,
  visible,
  onClose,
  onFlowChange,
  onTagSelect,
  onScheduleCallback,
  onMarkInvalid,
  onDocumentReceived,
  updating = false,
}: LeadDetailSheetProps) {
  const telNumber = getTelNumber(lead.number);
  const waNumber = getWhatsAppNumber(lead.number);
  const countdown = useCountdown(lead.callbackTime);
  const isCallNow = countdown === "Call Now";
  const isOverdue = countdown === "Overdue";
  const isCounting = !isCallNow && !isOverdue && countdown;
  const blink = lead.callbackTime && isBlinkTime(lead.callbackTime);
  const tagOptions =
    lead.flow === "Connected" ? TAGS_FOR_CONNECTED : TAGS_FOR_NOT_CONNECTED;
  const showTags = lead.flow === "Not Connected" || lead.flow === "Connected";

  const handleCall = () => {
    if (telNumber) Linking.openURL(`tel:${telNumber}`);
    onClose();
  };

  const handleWhatsApp = () => {
    if (waNumber) Linking.openURL(`whatsapp://send?phone=${waNumber}`);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {lead.name || "No name"}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={[styles.topBtn, styles.callBtn]}
              onPress={handleCall}
              disabled={!telNumber}
            >
              <Text style={styles.topBtnText}>
                {isCallNow ? "Call Now" : "Call"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.topBtn, styles.waBtn]}
              onPress={handleWhatsApp}
              disabled={!waNumber}
            >
              <Text style={styles.topBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.body}>
              {lead.source ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Source</Text>
                  <Text style={styles.value}>{lead.source}</Text>
                </View>
              ) : null}
              {lead.place ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Place</Text>
                  <Text style={styles.value}>{lead.place}</Text>
                </View>
              ) : null}
              <View style={styles.row}>
                <Text style={styles.label}>Number</Text>
                <Text style={styles.value}>{lead.number || "—"}</Text>
              </View>

              {onFlowChange ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Flow</Text>
                  <View style={styles.chipRow}>
                    {FLOW_OPTIONS_MOBILE.map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[
                          styles.chip,
                          lead.flow === f && f === "Connected" && styles.chipGreen,
                          lead.flow === f && f === "Not Connected" && styles.chipRed,
                          updating && styles.chipDisabled,
                        ]}
                        onPress={() => onFlowChange(lead, f)}
                        disabled={updating}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            lead.flow === f && styles.chipTextActive,
                          ]}
                        >
                          {f}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.row}>
                  <Text style={styles.label}>Flow</Text>
                  <Text style={styles.value}>{lead.flow}</Text>
                </View>
              )}

              {showTags && onTagSelect ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Tag</Text>
                  <View style={styles.chipRow}>
                    {tagOptions.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.chip,
                          lead.tags === t && styles.chipActive,
                          updating && styles.chipDisabled,
                        ]}
                        onPress={() => onTagSelect(lead, t)}
                        disabled={updating}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            lead.tags === t && styles.chipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : lead.tags ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Tag</Text>
                  <Text style={styles.value}>{lead.tags}</Text>
                </View>
              ) : null}

              {lead.callbackTime ? (
                <View style={[styles.row, blink && styles.rowBlink]}>
                  <Text style={styles.label}>Callback</Text>
                  <View>
                    <Text
                      style={[
                        styles.countdown,
                        isCallNow && styles.countdownCallNow,
                        isOverdue && styles.countdownOverdue,
                      ]}
                    >
                      {countdown || "..."}
                    </Text>
                    <Text style={styles.callbackTime}>
                      {new Date(lead.callbackTime).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {onScheduleCallback ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.scheduleBtn]}
                onPress={() => onScheduleCallback(lead)}
              >
                <Text style={styles.actionBtnText}>Schedule Callback</Text>
              </TouchableOpacity>
            ) : null}
            {onMarkInvalid ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.invalidBtn]}
                onPress={() => onMarkInvalid(lead)}
              >
                <Text style={styles.actionBtnText}>Mark Invalid Number</Text>
              </TouchableOpacity>
            ) : null}
            {onDocumentReceived && lead.tags === "Interested" ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.greenBtn]}
                onPress={() => onDocumentReceived(lead)}
              >
                <Text style={styles.actionBtnText}>Document received → Green</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: "85%",
  },
  scroll: {
    maxHeight: 400,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
  },
  body: {
    marginBottom: 16,
  },
  row: {
    marginBottom: 10,
  },
  rowBlink: {
    backgroundColor: "#FEF3C7",
    padding: 8,
    borderRadius: 8,
    marginHorizontal: -8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: "#111827",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  chipGreen: {
    backgroundColor: "#059669",
  },
  chipRed: {
    backgroundColor: "#DC2626",
  },
  chipDisabled: {
    opacity: 0.6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  countdown: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    fontVariant: ["tabular-nums"],
  },
  countdownCallNow: {
    color: "#B45309",
  },
  countdownOverdue: {
    color: "#B91C1C",
  },
  callbackTime: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  topBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  callBtn: {
    backgroundColor: "#2563EB",
  },
  waBtn: {
    backgroundColor: "#25D366",
  },
  topBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scheduleBtn: {
    backgroundColor: "#6B7280",
    marginBottom: 8,
  },
  invalidBtn: {
    backgroundColor: "#B91C1C",
  },
  greenBtn: {
    backgroundColor: "#059669",
    marginTop: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
