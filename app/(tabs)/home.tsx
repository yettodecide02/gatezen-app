// @ts-nocheck
import Toast from "@/components/Toast";
import { useAppContext } from "@/contexts/AppContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { queryKeys } from "@/lib/queryKeys";
import { fetchResidentDashboard } from "@/lib/queries/resident";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_LINKS = [
  {
    key: "payments",
    featureKey: "UTILITY_PAYMENT",
    title: "Payments",
    subtitle: "Pay your bills",
    icon: "credit-card",
    href: "/resident/payments",
    color: "#F59E0B",
  },
  {
    key: "maintenance",
    featureKey: "HELPDESK",
    title: "Maintenance",
    subtitle: "Repair & upkeep",
    icon: "tool",
    href: "/resident/maintenance",
    color: "#8B5CF6",
  },
  {
    key: "visitors",
    featureKey: "VISITOR_MANAGEMENT",
    title: "Visitors",
    subtitle: "Manage visitors",
    icon: "users",
    href: "/resident/visitors",
    color: "#06B6D4",
  },
  {
    key: "bookings",
    featureKey: "AMENITY_BOOKING",
    title: "Bookings",
    subtitle: "Amenities & events",
    icon: "calendar",
    href: "/resident/bookings",
    color: "#14B8A6",
  },
  {
    key: "documents",
    featureKey: "DOCUMENTS_UPLOADING",
    title: "Documents",
    subtitle: "Policies & forms",
    icon: "file-text",
    href: "/resident/documents",
    color: "#6366F1",
  },
  {
    key: "help",
    featureKey: null, // always visible
    title: "Help",
    subtitle: "Support & FAQs",
    icon: "help-circle",
    href: "/resident/help",
    color: "#10B981",
  },
  {
    key: "directory",
    featureKey: "DIRECTORY",
    title: "Directory",
    subtitle: "Browse residents",
    icon: "book",
    href: "/resident/directory",
    color: "#3B82F6",
  },
  {
    key: "notice-board",
    featureKey: "NOTICE_BOARD",
    title: "Notice Board",
    subtitle: "Community notices",
    icon: "clipboard",
    href: "/resident/notice-board",
    color: "#F97316",
  },
  {
    key: "surveys",
    featureKey: "SURVEYS",
    title: "Surveys",
    subtitle: "Share your feedback",
    icon: "bar-chart-2",
    href: "/resident/surveys",
    color: "#10B981",
  },
  {
    key: "polls",
    featureKey: "ELECTION_POLLS",
    title: "Election Polls",
    subtitle: "Vote on community matters",
    icon: "check-square",
    href: "/resident/election-polls",
    color: "#8B5CF6",
  },
  {
    key: "vehicles",
    featureKey: "VEHICLE_MANAGEMENT",
    title: "My Vehicles",
    subtitle: "Register & track",
    icon: "truck",
    href: "/resident/vehicles",
    color: "#0EA5E9",
  },
  {
    key: "parking",
    featureKey: "PARKING_RENTAL",
    title: "Rent Parking",
    subtitle: "Book a spot",
    icon: "map-pin",
    href: "/resident/parking",
    color: "#EC4899",
  },
  {
    key: "meetings",
    featureKey: "MEETING_ALIGNMENT",
    title: "Meetings",
    subtitle: "Community meetings",
    icon: "users",
    href: "/resident/meetings",
    color: "#22C55E",
  },
  {
    key: "home-planner",
    featureKey: "HOME_PLANNER",
    title: "Home Planner",
    subtitle: "Maintenance tasks",
    icon: "clipboard",
    href: "/resident/home-planner",
    color: "#F97316",
  },
];

