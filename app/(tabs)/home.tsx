import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getUser, getToken } from "@/lib/auth";
import { config } from "@/lib/config";
import { Platform, Screen, Styling } from "@/constants/Platform";

type StatCardProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value: string | number;
  hint?: string;
  color: string;
  loading?: boolean;
  onPress?: () => void;
};

function StatCard({
  icon,
  title,
  value,
  hint,
  color,
  loading,
  onPress,
}: StatCardProps) {
  const theme = useColorScheme() ?? "light";
  const text = useThemeColor({}, "text");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const getCardWidth = () => {
    if (Screen.width > 1200) return "23%";
    if (Screen.width > 768) return "31%";
    return "48%";
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        {
          backgroundColor: cardBg,
          borderColor: borderCol,
          width: getCardWidth(),
          opacity: pressed ? 0.75 : 1,
          ...Styling.shadow,
        },
      ]}
    >
      <View style={styles.statCardContent}>
        {/* Left: Icon */}
        <View
          style={[
            styles.statCardIcon,
            {
              backgroundColor: `${color}12`,
            },
          ]}
        >
          <Feather
            name={icon}
            size={Screen.isTablet ? 32 : 28}
            color={color}
            opacity={0.8}
          />
        </View>

        {/* Right: Value and Title */}
        <View style={styles.statCardRight}>
          {loading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Text
              style={[
                styles.statValue,
                {
                  color: text,
                  fontSize: Screen.isTablet ? 36 : Screen.isSmall ? 24 : 28,
                  fontWeight: Styling.fontWeight.bold,
                },
              ]}
            >
              {value}
            </Text>
          )}
          <Text
            style={[
              styles.statTitle,
              {
                color: text,
                opacity: 0.6,
                fontSize: Screen.isTablet ? 14 : 12,
                fontWeight: Styling.fontWeight.medium,
                marginTop: 6,
              },
            ]}
          >
            {title}
          </Text>
          {hint && (
            <Text
              style={[
                styles.statHint,
                {
                  color: color,
                  opacity: 0.8,
                  fontSize: Screen.isTablet ? 12 : 11,
                  fontWeight: Styling.fontWeight.medium,
                  marginTop: 4,
                },
              ]}
            >
              {hint}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

type QuickLinkCardProps = {
  item: {
    title: string;
    subtitle?: string;
    icon: keyof typeof Feather.glyphMap;
    href: string;
    color: string;
  };
};

function QuickLinkCard({ item }: QuickLinkCardProps) {
  const theme = useColorScheme() ?? "light";
  const text = useThemeColor({}, "text");
  const sub = useThemeColor({}, "icon");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const getCardWidth = () => {
    if (Screen.width > 1200) return "23%";
    if (Screen.width > 768) return "31%";
    if (Screen.width > 600) return "48%";
    return "48%";
  };

  return (
    <Pressable
      onPress={() => router.push(item.href as any)}
      style={({ pressed }) => [
        styles.quickLinkCard,
        {
          backgroundColor: cardBg,
          borderColor: borderCol,
          width: getCardWidth(),
          opacity: pressed ? 0.7 : 1,
          ...Styling.shadow,
        },
      ]}
    >
      <View
        style={[
          styles.quickLinkIcon,
          {
            backgroundColor: `${item.color}15`,
            borderColor: `${item.color}30`,
            borderRadius: Styling.borderRadius.md,
          },
        ]}
      >
        <Feather
          name={item.icon}
          size={Screen.isTablet ? 26 : 22}
          color={item.color}
        />
      </View>
      <View style={styles.quickLinkContent}>
        <Text
          style={[
            styles.quickLinkTitle,
            {
              color: text,
              fontSize: Screen.isTablet ? 17 : 15,
              fontWeight: Styling.fontWeight.semibold,
            },
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        {item.subtitle && (
          <Text
            style={[
              styles.quickLinkSubtitle,
              {
                color: sub,
                fontSize: Screen.isTablet ? 14 : 12,
              },
            ]}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        )}
      </View>
      <Feather
        name="chevron-right"
        size={18}
        color={sub}
        style={{ opacity: 0.5 }}
      />
    </Pressable>
  );
}

const QUICK_LINKS = [
  {
    key: "payments",
    title: "Payments",
    subtitle: "Pay your bills",
    icon: "credit-card" as const,
    href: "/payments",
    color: "#F59E0B",
  },
  {
    key: "maintenance",
    title: "Maintenance",
    subtitle: "Repair & upkeep",
    icon: "tool" as const,
    href: "/maintenance",
    color: "#8B5CF6",
  },
  {
    key: "visitors",
    title: "Visitors",
    subtitle: "Manage visitors",
    icon: "users" as const,
    href: "/visitors",
    color: "#06B6D4",
  },
  {
    key: "bookings",
    title: "Bookings",
    subtitle: "Amenities & events",
    icon: "calendar" as const,
    href: "/bookings",
    color: "#14B8A6",
  },
  {
    key: "documents",
    title: "Documents",
    subtitle: "Policies & forms",
    icon: "file-text" as const,
    href: "/documents",
    color: "#6366F1",
  },
  {
    key: "help",
    title: "Help",
    subtitle: "Support & FAQs",
    icon: "help-circle" as const,
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
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    announcements: 0,
    maintenanceOpen: 0,
    paymentsOverdue: 0,
    upcomingBookings: 0,
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        const userData = await getUser();
        if (userData && (userData as any).role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        setUser(userData);

        // Fetch dashboard stats if user data is available
        if ((userData as any)?.id && (userData as any)?.communityId) {
          try {
            const token = await getToken();
            const backendUrl = config.backendUrl;

            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.get(
              `${backendUrl}/resident/dashboard`,
              {
                params: {
                  userId: (userData as any).id,
                  communityId: (userData as any).communityId,
                },
                headers,
              },
            );

            if (response.data) {
              setStats({
                announcements: response.data.announcementsCount || 0,
                maintenanceOpen:
                  response.data.maintenance?.filter(
                    (t: any) =>
                      t.status !== "RESOLVED" &&
                      t.status !== "CANCELLED" &&
                      t.status !== "CLOSED",
                  )?.length || 0,
                paymentsOverdue:
                  response.data.payments?.filter(
                    (p: any) => p.status === "OVERDUE",
                  )?.length || 0,
                upcomingBookings:
                  response.data.bookings?.filter(
                    (b: any) => new Date(b.startsAt) > new Date(),
                  )?.length || 0,
              });
            }
          } catch (dashboardError) {
            console.warn("Failed to fetch dashboard stats:", dashboardError);
            // Stats will remain at default values
          }
        }
      } catch (error) {
        console.error("Dashboard initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Responsive padding
  const contentPadding = Screen.isTablet ? 24 : Styling.spacing.md;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + Styling.spacing.lg,
          paddingBottom: Platform.isIOS ? 100 : 80,
          paddingHorizontal: contentPadding,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            source={require("@/assets/images/splash-icon.png")}
            style={[
              styles.brandLogo,
              {
                width: Screen.isTablet ? 48 : 40,
                height: Screen.isTablet ? 48 : 40,
                borderRadius: Styling.borderRadius.md,
              },
            ]}
            resizeMode="contain"
          />
          <View>
            <Text
              style={[
                styles.brandName,
                {
                  color: text,
                  fontSize: Screen.isTablet ? 32 : Screen.isSmall ? 24 : 28,
                  fontWeight: Styling.fontWeight.bold,
                },
              ]}
            >
              CGate
            </Text>
            {user && (
              <Text
                style={[
                  styles.welcomeText,
                  {
                    color: sub,
                    fontSize: Screen.isTablet ? 15 : 13,
                  },
                ]}
              >
                Welcome back!
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Statistics Section */}
      <View style={[styles.section, { marginTop: Styling.spacing.xl }]}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: text,
              fontSize: Screen.isTablet ? 20 : 18,
              fontWeight: Styling.fontWeight.semibold,
            },
          ]}
        >
          Overview
        </Text>
        <View style={[styles.statsContainer, { gap: Styling.spacing.md }]}>
          <StatCard
            icon="bell"
            title="Announcements"
            value={stats.announcements}
            hint="New updates"
            color="#F59E0B"
            loading={loading}
            onPress={() => router.push("/announcements")}
          />
          <StatCard
            icon="tool"
            title="Maintenance"
            value={stats.maintenanceOpen}
            hint="Open tickets"
            color="#EF4444"
            loading={loading}
            onPress={() => router.push("/maintenance")}
          />
          <StatCard
            icon="credit-card"
            title="Payments"
            value={stats.paymentsOverdue}
            hint="Overdue"
            color="#8B5CF6"
            loading={loading}
            onPress={() => router.push("/payments")}
          />
          <StatCard
            icon="calendar"
            title="Bookings"
            value={stats.upcomingBookings}
            hint="Upcoming"
            color="#10B981"
            loading={loading}
            onPress={() => router.push("/bookings")}
          />
        </View>
      </View>

      {/* Quick Links Section */}
      <View style={[styles.section, { marginTop: Styling.spacing.xl }]}>
        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: text,
                fontSize: Screen.isTablet ? 20 : 18,
                fontWeight: Styling.fontWeight.semibold,
              },
            ]}
          >
            Quick Actions
          </Text>
          <Pressable
            onPress={() => router.push("/quick-links" as any)}
            style={({ pressed }) => [
              styles.viewAllButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text
              style={[
                styles.viewAllText,
                {
                  fontSize: Screen.isTablet ? 15 : 13,
                  fontWeight: Styling.fontWeight.medium,
                },
              ]}
            >
              View All
            </Text>
            <Feather name="arrow-right" size={16} color="#6366F1" />
          </Pressable>
        </View>

        <View style={[styles.quickLinksContainer, { gap: Styling.spacing.md }]}>
          {QUICK_LINKS.map((item) => (
            <QuickLinkCard key={item.key} item={item} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandLogo: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  brandName: {
    letterSpacing: -0.5,
  },
  welcomeText: {
    marginTop: 2,
  },
  profileButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    letterSpacing: -0.3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewAllText: {
    color: "#6366F1",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  statCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statCardIcon: {
    width: 60,
    height: 60,
    borderRadius: Styling.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statCardRight: {
    flex: 1,
    gap: 4,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statIconContainer: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statContent: {
    gap: 4,
  },
  statValue: {
    letterSpacing: -0.5,
  },
  statTitle: {
    letterSpacing: 0.2,
  },
  statHint: {
    marginTop: 2,
  },
  quickLinksContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  quickLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  quickLinkContent: {
    flex: 1,
    gap: 2,
  },
  quickLinkTitle: {
    letterSpacing: -0.2,
  },
  quickLinkSubtitle: {
    opacity: 0.7,
  },
});
