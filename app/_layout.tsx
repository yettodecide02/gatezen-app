import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/useColorScheme";
import { configureNotificationHandler } from "@/lib/notifications";

// Configure foreground notification behaviour once at the module level
configureNotificationHandler();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

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
            router.push("/visitors/passes");
            break;
          case "PACKAGE":
            router.push("/mypackages");
            break;
          case "ANNOUNCEMENT":
            router.push("/(tabs)/home");
            break;
          case "TICKET_UPDATE":
            router.push("/maintenance");
            break;
          case "NEW_USER":
            router.push("/admin");
            break;
          case "BOOKING_REMINDER":
            router.push("/bookings");
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
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
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
            initialRouteName="login"
            screenOptions={{
              headerShown: false,
              animation: Platform.OS === "ios" ? "slide_from_right" : "fade",
              contentStyle: {
                backgroundColor: (colorScheme === "dark"
                  ? "#000"
                  : "#fff") as any,
              },
            }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="gatekeeper" />
            <Stack.Screen name="auth/callback" />
            <Stack.Screen name="directory" />
            <Stack.Screen name="notice-board" />
            <Stack.Screen name="surveys" />
            <Stack.Screen name="election-polls" />
          </Stack>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}