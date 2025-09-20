// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getUser } from "@/lib/auth";

type StatCardProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value: string | number;
  hint?: string;
  color: string;
  loading?: boolean;
};

function StatCard({ icon, title, value, hint, color, loading }: StatCardProps) {
  const theme = useColorScheme() ?? "light";
  const text = useThemeColor({}, "text");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: cardBg, borderColor: borderCol },
      ]}
    >
      <View style={styles.statTop}>
        <View
          style={[
            styles.statIcon,
            { backgroundColor: `${color}22`, borderColor: `${color}44` },
          ]}
        >
          <Feather name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.statTitle, { color: text }]}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color: text }]}>
        {loading ? "…" : value}
      </Text>
      {hint && (
        <Text style={[styles.statHint, { color: text, opacity: 0.6 }]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

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
    subtitle: "Manage visitors",
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

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    announcements: 0,
    maintenanceOpen: 0,
    paymentsOverdue: 0,
    upcomingBookings: 0,
  });

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

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch('/api/dashboard/stats');
        // const data = await response.json();
        // setStats(data);
        setStats({
          announcements: 0,
          maintenanceOpen: 0,
          paymentsOverdue: 0,
          upcomingBookings: 0,
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
    loadDashboardData();
  }, []);

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

      {/* Statistics Cards */}
      <Text style={[styles.subtitle, { color: sub }]}>Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard
          icon="bell"
          title="Announcements"
          value={stats.announcements}
          hint="New updates"
          color="#F59E0B"
          loading={loading}
        />
        <StatCard
          icon="tool"
          title="Maintenance"
          value={stats.maintenanceOpen}
          hint="Open tickets"
          color="#EF4444"
          loading={loading}
        />
        <StatCard
          icon="credit-card"
          title="Payments"
          value={stats.paymentsOverdue}
          hint="Overdue"
          color="#8B5CF6"
          loading={loading}
        />
        <StatCard
          icon="calendar"
          title="Bookings"
          value={stats.upcomingBookings}
          hint="Upcoming"
          color="#10B981"
          loading={loading}
        />
      </View>

      <View style={styles.quickLinksHeader}>
        <Text style={[styles.subtitle, { color: sub }]}>Quick Links</Text>
        <Pressable
          onPress={() => router.push("/quick-links")}
          style={styles.viewAllButton}
        >
          <Text style={[styles.viewAllText, { color: "#6366F1" }]}>
            View All
          </Text>
          <Feather name="arrow-right" size={14} color="#6366F1" />
        </Pressable>
      </View>

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
  subtitle: { fontSize: 13, marginTop: 8 },
  quickLinksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
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
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    height: 32,
    width: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },
  statHint: {
    fontSize: 11,
    marginTop: 2,
  },

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
