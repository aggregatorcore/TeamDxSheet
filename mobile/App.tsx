import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { hasSupabaseConfig } from "./src/lib/supabase";
import { ConfigRequiredScreen } from "./src/screens/ConfigRequiredScreen";
import { AuthProvider } from "./src/contexts/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ToastProvider } from "./src/components/ToastProvider";

export default function App() {
  if (!hasSupabaseConfig()) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ConfigRequiredScreen />
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

