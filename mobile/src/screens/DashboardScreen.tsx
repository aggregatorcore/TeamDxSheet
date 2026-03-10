import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { fetchWithAuth, hasApiConfig } from "../lib/api";
import { appendTagHistory } from "../lib/leadNote";
import { LeadDetailSheet } from "../components/LeadDetailSheet";
import { CallbackModal } from "../components/CallbackModal";
import { InvalidNumberModal } from "../components/InvalidNumberModal";
import { ExhaustAnimationOverlay } from "../components/ExhaustAnimationOverlay";
import { WhatsAppModal } from "../components/WhatsAppModal";
import { NotInterestedModal } from "../components/NotInterestedModal";
import { ReviewAnimationOverlay } from "../components/ReviewAnimationOverlay";
import { GreenBucketAnimationOverlay } from "../components/GreenBucketAnimationOverlay";
import { CallbackCountdown } from "../components/CallbackCountdown";
import type { Lead, FlowOption, TagOption } from "../types/lead";
import { BLINK_BEFORE_SECONDS, GRACE_PERIOD_HOURS } from "../lib/constants";

type Tab = "work" | "green";

function mapRowToLead(row: any): Lead {
  return {
    id: String(row.id),
    source: row.source ?? "",
    name: row.name ?? "",
    place: row.place ?? "",
    number: row.number ?? "",
    flow: row.flow ?? "Select",
    tags: row.tags ?? "",
    note: row.note,
    callbackTime: row.callback_time ?? null,
    whatsappFollowupStartedAt: row.whatsapp_followup_started_at
      ? new Date(row.whatsapp_followup_started_at).toISOString()
      : undefined,
    assignedTo: row.assigned_to ?? "",
    category: row.category ?? "active",
  };
}

