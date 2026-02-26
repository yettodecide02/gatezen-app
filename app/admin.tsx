// @ts-nocheck
import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { logout, getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";

// Stat Card Component
function StatCard({
  icon,
  title,
  value,
  hint,
  accentColor,
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
        <View style={[styles.statIcon, { backgroundColor: accentColor }]}>
          <Feather name={icon} size={20} color="#ffffff" />
        </View>
        <Text style={[styles.statTitle, { color: muted }]}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      {hint && <Text style={[styles.statHint, { color: muted }]}>{hint}</Text>}
    </View>
  );
}

// Announcement Modal Component
function AnnouncementModal({
  visible,
  onClose,
  onSubmit,
  theme,
  textColor,
  tint,
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    const communityId = await getCommunityId();
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        communityId: communityId,
      });
      setTitle("");
      setContent("");
      onClose();
    } catch (error) {
      console.error("Error creating announcement:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: theme === "dark" ? "#1F1F1F" : "#ffffff" },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Create New Announcement
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>Title</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme === "dark" ? "#181818" : "#f3f4f6",
                    color: textColor,
                    borderColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.08)",
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter announcement title"
                placeholderTextColor={theme === "dark" ? "#666" : "#999"}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>Content</Text>
              <TextInput
                style={[
                  styles.textarea,
                  {
                    backgroundColor: theme === "dark" ? "#181818" : "#f3f4f6",
                    color: textColor,
                    borderColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.08)",
                  },
                ]}
                value={content}
                onChangeText={setContent}
                placeholder="Enter announcement content"
                placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.submitButton,
                { backgroundColor: tint },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.submitButtonText,
                  { color: theme === "dark" ? "#11181C" : "#ffffff" },
                ]}
              >
                {isSubmitting ? "Creating..." : "Create"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminDashboard() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const muted = iconColor;
  const insets = useSafeAreaInsets();

  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const url = config.backendUrl;

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
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

      const res = await axios.get(
        `${url}/admin/dashboard?communityId=${communityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = res.data;
      setPayments(data.payments || []);
      setMaintenance(data.maintenance || []);
      setBookings(data.bookings || []);
      setUsers(data.users || []);
      setAnnouncements(data.announcements || []);
      setPendingRequests(data.pendingRequests || []);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      Alert.alert("Error", "Failed to load admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const handleResidentAction = async (userId, action) => {
    try {
      const token = await getToken();
      const endpoint =
        action === "approve"
          ? "/admin/approve-resident"
          : "/admin/reject-resident";

      await axios.post(
        `${url}${endpoint}`,
        { userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Alert.alert(
        "Success",
        `Resident has been ${
          action === "approve" ? "approved" : "rejected"
        } successfully.`,
      );
      fetchAdminData();
    } catch (error) {
      console.error(`Error ${action}ing resident:`, error);
      Alert.alert("Error", `Failed to ${action} resident. Please try again.`);
    }
  };

  const handleCreateAnnouncement = async (announcementData) => {
    try {
      const token = await getToken();
      await axios.post(`${url}/admin/create-announcement`, announcementData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert("Success", "Announcement created successfully!");
      fetchAdminData();
    } catch (error) {
      console.error("Error creating announcement:", error);
      Alert.alert("Error", "Failed to create announcement. Please try again.");
      throw error;
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const kpis = useMemo(() => {
    const totalDue = payments
      .filter((p) => p.status === "PENDING" || p.status === "OVERDUE")
      .reduce((a, b) => a + (b.amount || 0), 0);
    const openMaint = maintenance.filter(
      (m) => m.status !== "RESOLVED" && m.status !== "CLOSED",
    ).length;
    const cancelledBookings = bookings.filter(
      (b) => b.status === "CANCELLED",
    ).length;
    return { totalDue, openMaint, cancelledBookings };
  }, [payments, maintenance, bookings]);

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
          Loading admin dashboard...
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
            borderBottomColor: borderCol,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.adminBadge, { backgroundColor: tint }]}>
              <Feather
                name="shield"
                size={20}
                color={theme === "dark" ? "#11181C" : "#ffffff"}
              />
            </View>
            <View>
              <Text style={[styles.title, { color: textColor }]}>
                Admin Dashboard
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Community Management
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
            <Feather name="log-out" size={20} color={muted} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="dollar-sign"
              title="Outstanding Dues"
              value={`₹ ${kpis.totalDue.toLocaleString()}`}
              hint="Across all users"
              accentColor="#6366f1"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="tool"
              title="Open Maintenance"
              value={kpis.openMaint}
              hint="Awaiting action"
              accentColor="#f59e0b"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="calendar"
              title="Cancelled Bookings"
              value={kpis.cancelledBookings}
              hint="Total cancelled"
              accentColor="#06b6d4"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="user-plus"
              title="Pending Requests"
              value={pendingRequests.length}
              hint="New residents"
              accentColor="#8b5cf6"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
          </View>

          {/* Quick Actions */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLeft}>
                <Feather name="zap" size={20} color={tint} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Quick Actions
                </Text>
              </View>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[
                  styles.quickActionCard,
                  { backgroundColor: theme === "dark" ? "#181818" : "#f9fafb" },
                ]}
                onPress={() => router.push("/admin/communityConfig")}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#6366f1" },
                  ]}
                >
                  <Feather name="home" size={24} color="#ffffff" />
                </View>
                <Text style={[styles.quickActionTitle, { color: textColor }]}>
                  Community
                </Text>
                <Text style={[styles.quickActionDesc, { color: muted }]}>
                  Facilities config
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickActionCard,
                  { backgroundColor: theme === "dark" ? "#181818" : "#f9fafb" },
                ]}
                onPress={() => router.push("/admin/blocksandunits")}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#06b6d4" },
                  ]}
                >
                  <Feather name="grid" size={24} color="#ffffff" />
                </View>
                <Text style={[styles.quickActionTitle, { color: textColor }]}>
                  Blocks & Units
                </Text>
                <Text style={[styles.quickActionDesc, { color: muted }]}>
                  Manage structure
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[
                  styles.quickActionCard,
                  { backgroundColor: theme === "dark" ? "#181818" : "#f9fafb" },
                ]}
                onPress={() => router.push("/admin/staffmanagement")}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#8b5cf6" },
                  ]}
                >
                  <Feather name="shield" size={24} color="#ffffff" />
                </View>
                <Text style={[styles.quickActionTitle, { color: textColor }]}>
                  Staff
                </Text>
                <Text style={[styles.quickActionDesc, { color: muted }]}>
                  Manage gatekeepers
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickActionCard,
                  { backgroundColor: theme === "dark" ? "#181818" : "#f9fafb" },
                ]}
                onPress={() => router.push("/admin/visitorlog")}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#f59e0b" },
                  ]}
                >
                  <Feather name="users" size={24} color="#ffffff" />
                </View>
                <Text style={[styles.quickActionTitle, { color: textColor }]}>
                  Visitor Log
                </Text>
                <Text style={[styles.quickActionDesc, { color: muted }]}>
                  Track visitors
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Announcements Section */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.sectionHeader}>
              <TouchableOpacity
                style={styles.sectionLeft}
                onPress={() => router.push("/admin/announcements")}
              >
                <Feather name="bell" size={20} color={tint} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Latest Announcements
                </Text>
                <Feather name="chevron-right" size={16} color={muted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: tint }]}
                onPress={() => setShowAnnouncementModal(true)}
              >
                <Feather
                  name="plus"
                  size={16}
                  color={theme === "dark" ? "#11181C" : "#ffffff"}
                />
              </TouchableOpacity>
            </View>

            {announcements.length === 0 ? (
              <Text style={[styles.emptyText, { color: muted }]}>
                No announcements yet.
              </Text>
            ) : (
              announcements.slice(0, 3).map((announcement) => (
                <View key={announcement.id} style={styles.listItem}>
                  <Text style={[styles.listTitle, { color: textColor }]}>
                    {announcement.title}
                  </Text>
                  <Text style={[styles.listSub, { color: muted }]}>
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </Text>
                  <Text
                    style={[styles.listBody, { color: textColor }]}
                    numberOfLines={2}
                  >
                    {announcement.content}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Resident Requests Section */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.sectionHeader}>
              <TouchableOpacity
                style={styles.sectionLeft}
                onPress={() => router.push("/admin/residents")}
              >
                <Feather name="user-plus" size={20} color={tint} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Resident Requests
                </Text>
                <Feather name="chevron-right" size={16} color={muted} />
              </TouchableOpacity>
            </View>

            {pendingRequests.length === 0 ? (
              <Text style={[styles.emptyText, { color: muted }]}>
                No pending requests.
              </Text>
            ) : (
              pendingRequests.slice(0, 5).map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestInfo}>
                    <Text style={[styles.listTitle, { color: textColor }]}>
                      {request.name}
                    </Text>
                    <Text style={[styles.listSub, { color: muted }]}>
                      {request.email}
                    </Text>
                    <Text style={[styles.listSub, { color: muted }]}>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#22c55e" },
                      ]}
                      onPress={() =>
                        handleResidentAction(request.id, "approve")
                      }
                    >
                      <Feather name="check" size={16} color="#ffffff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#ef4444" },
                      ]}
                      onPress={() => handleResidentAction(request.id, "reject")}
                    >
                      <Feather name="x" size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Maintenance Section */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.sectionHeader}>
              <TouchableOpacity
                style={styles.sectionLeft}
                onPress={() => router.push("/admin/maintenance")}
              >
                <Feather name="tool" size={20} color={tint} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Open Maintenance
                </Text>
                <Feather name="chevron-right" size={16} color={muted} />
              </TouchableOpacity>
            </View>

            {maintenance.filter(
              (m) => m.status !== "RESOLVED" && m.status !== "CLOSED",
            ).length === 0 ? (
              <Text style={[styles.emptyText, { color: muted }]}>
                All maintenance requests resolved.
              </Text>
            ) : (
              maintenance
                .filter((m) => m.status !== "RESOLVED" && m.status !== "CLOSED")
                .slice(0, 5)
                .map((item) => (
                  <View key={item.id} style={styles.listItem}>
                    <View style={styles.listItemRow}>
                      <View style={styles.listItemInfo}>
                        <Text style={[styles.listTitle, { color: textColor }]}>
                          {item.title || "Maintenance Request"}
                        </Text>
                        <Text style={[styles.listSub, { color: muted }]}>
                          {item.category || "General"} •{" "}
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View
                        style={[styles.badge, { backgroundColor: "#f59e0b" }]}
                      >
                        <Text style={styles.badgeText}>{item.status}</Text>
                      </View>
                    </View>
                  </View>
                ))
            )}
          </View>

          {/* Recent Bookings Section */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.sectionHeader}>
              <TouchableOpacity
                style={styles.sectionLeft}
                onPress={() => router.push("/admin/bookings")}
              >
                <Feather name="calendar" size={20} color={tint} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Recent Bookings
                </Text>
                <Feather name="chevron-right" size={16} color={muted} />
              </TouchableOpacity>
            </View>

            {bookings.length === 0 ? (
              <Text style={[styles.emptyText, { color: muted }]}>
                No bookings yet.
              </Text>
            ) : (
              bookings.slice(0, 5).map((booking) => (
                <View key={booking.id} style={styles.listItem}>
                  <View style={styles.listItemRow}>
                    <View style={styles.listItemInfo}>
                      <Text style={[styles.listTitle, { color: textColor }]}>
                        {booking.facility?.name || "Amenity"}
                      </Text>
                      <Text style={[styles.listSub, { color: muted }]}>
                        {booking.user?.name} •{" "}
                        {new Date(booking.startsAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            booking.status === "CONFIRMED"
                              ? "#22c55e"
                              : "#06b6d4",
                        },
                      ]}
                    >
                      <Text style={styles.badgeText}>{booking.status}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <AnnouncementModal
        visible={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSubmit={handleCreateAnnouncement}
        theme={theme}
        textColor={textColor}
        tint={tint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  scrollView: {
    flex: 1,
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
  },
  adminBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  logoutIcon: {
    padding: 8,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  statHint: {
    fontSize: 11,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
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
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    fontStyle: "italic",
    paddingVertical: 20,
  },
  listItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listItemInfo: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  listSub: {
    fontSize: 12,
    marginBottom: 2,
  },
  listBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  requestInfo: {
    flex: 1,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  quickActionDesc: {
    fontSize: 11,
    textAlign: "center",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 0,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 80,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  submitButton: {
    // backgroundColor will be set dynamically
  },
  submitButtonText: {
    fontWeight: "600",
  },
});
