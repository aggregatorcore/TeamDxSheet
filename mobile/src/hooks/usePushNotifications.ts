import { useEffect, useState } from "react";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { getSupabaseClient } from "../lib/supabase";

/** Push notifications are not supported in Expo Go (SDK 53+). Only run in dev builds. */
const isExpoGo = Constants.appOwnership === "expo";

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (isExpoGo) return;

    async function register() {
      try {
        if (!Device.isDevice) return;

        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        const pushToken = await Notifications.getExpoPushTokenAsync();
        const value =
          typeof pushToken === "string"
            ? pushToken
            : (pushToken as { data?: string })?.data ?? null;
        if (!value) return;
        setToken(value);

        const supabase = getSupabaseClient();
        await supabase.from("devices").upsert(
          { expo_push_token: value },
          { onConflict: "expo_push_token" }
        );

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
      } catch {
        // Ignore in Expo Go or when notifications unavailable
      }
    }

    register();
  }, []);

  return token;
}

