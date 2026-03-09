import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import axios from "axios";
import { config } from "@/lib/config";

/**
 * Configure how notifications appear when the app is in the foreground.
 * Call this once at app startup (e.g. in _layout.tsx).
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Create the Android notification channel used for all CGate notifications.
 * Call this unconditionally at app startup — before any JWT is available —
 * so the channel exists before any notification can arrive.
 * Safe to call multiple times; Android's setNotificationChannelAsync is idempotent.
 */
export async function createNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "CGate",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#6366F1",
    sound: "default",
  });
}

/**
 * Register for push notifications, obtain the Expo push token,
 * and save it to the backend so the server can send notifications.
 *
 * @param jwtToken  - The JWT returned by /auth/login, used to authenticate the backend call.
 */
export async function registerForPushNotifications(
  jwtToken: string,
): Promise<void> {
  // Push notifications only work on real devices
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted.");
    return;
  }

  // Get the Expo push token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn("EAS projectId not found in app config.");
    return;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;
    console.log("[Push] Registering token:", pushToken);

    // Save the token to the backend
    await axios.post(
      `${config.backendUrl}/notifications/token`,
      { pushToken },
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log("[Push] Token saved successfully");
  } catch (error) {
    console.error("[Push] Token registration failed:", error);
  }
}

/**
 * Clear the push token from the backend on logout
 * so the user no longer receives notifications after signing out.
 *
 * @param jwtToken - The current JWT token.
 */
export async function unregisterPushNotifications(
  jwtToken: string,
): Promise<void> {
  try {
    await axios.delete(`${config.backendUrl}/notifications/token`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Failed to clear push token:", error);
  }
}
