import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { appendTagHistory } from "../lib/leadNote";
import { NOT_INTERESTED_REASONS } from "../types/lead";

interface NotInterestedModalProps {
  leadName: string;
  leadNumber: string;
  id: string;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
}

export function NotInterestedModal({
  leadName,
  leadNumber,
  onClose,
  onConfirm,
}: NotInterestedModalProps) {
  const [reason, setReason] = useState<string>("");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason) return;
    const noteText = extra.trim() ? `Not Interested: ${reason} - ${extra}` : `Not Interested: ${reason}`;
    const note = appendTagHistory(noteText, "Not Interested");
    setLoading(true);
    try {
      await onConfirm(note);
      onClose();
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
            <Text style={styles.headerTitle}>Not Interested</Text>
            <Text style={styles.headerSub}>
              {leadName} • {leadNumber}
            </Text>
          </View>
          <ScrollView style={styles.body}>
            <Text style={styles.label}>Reason</Text>
            <View style={styles.chipRow}>
              {NOT_INTERESTED_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, reason === r && styles.chipActive]}
                  onPress={() => setReason(r)}
                >
                  <Text
                    style={[styles.chipText, reason === r && styles.chipTextActive]}
                    numberOfLines={2}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Extra details (optional)</Text>
            <TextInput
              style={styles.input}
              value={extra}
              onChangeText={setExtra}
              placeholder="Any additional note..."
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, (!reason || loading) && styles.disabled]}
              onPress={handleConfirm}
              disabled={!reason || loading}
            >
              <Text style={styles.confirmText}>
                {loading ? "Moving..." : "Move to Review"}
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
    maxHeight: "85%",
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
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  chipActive: {
    backgroundColor: "#374151",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    minHeight: 60,
    textAlignVertical: "top",
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
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#374151",
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});
