import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { getSupabaseClient } from "../lib/supabase";

function formatDateForInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatTimeForInput(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

const QUICK_PRESETS = [
  { label: "15 min", mins: 15 },
  { label: "30 min", mins: 30 },
  { label: "1 hr", mins: 60 },
  { label: "2 hr", mins: 120 },
  { label: "3 hr", mins: 180 },
  {
    label: "Tomorrow 10 AM",
    custom: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      return d;
    },
  },
];

interface CallbackModalProps {
  leadName: string;
  leadId: string;
  leadNumber?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CallbackModal({
  leadName,
  leadId,
  leadNumber,
  onClose,
  onSuccess,
}: CallbackModalProps) {
  const defaultTime = new Date(Date.now() + 30 * 60 * 1000);
  const [date, setDate] = useState(() => formatDateForInput(defaultTime));
  const [time, setTime] = useState(() => formatTimeForInput(defaultTime));
  const today = formatDateForInput(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = useCallback((mins?: number, custom?: () => Date) => {
    const d = custom ? custom() : new Date(Date.now() + (mins ?? 0) * 60 * 1000);
    setDate(formatDateForInput(d));
    setTime(formatTimeForInput(d));
    setError(null);
  }, []);

  const handleSubmit = async () => {
    if (!date || !time) return;
    setLoading(true);
    setError(null);
    const callbackTime = `${date}T${time}:00`;
    try {
      const supabase = getSupabaseClient();
      const { error: err } = await supabase
        .from("leads")
        .update({
          callback_time: callbackTime,
          category: "callback",
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
      if (err) throw err;
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.box}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Schedule Call Back</Text>
            <Text style={styles.headerSub}>
              {leadName}
              {leadNumber ? ` • ${leadNumber}` : ""}
            </Text>
          </View>
          <ScrollView style={styles.body}>
            <Text style={styles.presetsLabel}>Quick select:</Text>
            <View style={styles.presets}>
              {QUICK_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={styles.presetBtn}
                  onPress={() =>
                    "custom" in p ? applyPreset(undefined, p.custom) : applyPreset(p.mins)
                  }
                >
                  <Text style={styles.presetText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            {date && time && (
              <Text style={styles.preview}>
                Call at: {new Date(`${date}T${time}`).toLocaleString()}
              </Text>
            )}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "Saving..." : "Schedule"}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16,
  },
  box: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    maxHeight: "80%",
  },
  header: {
    backgroundColor: "#374151",
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerSub: {
    fontSize: 12,
    color: "#D1D5DB",
    marginTop: 4,
  },
  body: {
    padding: 16,
  },
  presetsLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  presetText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1F2937",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  field: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  preview: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#374151",
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});
