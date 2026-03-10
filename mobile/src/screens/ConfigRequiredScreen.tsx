import React from "react";
import { View, Text, StyleSheet } from "react-native";
export function ConfigRequiredScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase config missing</Text>
      <Text style={styles.text}>
        Add these to a <Text style={styles.code}>.env</Text> file in the mobile
        folder:
      </Text>
      <Text style={styles.codeBlock}>
        EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co{"\n"}
        EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
      </Text>
      <Text style={styles.text}>
        Use the same values as in webapp’s <Text style={styles.code}>.env.local</Text> (NEXT_PUBLIC_SUPABASE_URL and
        NEXT_PUBLIC_SUPABASE_ANON_KEY).
      </Text>
      <Text style={styles.text}>Then restart: yarn expo start --android</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  text: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
  },
  code: {
    fontFamily: "monospace",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 4,
  },
  codeBlock: {
    fontFamily: "monospace",
    fontSize: 12,
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    color: "#111827",
  },
});
