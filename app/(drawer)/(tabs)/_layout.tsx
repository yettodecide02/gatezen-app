// @ts-nocheck
import { Tabs } from "expo-router/tabs";
import { Feather } from "@expo/vector-icons";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function TabsLayout() {
  const tint = useThemeColor({}, "tint");
  const text = useThemeColor({}, "text");
  const bg = useThemeColor({}, "background");

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: bg as any },
        headerTintColor: tint as any,
        headerLeft: () => <DrawerToggleButton tintColor={tint as any} />,
        tabBarActiveTintColor: tint as any,
        tabBarInactiveTintColor: text as any,
      }}
      initialRouteName="dashboard"
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" color={color as any} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          tabBarIcon: ({ color, size }) => (
            <Feather name="credit-card" color={color as any} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          title: "Visitors",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" color={color as any} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" color={color as any} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
