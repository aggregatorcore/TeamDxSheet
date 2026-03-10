import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import * as Linking from "expo-linking";
import { getSupabaseClient } from "../lib/supabase";
import { getWhatsAppNumber } from "./LeadDetailSheet";
import { WHATSAPP_FOLLOWUP_HOURS } from "../lib/constants";
import type { TagOption } from "../types/lead";

interface WhatsAppModalProps {
  leadName: string;
  number: string;
  id: string;
  onClose: () => void;
  onSuccess: (movedToExhaust?: {
    id: string;
    name: string;
    number: string;
    tags: string;
  }) => void;
}

export function WhatsAppModal({
  leadName,
  number,
  id,
  onClose,
  onSuccess,
}: WhatsAppModalProps) {
  const [tried, setTried] = useState(false);
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [yesChoice, setYesChoice] = useState<"same" | "another" | null>(null);
  const [anotherNumber, setAnotherNumber] = useState("");
  const [subTag, setSubTag] = useState<TagOption | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openWhatsApp = () => {
    const wa = getWhatsAppNumber(number);
    if (wa) Linking.openURL(`whatsapp://send?phone=${wa}`);
    setTried(true);
  };

  const handleSameNumber = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { error: err } = await supabase
        .from("leads")
        .update({
          flow: "Connected",
          tags: "",
          category: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (err) throw err;
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAnotherNumber = async () => {
    const digits = anotherNumber.replace(/\D/g, "").trim();
    if (digits.length < 10) {
      setError("Enter valid 10-digit number");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const dualNumber = `${number} (Calling), ${digits} (WhatsApp)`;
      const { error: err } = await supabase
        .from("leads")
        .update({
          number: dualNumber,
          flow: "Connected",
          tags: "",
          category: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (err) throw err;
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleNo = async () => {
    if (!subTag) return;
    setError(null);
    setLoading(true);
    try {
      if (subTag === "WhatsApp Not Available") {
        onSuccess({ id, name: leadName, number, tags: subTag });
        onClose();
        return;
      }
      if (subTag === "WhatsApp No Reply") {
        const supabase = getSupabaseClient();
        const now = new Date();
        const nextFollowup = new Date(
          now.getTime() + WHATSAPP_FOLLOWUP_HOURS * 60 * 60 * 1000
        ).toISOString();
        const { error: err } = await supabase
          .from("leads")
          .update({
            tags: subTag,
            category: "callback",
            callback_time: nextFollowup,
            whatsapp_followup_started_at: now.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (err) throw err;
        onSuccess();
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
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
            <Text style={styles.headerTitle}>Try WhatsApp</Text>
            <Text style={styles.headerSub}>
              {leadName} • {number}
            </Text>
          </View>
          <ScrollView style={styles.body}>
            <TouchableOpacity
              style={[styles.waBtn, tried && styles.waBtnTried]}
              onPress={openWhatsApp}
            >
              <Text
                style={[styles.waBtnText, tried && styles.waBtnTextTried]}
              >
                {tried ? "Open WhatsApp again" : "Open WhatsApp"}
              </Text>
            </TouchableOpacity>

            {tried ? (
              <>
                <Text style={styles.q}>Did conversation start?</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.opt, choice === "yes" && styles.optActive]}
                    onPress={() => {
                      setChoice("yes");
                      setYesChoice(null);
                      setSubTag("");
                    }}
                  >
                    <Text
                      style={[
                        styles.optText,
                        choice === "yes" && styles.optTextActive,
                      ]}
                    >
                      Yes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.opt, choice === "no" && styles.optActive]}
                    onPress={() => {
                      setChoice("no");
                      setYesChoice(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.optText,
                        choice === "no" && styles.optTextActive,
                      ]}
                    >
                      No
                    </Text>
                  </TouchableOpacity>
                </View>

                {choice === "yes" && (
                  <>
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={[
                          styles.opt,
                          yesChoice === "same" && styles.optActive,
                        ]}
                        onPress={() => setYesChoice("same")}
                      >
                        <Text
                          style={[
                            styles.optText,
                            yesChoice === "same" && styles.optTextActive,
                          ]}
                        >
                          Same number
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.opt,
                          yesChoice === "another" && styles.optActive,
                        ]}
                        onPress={() => setYesChoice("another")}
                      >
                        <Text
                          style={[
                            styles.optText,
                            yesChoice === "another" && styles.optTextActive,
                          ]}
                        >
                          Another number
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {yesChoice === "same" && (
                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleSameNumber}
                        disabled={loading}
                      >
                        <Text style={styles.submitText}>
                          {loading ? "Saving..." : "Confirm"}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {yesChoice === "another" && (
                      <>
                        <TextInput
                          style={styles.input}
                          value={anotherNumber}
                          onChangeText={setAnotherNumber}
                          placeholder="10-digit number"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="phone-pad"
                        />
                        <TouchableOpacity
                          style={styles.submitBtn}
                          onPress={handleAnotherNumber}
                          disabled={loading}
                        >
                          <Text style={styles.submitText}>
                            {loading ? "Saving..." : "Save & close"}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}

                {choice === "no" && (
                  <>
                    <Text style={styles.q}>Sub-tag</Text>
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={[
                          styles.opt,
                          subTag === "WhatsApp Not Available" &&
                            styles.optActive,
                        ]}
                        onPress={() =>
                          setSubTag("WhatsApp Not Available")
                        }
                      >
                        <Text
                          style={[
                            styles.optText,
                            subTag === "WhatsApp Not Available" &&
                              styles.optTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          Not Available
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.opt,
                          subTag === "WhatsApp No Reply" && styles.optActive,
                        ]}
                        onPress={() => setSubTag("WhatsApp No Reply")}
                      >
                        <Text
                          style={[
                            styles.optText,
                            subTag === "WhatsApp No Reply" &&
                              styles.optTextActive,
                          ]}
                        >
                          No Reply
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {subTag && (
                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleNo}
                        disabled={loading}
                      >
                        <Text style={styles.submitText}>
                          {loading ? "Saving..." : "Confirm"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>
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
    backgroundColor: "#25D366",
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
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  body: {
    padding: 16,
  },
  waBtn: {
    backgroundColor: "#25D366",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  waBtnTried: {
    backgroundColor: "#D1FAE5",
  },
  waBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  waBtnTextTried: {
    color: "#065F46",
  },
  q: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  opt: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  optActive: {
    backgroundColor: "#111827",
  },
  optText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  optTextActive: {
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
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: "#374151",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
  },
});
