// @ts-nocheck
import { Tabs } from "expo-router/tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tint = useThemeColor({}, "tint");
  const text = useThemeColor({}, "text");
  const bg = useThemeColor({}, "background");

  const bottomInset = Math.max(insets.bottom ?? 0, 8);
  const side = 16;
  const barHeight = 64;
  const radius = 50;
  const barBottom = bottomInset + 20; 

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
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: radius,
          height: barHeight,
          paddingVertical: 8, // Y-axis padding inside bar
          paddingHorizontal: 8,
          marginHorizontal: 20,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarLabelStyle: { marginBottom: 6, fontSize: 11 },
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
            <Feather name="grid" color={color as any} size={size} />
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
            <Feather name="home" color={color as any} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" color={color as any} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
