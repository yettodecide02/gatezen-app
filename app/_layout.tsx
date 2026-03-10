import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { QueryClientProvider } from "@tanstack/react-query";
import { AppContextProvider } from "@/contexts/AppContext";
import { useAppContext } from "@/contexts/AppContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { setupAxiosInterceptors } from "@/lib/api";
import { getToken } from "@/lib/auth";
import queryClient from "@/lib/queryClient";
import { subscribeToIncomingCalls } from "@/lib/intercom";
import {
  configureNotificationHandler,
  createNotificationChannel,
  registerForPushNotifications,
} from "@/lib/notifications";

/**
 * Handles the global incoming-call Supabase subscription.
 * Must live INSIDE AppContextProvider so useAppContext() works and the
 * subscription is re-established whenever the user logs in or changes.
 */
function IntercomSubscription() {
  const { user } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToIncomingCalls(user.id, (payload) => {
      if (pathnameRef.current?.includes("intercom/call")) return;
      router.push({
        pathname: "/intercom/call",
        params: {
          mode: "incoming",
          callId: payload.callId,
          callType: payload.callType,
          peerId: payload.callerId,
          peerName: payload.callerName,
          peerUnit: payload.callerUnit ?? "",
          peerBlock: payload.callerBlock ?? "",
        },
      });
    });
    return unsub;
  }, [user?.id]);

  return null;
}

// Configure foreground notification behaviour once at the module level
configureNotificationHandler();
// Create the Android notification channel at raw startup, before any JWT is
// available, so Android never silently discards notifications due to a missing channel.
createNotificationChannel().catch(() => {});

// Theme objects defined outside the component — no re-creation on every render
const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#ffffff",
    card: "#ffffff",
  },
} as const;

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#000000",
    card: "#000000",
    border: "#111111",
    text: "#ffffff",
  },
} as const;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const notificationListener = useRef<
    Notifications.EventSubscription | undefined
  >(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(
    undefined,
  );

  // Keep pathname ref current so the subscription closure always reads the latest route
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Set up global 401 axios interceptor once
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  // Re-register push token on every app cold-start so a stale DB token is refreshed
  useEffect(() => {
    getToken().then((t) => {
      if (t) registerForPushNotifications(t).catch(() => {});
    });
  }, []);

  // Shared handler so the same navigation logic runs for both:
  //   (a) background/foreground notification taps  → addNotificationResponseReceivedListener
  //   (b) killed-app launches via notification tap → getLastNotificationResponseAsync
  const handleNotificationResponse = useCallback(
    (data: Record<string, string>) => {
      if (!data?.type) return;
      switch (data.type) {
        case "VISITOR_CHECKIN":
          router.push("/resident/visitors/passes");
          break;
        case "PACKAGE":
          router.push("/resident/mypackages");
          break;
        case "ANNOUNCEMENT":
          router.push("/(tabs)/home");
          break;
        case "TICKET_UPDATE":
          router.push("/resident/maintenance");
          break;
        case "NEW_USER":
          router.push("/admin");
          break;
        case "BOOKING_REMINDER":
          router.push("/resident/bookings");
          break;
        case "INTERCOM_CALL":
          if (
            !pathnameRef.current?.includes("intercom/call") &&
            data.callId &&
            data.callerId
          ) {
            router.push({
              pathname: "/intercom/call",
              params: {
                mode: "incoming",
                callId: data.callId,
                callType: data.callType ?? "R2G",
                peerId: data.callerId,
                peerName: data.callerName ?? "Unknown",
                peerUnit: data.callerUnit ?? "",
                peerBlock: data.callerBlock ?? "",
              },
            });
          }
          break;
        default:
          break;
      }
    },
    [],
  );

  useEffect(() => {
    // Handle the notification that LAUNCHED the app from a killed state.
    // addNotificationResponseReceivedListener does NOT fire for this case;
    // only getLastNotificationResponseAsync() catches it.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<
        string,
        string
      >;
      handleNotificationResponse(data);
    });

    // Listen for notifications received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // Notification received — badge / alert handled by configureNotificationHandler
      });

    // Listen for taps on notifications (foreground or background — NOT killed state)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          string
        >;
        handleNotificationResponse(data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [handleNotificationResponse]);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
        <IntercomSubscription />
        <SafeAreaProvider>
          <View
            style={{
              flex: 1,
              backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
            }}
          >
            <ThemeProvider
              value={colorScheme === "dark" ? DarkNavTheme : LightNavTheme}
            >
              <Stack
                initialRouteName="auth/login"
                screenOptions={{
                  headerShown: false,
                  animation:
                    Platform.OS === "ios" ? "slide_from_right" : "fade",
                  contentStyle: {
                    backgroundColor: (colorScheme === "dark"
                      ? "#000"
                      : "#fff") as any,
                  },
                }}
              >
                <Stack.Screen name="auth/login" />
                <Stack.Screen name="auth/register" />
                <Stack.Screen name="auth/forgot-password" />
                <Stack.Screen name="auth/pending" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="admin/index" />
                <Stack.Screen name="gatekeeper" />
                <Stack.Screen name="auth/callback" />
                <Stack.Screen name="resident/directory" />
                <Stack.Screen name="resident/notice-board" />
                <Stack.Screen name="resident/surveys" />
                <Stack.Screen name="resident/election-polls" />
                <Stack.Screen
                  name="intercom/call"
                  options={{
                    headerShown: false,
                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",
                  }}
                />
              </Stack>
              <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            </ThemeProvider>
          </View>
        </SafeAreaProvider>
      </AppContextProvider>
    </QueryClientProvider>
  );
}