export default function Dashboard() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const { toast, showWarning, hideToast } = useToast();
  const { user, token, enabledFeatures } = useAppContext();

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: queryKeys.resident.dashboard(
      user?.id ?? "",
      user?.communityId ?? "",
    ),
    queryFn: () =>
      fetchResidentDashboard(token, user!.id, user!.communityId as string),
    enabled: !!user?.id && !!user?.communityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const stats = {
    announcements: dashboardData?.announcementsCount ?? 0,
    maintenanceOpen:
      dashboardData?.maintenance?.filter(
        (t) => !["RESOLVED", "CANCELLED", "CLOSED"].includes(t.status),
      )?.length ?? 0,
    paymentsOverdue:
      dashboardData?.payments?.filter((p) => p.status === "OVERDUE")?.length ??
      0,
    upcomingBookings:
      dashboardData?.bookings?.filter((b) => new Date(b.startsAt) > new Date())
        ?.length ?? 0,
  };

  const STAT_CARDS = useMemo(
    () => [
      {
        key: "announcements",
        icon: "bell",
        featureKey: "COMMUNICATION",
        title: "Announcements",
        value: stats.announcements,
        color: "#3B82F6",
        href: "/resident/announcements",
      },
      {
        key: "tickets",
        icon: "tool",
        featureKey: "HELPDESK",
        title: "Open Tickets",
        value: stats.maintenanceOpen,
        color: "#8B5CF6",
        href: "/resident/maintenance",
      },
      {
        key: "payments",
        icon: "alert-circle",
        featureKey: "UTILITY_PAYMENT",
        title: "Overdue Bills",
        value: stats.paymentsOverdue,
        color: "#EF4444",
        href: "/resident/payments",
      },
      {
        key: "bookings",
        icon: "calendar",
        featureKey: "AMENITY_BOOKING",
        title: "Upcoming Bookings",
        value: stats.upcomingBookings,
        color: "#14B8A6",
        href: "/resident/bookings",
      },
    ],
    [stats],
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={{ flex: 1, paddingBottom: 70, backgroundColor: bg }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: 16,
          paddingHorizontal: 20,
          backgroundColor: bg,
          borderBottomWidth: 1,
          borderBottomColor: borderCol,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: tint + "18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="user" size={20} color={tint} />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: muted, fontWeight: "500" }}>
                {greeting()}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: text,
                  marginTop: 1,
                }}
              >
                {loading ? "Loading…" : user?.name?.split(" ")[0] || "Resident"}
              </Text>
            </View>
          </View>
        </View>
        {user?.communityName && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 10,
              gap: 5,
              backgroundColor: tint + "10",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              alignSelf: "flex-start",
            }}
          >
            <Feather name="map-pin" size={11} color={tint} />
            <Text style={{ fontSize: 12, color: tint, fontWeight: "500" }}>
              {user.communityName}
              {user.blockName ? ` · Block ${user.blockName}` : ""}
              {user.unitNumber ? ` · Unit ${user.unitNumber}` : ""}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 18,
          gap: 20,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: muted,
              letterSpacing: 0.5,
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Overview
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {STAT_CARDS.filter(
              (s) => !s.featureKey || enabledFeatures.includes(s.featureKey),
            ).map((s) => (
              <Pressable
                key={s.key}
                onPress={() => router.push(s.href)}
                style={({ pressed }) => ({
                  width: "48%",
                  backgroundColor: cardBg,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: borderCol,
                  padding: 16,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: s.color + "1A",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name={s.icon} size={18} color={s.color} />
                  </View>
                  {loading ? (
                    <ActivityIndicator size="small" color={s.color} />
                  ) : (
                    <Text
                      style={{ fontSize: 28, fontWeight: "700", color: text }}
                    >
                      {s.value}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: muted,
                    fontWeight: "500",
                  }}
                >
                  {s.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: muted,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Quick Access
            </Text>
            <Pressable
              onPress={() => router.push("/resident/quick-links")}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
              })}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: tint }}>
                All Services
              </Text>
              <Feather name="chevron-right" size={13} color={tint} />
            </Pressable>
          </View>
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: borderCol,
              backgroundColor: cardBg,
              overflow: "hidden",
            }}
          >
            {QUICK_LINKS.filter(
              (item) =>
                !item.featureKey || enabledFeatures.includes(item.featureKey),
            ).map((item, idx) => (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  gap: 12,
                  backgroundColor: pressed
                    ? isDark
                      ? "#222"
                      : "#F8FAFC"
                    : "transparent",
                  borderTopWidth: idx > 0 ? 1 : 0,
                  borderTopColor: borderCol,
                })}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: item.color + "18",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 15, fontWeight: "600", color: text }}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>
                    {item.subtitle}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={muted} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
