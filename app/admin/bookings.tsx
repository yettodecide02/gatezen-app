// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

function getStatusPill(status) {
  const s = status?.toUpperCase();
  if (s === "CONFIRMED") return { bg: "#D1FAE5", text: "#065F46" };
  if (s === "PENDING") return { bg: "#FEF3C7", text: "#92400E" };
  if (s === "CANCELLED") return { bg: "#FEE2E2", text: "#991B1B" };
  return { bg: "#F3F4F6", text: "#374151" };
}

// --- Booking Card ---
function BookingCard({ booking, theme, textColor, muted, borderCol }) {
  const isDark = theme === "dark";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const pill = getStatusPill(booking.status);

  const fmt = (d) => {
    const dt = new Date(d);
    return {
      date: dt.toLocaleDateString(),
      time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };
  const start = fmt(booking.startsAt);
  const end = booking.endsAt ? fmt(booking.endsAt) : null;

  return (
    <View
      style={[
        styles.bookCard,
        { backgroundColor: cardBg, borderColor: borderCol },
      ]}
    >
      <View style={styles.bookCardTop}>
        <View style={[styles.bookIconWrap, { backgroundColor: "#EEF2FF" }]}>
          <Feather name="calendar" size={15} color="#6366F1" />
        </View>
        <View style={styles.bookCardInfo}>
          <Text
            style={[styles.bookCardTitle, { color: textColor }]}
            numberOfLines={1}
          >
            {booking.facility?.name || "Facility Booking"}
          </Text>
          <View style={styles.bookMetaRow}>
            <Feather name="user" size={11} color={muted} />
            <Text style={[styles.bookMeta, { color: muted }]}>
              {booking.user?.name || "Unknown"}
            </Text>
          </View>
        </View>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.pillText, { color: pill.text }]}>
            {booking.status}
          </Text>
        </View>
      </View>

      <View style={[styles.bookCardFooter, { borderTopColor: borderCol }]}>
        <View style={styles.bookMetaItem}>
          <Feather name="calendar" size={11} color={muted} />
          <Text style={[styles.bookMeta, { color: muted }]}>{start.date}</Text>
        </View>
        <View style={styles.bookMetaItem}>
          <Feather name="clock" size={11} color={muted} />
          <Text style={[styles.bookMeta, { color: muted }]}>
            {start.time}
            {end ? ` - ${end.time}` : ""}
          </Text>
        </View>
        {booking.amount && (
          <View style={styles.bookMetaItem}>
            <Feather name="credit-card" size={11} color={muted} />
            <Text style={[styles.bookMeta, { color: muted }]}>
              INR {booking.amount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// --- Stat Card ---
function StatCard({
  icon,
  title,
  value,
  color = "#6366F1",
  theme,
  textColor,
  muted,
}) {
  const isDark = theme === "dark";
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: color + "1A" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: muted }]}>{title}</Text>
    </View>
  );
}

// --- Main Component ---
export default function AdminBookings() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const insets = useSafeAreaInsets();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { toast, showError, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      if (!communityId) {
        showError("Community information not found.");
        return;
      }
      const res = await axios.get(`${url}/admin/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId },
      });
      setBookings(res.data.bookings || []);
    } catch (e) {
      showError("Failed to load bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getFiltered = () => {
    if (activeTab === "confirmed")
      return bookings.filter((b) => b.status === "CONFIRMED");
    if (activeTab === "cancelled")
      return bookings.filter((b) => b.status === "CANCELLED");
    return bookings;
  };

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
  const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
  const totalRevenue = bookings
    .filter((b) => b.status === "CONFIRMED" && b.amount)
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const stats = { total: bookings.length, confirmed, cancelled, totalRevenue };

  const tabs = [
    { key: "all", label: "All Bookings", count: stats.total },
    { key: "confirmed", label: "Confirmed", count: stats.confirmed },
    { key: "cancelled", label: "Cancelled", count: stats.cancelled },
  ];

  const filteredBookings = getFiltered();

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Feather
          name="calendar"
          size={32}
          color={tint}
          style={{ opacity: 0.5, marginBottom: 12 }}
        />
        <Text style={{ fontSize: 14, color: muted }}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, 20),
            borderBottomColor: borderCol,
            backgroundColor: bg,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: borderCol }]}
          >
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              Bookings
            </Text>
            <Text style={[styles.headerSub, { color: muted }]}>
              Facility reservations
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={tint}
          />
        }
      >
        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="calendar"
              title="Total"
              value={stats.total}
              color="#6366F1"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="check-circle"
              title="Confirmed"
              value={stats.confirmed}
              color="#10B981"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="x-circle"
              title="Cancelled"
              value={stats.cancelled}
              color="#EF4444"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
          </View>

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 4 }}
          >
            <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: isActive ? tint : "transparent",
                        borderColor: isActive ? tint : borderCol,
                      },
                    ]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: isActive ? "#ffffff" : muted },
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {tab.count > 0 && (
                      <View
                        style={[
                          styles.tabCount,
                          {
                            backgroundColor: isActive
                              ? "rgba(255,255,255,0.25)"
                              : tint + "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabCountText,
                            { color: isActive ? "#ffffff" : tint },
                          ]}
                        >
                          {tab.count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* List */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.listHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Feather name="calendar" size={16} color={tint} />
                <Text style={[styles.listHeaderTitle, { color: textColor }]}>
                  {activeTab === "all"
                    ? "All Bookings"
                    : activeTab === "confirmed"
                      ? "Confirmed"
                      : "Cancelled"}
                </Text>
              </View>
              <Text style={[styles.listCount, { color: muted }]}>
                {filteredBookings.length}
              </Text>
            </View>

            {filteredBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather
                  name="calendar"
                  size={36}
                  color={muted}
                  style={{ opacity: 0.3 }}
                />
                <Text style={[styles.emptyText, { color: muted }]}>
                  No bookings found
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {filteredBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    theme={theme}
                    textColor={textColor}
                    muted={muted}
                    borderCol={borderCol}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: { fontSize: 13, fontWeight: "600" },
  tabCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: "center",
  },
  tabCountText: { fontSize: 10, fontWeight: "700" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  listHeaderTitle: { fontSize: 15, fontWeight: "600" },
  listCount: { fontSize: 12, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 13 },
  bookCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  bookCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  bookIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bookCardInfo: { flex: 1 },
  bookCardTitle: { fontSize: 14, fontWeight: "600" },
  bookMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  bookMeta: { fontSize: 12 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  bookCardFooter: {
    flexDirection: "row",
    gap: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  bookMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
});
