// @ts-nocheck
import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function GatekeeperTabsLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="visitors"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: colorScheme === "dark" ? "#8B9DC3" : "#6B7280",
        tabBarStyle: {
          position: "absolute",
          bottom: 30,
          left: 20,
          right: 20,
          elevation: 8,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(17, 17, 17, 0.9)"
              : "rgba(255, 255, 255, 0.9)",
          borderRadius: 50,
          height: 70,
          paddingBottom: 10,
          marginLeft: 20,
          marginRight: 20,
          paddingTop: 10,
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          backdropFilter: "blur(20px)",
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
