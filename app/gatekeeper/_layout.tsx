// @ts-nocheck
import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { BlurView } from "expo-blur";

export default function GatekeeperTabsLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="visitors"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: colorScheme === "dark" ? "#8B9DC3" : "#6B7280",
        tabBarBackground: () => (
          <BlurView
            tint={colorScheme === "dark" ? "dark" : "light"}
            intensity={90}
            style={{ flex: 1, borderRadius: 50 }}
          />
        ),
        tabBarStyle: {
          position: "absolute",
          bottom: 25,
          left: 20,
          right: 20,
          elevation: 5,
          backgroundColor: "transparent", // blur handles background
          borderRadius: 50,
          height: 70,
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          borderTopWidth: 0,
          overflow: "hidden", // required for rounded BlurView corners
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="visitors"
        options={{
          title: "Visitors",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="users" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="camera" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="packages"
        options={{
          title: "Packages",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="package" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="user" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
