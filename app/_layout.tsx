import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { QueryClientProvider } from "@tanstack/react-query";
import { AppContextProvider } from "@/contexts/AppContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { setupAxiosInterceptors } from "@/lib/api";
import { getUser } from "@/lib/auth";
import queryClient from "@/lib/queryClient";
import { subscribeToUserChannel } from "@/lib/intercom";
import { configureNotificationHandler } from "@/lib/notifications";

// Configure foreground notification behaviour once at the module level
configureNotificationHandler();

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Keep pathname ref current so the subscription closure always reads the latest route
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Set up global 401 axios interceptor once
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  // Load user id once (re-checks whenever the component remounts after login)
  useEffect(() => {
    getUser<{ id: string }>().then((u) => setCurrentUserId(u?.id ?? null));
  }, []);

  // Global incoming-call subscription — navigates to call screen from any route
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = subscribeToUserChannel(currentUserId, (type, payload) => {
      if (type !== "call:incoming") return;
      // Don't double-navigate if already on the call screen
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
  }, [currentUserId]);

  useEffect(() => {
    // Listen for notifications received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // Notification received — badge / alert handled by the handler above
      });

    // Listen for taps on notifications (foreground, background, or closed)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          string
        >;
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
            // Handled by the global Supabase subscription; tap just opens the app
            break;
          default:
            break;
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
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
