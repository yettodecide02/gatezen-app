// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
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
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const QUICK_LINKS = [
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
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const [loading, setLoading] = useState(true);
  const [user, setUserState] = useState(null);
  const [stats, setStats] = useState({
    announcements: 0,
    maintenanceOpen: 0,
    paymentsOverdue: 0,
    upcomingBookings: 0,
  });
  const { toast, showWarning, hideToast } = useToast();

  useEffect(() => {
    const initialize = async () => {
      try {
        const userData = await getUser();
        if (userData?.role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        setUserState(userData);
        if (userData?.id && userData?.communityId) {
          try {
            const token = await getToken();
            const res = await axios.get(
              `${config.backendUrl}/resident/dashboard`,
              {
                params: {
                  userId: userData.id,
                  communityId: userData.communityId,
                },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              },
            );
            if (res.data) {
              setStats({
                announcements: res.data.announcementsCount || 0,
                maintenanceOpen:
                  res.data.maintenance?.filter(
                    (t) =>
                      !["RESOLVED", "CANCELLED", "CLOSED"].includes(t.status),
                  )?.length || 0,
                paymentsOverdue:
                  res.data.payments?.filter((p) => p.status === "OVERDUE")
                    ?.length || 0,
                upcomingBookings:
                  res.data.bookings?.filter(
                    (b) => new Date(b.startsAt) > new Date(),
                  )?.length || 0,
              });
            }
          } catch {}
        }
      } catch {
        showWarning("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  const STAT_CARDS = [
    {
      icon: "bell",
      title: "Announcements",
      value: stats.announcements,
      color: "#3B82F6",
      href: "/announcements",
    },
    {
      icon: "tool",
      title: "Open Tickets",
      value: stats.maintenanceOpen,
      color: "#8B5CF6",
      href: "/maintenance",
    },
    {
      icon: "alert-circle",
      title: "Overdue Bills",
      value: stats.paymentsOverdue,
      color: "#EF4444",
      href: "/payments",
    },
    {
      icon: "calendar",
      title: "Upcoming Bookings",
      value: stats.upcomingBookings,
      color: "#14B8A6",
      href: "/bookings",
    },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
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
            {STAT_CARDS.map((s) => (
              <Pressable
                key={s.icon}
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
              onPress={() => router.push("/quick-links")}
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
            {QUICK_LINKS.map((item, idx) => (
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
