// @ts-nocheck
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function DrawerLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          drawerActiveTintColor: colorScheme === "dark" ? "#fff" : "#000",
          drawerInactiveTintColor: colorScheme === "dark" ? "#ccc" : "#666",
          drawerStyle: {
            backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
          },
          headerStyle: {
            backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
          },
          headerTintColor: colorScheme === "dark" ? "#fff" : "#000",
        }}
      >
        <Drawer.Screen
          name="dashboard"
          options={{
            drawerLabel: "Dashboard",
            title: "Dashboard",
            drawerIcon: ({ color }) => (
              <Feather name="home" size={20} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="payments"
          options={{
            drawerLabel: "Payments",
            title: "Payments",
            drawerIcon: ({ color }) => (
              <Feather name="credit-card" size={20} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="bookings"
          options={{
            drawerLabel: "Bookings",
            title: "Bookings",
            drawerIcon: ({ color }) => (
              <Feather name="calendar" size={20} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="visitors"
          options={{
            drawerLabel: "Visitors",
            title: "Visitors",
            drawerIcon: ({ color }) => (
              <Feather name="users" size={20} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="documents"
          options={{
            drawerLabel: "Documents",
            title: "Documents",
            drawerIcon: ({ color }) => (
              <Feather name="file-text" size={20} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="maintenance"
          options={{
            drawerLabel: "Maintenance",
            title: "Maintenance",
            drawerIcon: ({ color }) => (
              <Feather name="tool" size={20} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="help"
          options={{
            drawerLabel: "Help",
            title: "Help",
            drawerIcon: ({ color }) => (
              <Feather name="help-circle" size={20} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: "Profile",
            title: "Profile",
            drawerIcon: ({ color }) => (
              <Feather name="user" size={20} color={color} />
            ),
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
