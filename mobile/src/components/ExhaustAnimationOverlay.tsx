import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

const DURATION_MS = 2500;

interface ExhaustAnimationOverlayProps {
  lead: { id: string; name: string; number: string; tags: string };
  onComplete: () => void;
}

export function ExhaustAnimationOverlay({
  lead,
  onComplete,
}: ExhaustAnimationOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  useEffect(() => {
    const t = setTimeout(onComplete, DURATION_MS);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <View style={styles.content}>
        <View style={styles.bucketBox}>
          <Text style={styles.bucketTitle}>Exhaust / Admin</Text>
          <Text style={styles.bucketSub}>Lead moved for review</Text>
        </View>
        <Animated.View style={[styles.leadBox, { transform: [{ scale }] }]}>
          <Text style={styles.leadName}>{lead.name}</Text>
          <Text style={styles.leadNumber}>{lead.number}</Text>
          {lead.tags ? (
            <Text style={styles.leadTag}>{lead.tags}</Text>
          ) : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  content: {
    alignItems: "center",
    padding: 24,
  },
  bucketBox: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#B91C1C",
    backgroundColor: "#FEE2E2",
    marginBottom: 24,
  },
  bucketTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#B91C1C",
  },
  bucketSub: {
    fontSize: 13,
    color: "#991B1B",
    marginTop: 4,
  },
  leadBox: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 200,
    alignItems: "center",
  },
  leadName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  leadNumber: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  leadTag: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 6,
  },
});
