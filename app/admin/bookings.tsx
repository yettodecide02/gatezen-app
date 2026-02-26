// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";

// Booking Card Component
function BookingCard({ booking, theme, textColor, muted }) {
  const getStatusBadge = (status) => {
    let backgroundColor, color;

    switch (status?.toUpperCase()) {
      case "CONFIRMED":
        backgroundColor = "#dcfce7";
        color = "#16a34a";
        break;
      case "PENDING":
        backgroundColor = "#fef3c7";
        color = "#d97706";
        break;
      case "CANCELLED":
        backgroundColor = "#fee2e2";
        color = "#dc2626";
        break;
      default:
        backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
        color = theme === "dark" ? "#d1d5db" : "#6b7280";
    }

    return (
      <View style={[styles.badge, { backgroundColor }]}>
        <Text style={[styles.badgeText, { color }]}>{status || "Unknown"}</Text>
      </View>
    );
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const startDateTime = formatDateTime(booking.startsAt);
  const endDateTime = booking.endsAt ? formatDateTime(booking.endsAt) : null;

  return (
    <View
      style={[
        styles.bookingCard,
        {
          backgroundColor: theme === "dark" ? "#1F1F1F" : "#ffffff",
          borderColor:
            theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={[styles.titleText, { color: textColor }]}>
            {booking.facility?.name || "Amenity Booking"}
          </Text>
        </View>
        {getStatusBadge(booking.status)}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardDetail}>
          <Feather name="user" size={12} color={muted} />
          <Text style={[styles.detailText, { color: muted }]}>
            {booking.user?.name || "Unknown User"}
          </Text>
        </View>

        <View style={styles.cardDetail}>
          <Feather name="calendar" size={12} color={muted} />
          <Text style={[styles.detailText, { color: muted }]}>
            {startDateTime.date}
          </Text>
        </View>

        <View style={styles.cardDetail}>
          <Feather name="clock" size={12} color={muted} />
          <Text style={[styles.detailText, { color: muted }]}>
            {startDateTime.time}
            {endDateTime && ` - ${endDateTime.time}`}
          </Text>
        </View>

        {booking.description && (
          <Text
            style={[styles.description, { color: textColor }]}
            numberOfLines={2}
          >
            {booking.description}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.cardDetail}>
            <Feather name="calendar" size={12} color={muted} />
            <Text style={[styles.detailText, { color: muted }]}>
              Created: {new Date(booking.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {booking.amount && (
            <View style={styles.cardDetail}>
              <Feather name="dollar-sign" size={12} color={muted} />
              <Text style={[styles.detailText, { color: muted }]}>
                ₹{booking.amount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// Stat Card Component
function StatCard({
  icon,
  title,
  value,
  color = "#6366f1",
  theme,
  textColor,
  muted,
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: theme === "dark" ? "#1F1F1F" : "#ffffff",
          borderColor:
            theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      <View style={styles.statTop}>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <Feather name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.statTitle, { color: muted }]}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

export default function AdminBookings() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const muted = iconColor;
  const insets = useSafeAreaInsets();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const url = config.backendUrl;

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      if (!communityId) {
        Alert.alert(
          "Error",
          "Community information not found. Please login again.",
        );
        return;
      }

      const res = await axios.get(`${url}/admin/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: communityId },
      });
      setBookings(res.data.bookings || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      Alert.alert("Error", "Failed to load bookings data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getFilteredBookings = () => {
    switch (activeTab) {
      case "confirmed":
        return bookings.filter((b) => b.status === "CONFIRMED");
      case "cancelled":
        return bookings.filter((b) => b.status === "CANCELLED");
      default:
        return bookings;
    }
  };

  const getStats = () => {
    const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
    const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
    const totalRevenue = bookings
      .filter((b) => b.status === "CONFIRMED" && b.amount)
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    return {
      total: bookings.length,
      confirmed,
      cancelled,
      totalRevenue,
    };
  };

  const stats = getStats();
  const filteredBookings = getFilteredBookings();

  const tabs = [
    { key: "all", label: "All Bookings", count: stats.total },
    { key: "confirmed", label: "Confirmed", count: stats.confirmed },
    { key: "cancelled", label: "Cancelled", count: stats.cancelled },
  ];

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: bg },
        ]}
      >
        <Feather name="loader" size={32} color={tint} />
        <Text style={[styles.loadingText, { color: textColor }]}>
          Loading bookings...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Fixed Header */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: Math.max(insets.top, 16),
            backgroundColor: bg,
            borderBottomColor:
              theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={24} color={tint} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.title, { color: textColor }]}>Bookings</Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Manage facility bookings
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="calendar"
              title="Total Bookings"
              value={stats.total}
              color="#6366f1"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="check-circle"
              title="Confirmed"
              value={stats.confirmed}
              color="#10b981"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="x-circle"
              title="Cancelled"
              value={stats.cancelled}
              color="#ef4444"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="dollar-sign"
              title="Revenue"
              value={`₹${stats.totalRevenue.toLocaleString()}`}
              color="#8b5cf6"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
          >
            <View style={styles.tabs}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    {
                      backgroundColor:
                        activeTab === tab.key ? tint : "transparent",
                      borderColor:
                        activeTab === tab.key
                          ? tint
                          : theme === "dark"
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(0,0,0,0.2)",
                    },
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          activeTab === tab.key
                            ? theme === "dark"
                              ? "#11181C"
                              : "#ffffff"
                            : textColor,
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {tab.count > 0 && (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor:
                            activeTab === tab.key
                              ? theme === "dark"
                                ? "#11181C33"
                                : "#ffffff33"
                              : tint,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabBadgeText,
                          {
                            color:
                              activeTab === tab.key
                                ? theme === "dark"
                                  ? "#11181C"
                                  : "#ffffff"
                                : "#ffffff",
                          },
                        ]}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Bookings List */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme === "dark" ? "#1F1F1F" : "#ffffff",
                borderColor:
                  theme === "dark"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLeft}>
                <Feather name="calendar" size={20} color={tint} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  {activeTab === "all" && "All Bookings"}
                  {activeTab === "confirmed" && "Confirmed Bookings"}
                  {activeTab === "cancelled" && "Cancelled Bookings"}
                </Text>
              </View>
              <Text style={[styles.countText, { color: muted }]}>
                {filteredBookings.length} booking
                {filteredBookings.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {filteredBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="calendar" size={48} color={muted} />
                <Text style={[styles.emptyText, { color: muted }]}>
                  {activeTab === "all" && "No bookings found."}
                  {activeTab === "confirmed" && "No confirmed bookings."}
                  {activeTab === "cancelled" && "No cancelled bookings."}
                </Text>
              </View>
            ) : (
              <View style={styles.bookingsList}>
                {filteredBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    theme={theme}
                    textColor={textColor}
                    muted={muted}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statTitle: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  countText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 12,
  },
  bookingsList: {
    gap: 12,
  },
  bookingCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardContent: {
    gap: 6,
  },
  cardDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
});