export function DashboardScreen() {
  const { user, session } = useAuth();
  const [tab, setTab] = useState<Tab>("work");
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [callbackLead, setCallbackLead] = useState<Lead | null>(null);
  const [invalidLead, setInvalidLead] = useState<Lead | null>(null);
  const [whatsappLead, setWhatsappLead] = useState<Lead | null>(null);
  const [updating, setUpdating] = useState(false);
  const [exhaustingLead, setExhaustingLead] = useState<Lead | null>(null);
  const [exhaustPhase, setExhaustPhase] = useState<"move" | "slide">("move");
  const [notInterestedLead, setNotInterestedLead] = useState<Lead | null>(null);
  const [reviewingLead, setReviewingLead] = useState<Lead | null>(null);
  const [reviewPhase, setReviewPhase] = useState<"move" | "slide">("move");
  const [greenBucketLead, setGreenBucketLead] = useState<Lead | null>(null);
  const [greenPhase, setGreenPhase] = useState<"move" | "slide">("move");

  const load = useCallback(async () => {
      if (!user?.email) return;
      setLoading(true);
      const supabase = getSupabaseClient();
      if (tab === "green") {
        const { data } = await supabase
          .from("leads")
          .select("*")
          .eq("assigned_to", user.email)
          .eq("is_document_received", true)
          .order("updated_at", { ascending: false });
        setLeads(
          (data ?? []).map((row: any) => mapRowToLead(row))
        );
      } else {
        const { data } = await supabase
          .from("leads")
          .select("*")
          .eq("assigned_to", user.email)
          .eq("is_invalid", false)
          .order("created_at", { ascending: false });
        const rows = (data ?? []).filter(
          (row: any) => !row.is_in_review && !row.is_document_received
        );
        const mapped = rows.map((row: any) => mapRowToLead(row));
        mapped.sort((a: Lead, b: Lead) => {
          const aBlink = a.callbackTime && isBlinkTime(a.callbackTime);
          const bBlink = b.callbackTime && isBlinkTime(b.callbackTime);
          if (aBlink && !bBlink) return -1;
          if (!aBlink && bBlink) return 1;
          if (aBlink && bBlink && a.callbackTime && b.callbackTime) {
            return new Date(a.callbackTime).getTime() - new Date(b.callbackTime).getTime();
          }
          if (a.category === "overdue" && b.category !== "overdue") return -1;
          if (a.category !== "overdue" && b.category === "overdue") return 1;
          if (a.category === "callback" && b.category !== "callback") return -1;
          if (a.category !== "callback" && b.category === "callback") return 1;
          return 0;
        });
        setLeads(mapped);
      }
      setLoading(false);
  }, [tab, user?.email]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (exhaustPhase !== "slide") return;
    const t = setTimeout(() => {
      setExhaustingLead(null);
      setExhaustPhase("move");
      load();
    }, 400);
    return () => clearTimeout(t);
  }, [exhaustPhase, load]);

  useEffect(() => {
    if (reviewPhase !== "slide") return;
    const t = setTimeout(() => {
      setReviewingLead(null);
      setReviewPhase("move");
      load();
    }, 400);
    return () => clearTimeout(t);
  }, [reviewPhase, load]);

  useEffect(() => {
    if (greenPhase !== "slide") return;
    const t = setTimeout(() => {
      setGreenBucketLead(null);
      setGreenPhase("move");
      load();
      setTab("green");
    }, 400);
    return () => clearTimeout(t);
  }, [greenPhase, load]);

  function isBlinkTime(cb: string | null): boolean {
    if (!cb) return false;
    const d = new Date(cb).getTime();
    const now = Date.now();
    const blinkStart = d - BLINK_BEFORE_SECONDS * 1000;
    const graceEnd = d + GRACE_PERIOD_HOURS * 60 * 60 * 1000;
    return now >= blinkStart && now <= graceEnd;
  }

  const handleFlowChange = async (lead: Lead, flow: FlowOption) => {
    setUpdating(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.from("leads").update({ flow }).eq("id", lead.id);
      await load();
      setSelectedLead((prev) => (prev?.id === lead.id ? { ...prev, flow } : prev));
    } finally {
      setUpdating(false);
    }
  };

  const handleTagSelect = async (lead: Lead, tag: TagOption | "") => {
    if (tag === "Invalid Number") {
      setSelectedLead(null);
      setInvalidLead(lead);
      return;
    }
    if (tag === "Not Interested") {
      setSelectedLead(null);
      setNotInterestedLead(lead);
      return;
    }
    if (tag === "Interested") {
      setUpdating(true);
      try {
        const supabase = getSupabaseClient();
        const noteWithHistory = appendTagHistory(lead.note ?? "", tag);
        await supabase
          .from("leads")
          .update({ tags: tag, note: noteWithHistory })
          .eq("id", lead.id);
        await load();
        setSelectedLead(null);
      } finally {
        setUpdating(false);
      }
      return;
    }
    if (
      tag === "No Answer" ||
      tag === "Switch Off" ||
      tag === "Busy IVR" ||
      tag === "Incoming Off"
    ) {
      setUpdating(true);
      try {
        const supabase = getSupabaseClient();
        const noteWithHistory = appendTagHistory(lead.note, tag);
        await supabase
          .from("leads")
          .update({
            tags: tag,
            note: noteWithHistory,
            ...(tag === "Incoming Off" ? {} : { category: "active" }),
          })
          .eq("id", lead.id);
        await load();
        setSelectedLead(null);
        if (tag === "No Answer" || tag === "Switch Off" || tag === "Busy IVR") {
          setCallbackLead({ ...lead, tags: tag, note: noteWithHistory });
        }
        if (tag === "Incoming Off") {
          setWhatsappLead({ ...lead, tags: tag, note: noteWithHistory });
        }
      } finally {
        setUpdating(false);
      }
      return;
    }
    if (tag === "WhatsApp Not Available" || tag === "WhatsApp No Reply") {
      setUpdating(true);
      try {
        const supabase = getSupabaseClient();
        const noteWithHistory = appendTagHistory(lead.note, tag);
        if (tag === "WhatsApp No Reply") {
          const now = new Date();
          const nextFollowup = new Date(
            now.getTime() + 1 * 60 * 60 * 1000
          ).toISOString();
          await supabase
            .from("leads")
            .update({
              tags: tag,
              note: noteWithHistory,
              category: "callback",
              callback_time: nextFollowup,
              whatsapp_followup_started_at: now.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", lead.id);
        } else {
          await supabase
            .from("leads")
            .update({ tags: tag, note: noteWithHistory, updated_at: new Date().toISOString() })
            .eq("id", lead.id);
        }
        await load();
        setSelectedLead(null);
      } finally {
        setUpdating(false);
      }
      return;
    }
    setUpdating(true);
    try {
      const supabase = getSupabaseClient();
      const noteWithHistory = appendTagHistory(lead.note, tag);
      await supabase
        .from("leads")
        .update({ tags: tag, note: noteWithHistory, category: "active" })
        .eq("id", lead.id);
      await load();
      setSelectedLead((prev) => (prev?.id === lead.id ? { ...prev, tags: tag } : prev));
    } finally {
      setUpdating(false);
    }
  };

  const handleNotInterestedConfirm = async (note: string) => {
    if (!notInterestedLead || !hasApiConfig()) return;
    const res = await fetchWithAuth(session, "/api/leads", {
      method: "PATCH",
      body: JSON.stringify({
        id: notInterestedLead.id,
        tags: "Not Interested",
        note,
        moveToReview: true,
      }),
    });
    if (!res.ok) throw new Error("Failed");
    setNotInterestedLead(null);
    setReviewingLead({ ...notInterestedLead, tags: "Not Interested" });
    setReviewPhase("move");
  };

  const handleDocumentReceived = async (lead: Lead) => {
    setSelectedLead(null);
    const note = lead.note
      ? `${lead.note} | Document received: ${new Date().toLocaleString()}`
      : `Document received: ${new Date().toLocaleString()}`;
    const supabase = getSupabaseClient();
    await supabase
      .from("leads")
      .update({
        is_document_received: true,
        note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
    setGreenBucketLead(lead);
    setGreenPhase("move");
  };

  const handleInvalidConfirm = async () => {
    if (!invalidLead || !hasApiConfig()) return;
    const res = await fetchWithAuth(session, "/api/leads", {
      method: "PATCH",
      body: JSON.stringify({ id: invalidLead.id, moveToAdmin: true }),
    });
    if (!res.ok) return;
    setInvalidLead(null);
    setExhaustingLead({ ...invalidLead, tags: "Invalid Number" });
    setExhaustPhase("move");
  };

  const handleWhatsAppSuccess = async (
    movedToExhaust?: { id: string; name: string; number: string; tags: string }
  ) => {
    if (movedToExhaust && hasApiConfig()) {
      const res = await fetchWithAuth(session, "/api/leads", {
        method: "PATCH",
        body: JSON.stringify({
          id: movedToExhaust.id,
          tags: movedToExhaust.tags,
          moveToAdminWithTag: true,
        }),
      });
      if (res.ok) {
        setExhaustingLead({
          id: movedToExhaust.id,
          name: movedToExhaust.name,
          number: movedToExhaust.number,
          tags: movedToExhaust.tags,
          source: "",
          place: "",
          flow: "Select",
          callbackTime: null,
          assignedTo: "",
          category: "active",
        });
        setExhaustPhase("move");
      }
    }
    setWhatsappLead(null);
    load();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TeamDX Work</Text>
      <Text style={styles.subtitle}>
        Logged in as {user?.email ?? "telecaller"}
      </Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, tab === "work" && styles.tabButtonActive]}
          onPress={() => setTab("work")}
        >
          <Text
            style={[
              styles.tabText,
              tab === "work" && styles.tabTextActive,
            ]}
          >
            Work
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === "green" && styles.tabButtonActive]}
          onPress={() => setTab("green")}
        >
          <Text
            style={[
              styles.tabText,
              tab === "green" && styles.tabTextActive,
            ]}
          >
            Green Bucket
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#111827" />
        </View>
      ) : leads.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {tab === "green"
              ? "No leads in Green Bucket"
              : "No leads assigned to you."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const blink = item.callbackTime && isBlinkTime(item.callbackTime);
            return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedLead(item)}
            >
              <View
                style={[
                  styles.card,
                  blink && styles.cardBlink,
                  item.category === "overdue" && styles.cardOverdue,
                  item.category === "callback" && !blink && styles.cardCallback,
                ]}
              >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {item.name || "No name"}
                </Text>
                <Text style={styles.cardTag}>{item.flow}</Text>
              </View>
              <Text style={styles.cardLine}>{item.number}</Text>
              {item.place ? (
                <Text style={styles.cardLine}>{item.place}</Text>
              ) : null}
              {item.callbackTime ? (
                <View style={styles.callbackBlock}>
                  <CallbackCountdown
                    callbackTime={item.callbackTime}
                    isBlink={blink}
                  />
                </View>
              ) : null}
              </View>
            </TouchableOpacity>
            );
          }}
        />
      )}

      {selectedLead && (
        <LeadDetailSheet
          lead={selectedLead}
          visible={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onFlowChange={handleFlowChange}
          onTagSelect={handleTagSelect}
          onScheduleCallback={(lead) => {
            setSelectedLead(null);
            setCallbackLead(lead);
          }}
          onMarkInvalid={(lead) => {
            setSelectedLead(null);
            setInvalidLead(lead);
          }}
          onDocumentReceived={handleDocumentReceived}
          updating={updating}
        />
      )}

      {callbackLead && (
        <CallbackModal
          leadName={callbackLead.name}
          leadId={callbackLead.id}
          leadNumber={callbackLead.number}
          onClose={() => setCallbackLead(null)}
          onSuccess={load}
        />
      )}

      {whatsappLead && (
        <WhatsAppModal
          leadName={whatsappLead.name}
          number={whatsappLead.number}
          id={whatsappLead.id}
          onClose={() => setWhatsappLead(null)}
          onSuccess={handleWhatsAppSuccess}
        />
      )}

      {invalidLead && (
        <InvalidNumberModal
          leadName={invalidLead.name}
          leadNumber={invalidLead.number}
          id={invalidLead.id}
          onClose={() => setInvalidLead(null)}
          onConfirm={handleInvalidConfirm}
        />
      )}

      {notInterestedLead && (
        <NotInterestedModal
          leadName={notInterestedLead.name}
          leadNumber={notInterestedLead.number}
          id={notInterestedLead.id}
          onClose={() => setNotInterestedLead(null)}
          onConfirm={handleNotInterestedConfirm}
        />
      )}

      {reviewingLead && reviewPhase === "move" && (
        <ReviewAnimationOverlay
          lead={{
            id: reviewingLead.id,
            name: reviewingLead.name,
            number: reviewingLead.number,
            tags: reviewingLead.tags,
          }}
          onComplete={() => setReviewPhase("slide")}
        />
      )}

      {exhaustingLead && exhaustPhase === "move" && (
        <ExhaustAnimationOverlay
          lead={{
            id: exhaustingLead.id,
            name: exhaustingLead.name,
            number: exhaustingLead.number,
            tags: exhaustingLead.tags,
          }}
          onComplete={() => setExhaustPhase("slide")}
        />
      )}

      {greenBucketLead && greenPhase === "move" && (
        <GreenBucketAnimationOverlay
          lead={{
            id: greenBucketLead.id,
            name: greenBucketLead.name,
            number: greenBucketLead.number,
          }}
          onComplete={() => setGreenPhase("slide")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
  tabs: {
    flexDirection: "row",
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#111827",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
  listContent: {
    paddingVertical: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardBlink: {
    backgroundColor: "#FEF3C7",
  },
  cardOverdue: {
    backgroundColor: "#FEE2E2",
  },
  cardCallback: {
    backgroundColor: "#FFFBEB",
  },
  callbackBlock: {
    marginTop: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  cardTag: {
    fontSize: 12,
    color: "#2563EB",
  },
  cardLine: {
    fontSize: 13,
    color: "#4B5563",
  },
});


