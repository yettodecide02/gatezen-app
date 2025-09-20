// @ts-nocheck
import { useEffect } from "react";
import { Tabs } from "expo-router/tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getUser } from "@/lib/auth";
import { router } from "expo-router";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const tint = useThemeColor({}, "tint");
  const text = useThemeColor({}, "text");
  const bg = useThemeColor({}, "background");
  const isDark = colorScheme === "dark";

  useEffect(() => {
    // Check if user is admin and redirect to admin dashboard
    const checkUserRole = async () => {
      try {
        const user = await getUser();
        if (user && user.role === "ADMIN") {
          router.replace("/admin");
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    checkUserRole();
  }, []);

  const bottomInset = Math.max(insets.bottom ?? 0, 8);
  const side = 16;
  const barHeight = Platform.OS === "ios" ? 80 : 70;
  const radius = Platform.OS === "ios" ? 25 : 20;
  const barBottom = Platform.OS === "ios" ? bottomInset + 16 : bottomInset + 12;

  return (
    <Tabs
      initialRouteName="home"
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: bg as any },
        headerTintColor: tint as any,
        tabBarActiveTintColor: tint as any,
        tabBarInactiveTintColor: text as any,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          left: side,
          right: side,
          bottom: barBottom,
          backgroundColor: isDark
            ? "rgba(31, 31, 31, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          borderRadius: radius,
          height: barHeight,
          paddingVertical: Platform.OS === "ios" ? 12 : 10,
          paddingHorizontal: 16,
          marginHorizontal: 20,
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
          elevation: Platform.OS === "android" ? 16 : 0,
          shadowColor: isDark ? "#000" : "#000",
          shadowOpacity: Platform.OS === "ios" ? (isDark ? 0.3 : 0.1) : 0,
          shadowRadius: Platform.OS === "ios" ? 20 : 0,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarItemStyle: {
          paddingTop: Platform.OS === "ios" ? 8 : 6,
          paddingBottom: Platform.OS === "ios" ? 4 : 2,
          height: "100%",
        },
        tabBarLabelStyle: {
          marginBottom: Platform.OS === "ios" ? 4 : 2,
          fontSize: Platform.OS === "ios" ? 12 : 11,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
      sceneContainerStyle={{
        backgroundColor: bg as any,
        paddingBottom: barBottom + barHeight + 8,
      }}
    >
      <Tabs.Screen
        name="dummy"
        options={{
          title: "Dummy",
          tabBarLabel: "Dummy",
          tabBarIcon: ({ color, size }) => (
            <Feather
              name="grid"
              color={color as any}
              size={Platform.OS === "ios" ? 22 : 20}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          headerTitle: "",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Feather
              name="home"
              color={color as any}
              size={Platform.OS === "ios" ? 22 : 20}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather
              name="user"
              color={color as any}
              size={Platform.OS === "ios" ? 22 : 20}
            />
          ),
        }}
      />
    </Tabs>
  );
}
