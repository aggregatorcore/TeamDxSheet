import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";

interface InvalidNumberModalProps {
  leadName: string;
  leadNumber: string;
  id: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function InvalidNumberModal({
  leadName,
  leadNumber,
  onClose,
  onConfirm,
}: InvalidNumberModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
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
            <Text style={styles.headerTitle}>Mark as Invalid Number</Text>
            <Text style={styles.headerSub}>
              Ye lead Admin ke paas move ho jayegi
            </Text>
          </View>
          <View style={styles.body}>
            <View style={styles.leadBox}>
              <Text style={styles.leadName}>{leadName}</Text>
              <Text style={styles.leadNumber}>{leadNumber}</Text>
            </View>
            <Text style={styles.note}>
              Invalid number mark karne par ye lead aapki list se hata kar Admin
              view mein chali jayegi. Admin ise review karega.
            </Text>
          </View>
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.disabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              <Text style={styles.confirmText}>
                {loading ? "Moving..." : "Confirm"}
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
  leadBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  leadName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  leadNumber: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "monospace",
    marginTop: 4,
  },
  note: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
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
    backgroundColor: "#B91C1C",
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
