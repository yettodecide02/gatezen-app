// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, View } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { BlurView } from "expo-blur";
import { getEnabledFeatures } from "@/lib/auth";

export default function GatekeeperTabsLayout() {
  const colorScheme = useColorScheme();
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);

  useEffect(() => {
    getEnabledFeatures().then(setEnabledFeatures);
  }, []);

  const hideTab = (feature: string) =>
    enabledFeatures.length > 0 && !enabledFeatures.includes(feature)
      ? { tabBarButton: () => null, tabBarItemStyle: { display: "none" } }
      : {};

  return (
    <Tabs
      initialRouteName="visitors"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: colorScheme === "dark" ? "#8B9DC3" : "#6B7280",
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              tint={colorScheme === "dark" ? "dark" : "light"}
              intensity={90}
              style={{ flex: 1, borderRadius: 50 }}
            />
          ) : (
            <View
              style={{
                flex: 1,
                borderRadius: 50,
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(18,18,18,0.96)"
                    : "rgba(255,255,255,0.96)",
              }}
            />
          ),
        tabBarStyle: {
          position: "absolute",
          bottom: 25,
          left: 20,
          right: 20,
          elevation: 5,
          backgroundColor: "transparent",
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
        name="vehicle-search"
        options={{
          title: "Vehicles",
          ...hideTab("VEHICLE_SEARCH"),
          tabBarIcon: ({ color, focused }) => (
            <Feather name="search" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="packages"
        options={{
          title: "Packages",
          ...hideTab("DELIVERY_MANAGEMENT"),
          tabBarIcon: ({ color, focused }) => (
            <Feather name="package" size={focused ? 26 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="intercom"
        options={{
          title: "Intercom",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="phone" size={focused ? 26 : 22} color={color} />
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
