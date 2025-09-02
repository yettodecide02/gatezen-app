// @ts-nocheck
import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";

type QuickLink = {
  key: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  href: string;
  color: string;
};

const QUICK_LINKS: QuickLink[] = [
  {
    key: "payments",
    title: "Payments",
    subtitle: "Pay your bills",
    icon: "credit-card",
    href: "/payments",
    color: "#F59E0B",
  },
  {
    key: "maintenance",
    title: "Maintenance",
    subtitle: "Repair & upkeep",
    icon: "tool",
    href: "/maintenance",
    color: "#8B5CF6",
  },
  {
    key: "visitors",
    title: "Visitors",
    subtitle: "Manage visitor access  ",
    icon: "users",
    href: "/visitors",
    color: "#06B6D4",
  },
  {
    key: "bookings",
    title: "Bookings",
    subtitle: "Amenities & events",
    icon: "calendar",
    href: "/bookings",
    color: "#14B8A6",
  },
  {
    key: "documents",
    title: "Documents",
    subtitle: "Policies & forms",
    icon: "file-text",
    href: "/documents",
    color: "#6366F1",
  },
  {
    key: "help",
    title: "Help",
    subtitle: "Support & FAQs",
    icon: "help-circle",
    href: "/help",
    color: "#10B981",
  },
];

export default function Dashboard() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const sub = useThemeColor({}, "icon");
  const insets = useSafeAreaInsets();

  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.brandRow}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <Text style={[styles.brandName, { color: text }]}>Gatezen</Text>
      </View>
      <Text style={[styles.subtitle, { color: sub }]}>Quick Links</Text>

      <View style={styles.grid}>
        {QUICK_LINKS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.href)}
            android_ripple={{ color: `${item.color}22` }}
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: `${item.color}22`,
                  borderColor: `${item.color}44`,
                },
              ]}
            >
              <Feather name={item.icon} size={20} color={item.color as any} />
            </View>
            <Text style={[styles.cardTitle, { color: text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!!item.subtitle && (
              <Text style={[styles.cardSub, { color: sub }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandLogo: { width: 36, height: 36, borderRadius: 8 },
  brandName: { fontSize: 30, fontWeight: "800", letterSpacing: 0.3 },
  subtitle: { fontSize: 13 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  iconBadge: {
    height: 36,
    width: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 12 },
});
