// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ConfirmModal from "@/components/ConfirmModal";
import { SkeletonStatCard } from "@/components/SkeletonLoader";
import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { getCommunityId, getToken, logout } from "@/lib/auth";
import { config } from "@/lib/config";

// ─── Helpers ───────────────────────────────────
function getStatusPill(status: string) {
  const s = status?.toUpperCase();
  if (s === "CONFIRMED" || s === "APPROVED" || s === "RESOLVED")
    return { bg: "#D1FAE5", text: "#065F46" };
  if (s === "PENDING" || s === "SUBMITTED")
    return { bg: "#FEF3C7", text: "#92400E" };
  if (s === "CANCELLED" || s === "REJECTED" || s === "OVERDUE")
    return { bg: "#FEE2E2", text: "#991B1B" };
  if (s === "IN_PROGRESS") return { bg: "#DBEAFE", text: "#1E40AF" };
  return { bg: "#F3F4F6", text: "#374151" };
}

// ─── Stat Card ───────────────────────────────
function StatCard({
  icon,
  title,
  value,
  hint,
  accentColor,
  theme,
  textColor,
  muted,
  onPress,
}) {
  const isDark = theme === "dark";
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.statCard,
        {
          backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
        },
      ]}
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
          style={[
            styles.statIconWrap,
            { backgroundColor: `${accentColor}1A`, marginBottom: 0 },
          ]}
        >
          <Feather name={icon} size={18} color={accentColor} />
        </View>
        <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      </View>
      <Text style={[styles.statTitle, { color: muted }]} numberOfLines={1}>
        {title}
      </Text>
      {hint && <Text style={[styles.statHint, { color: muted }]}>{hint}</Text>}
    </Wrapper>
  );
}

// ─── Action Tile ─────────────────────────────
function ActionTile({ icon, label, desc, color, onPress, theme }) {
  const isDark = theme === "dark";
  return (
    <TouchableOpacity
      style={[
        styles.actionTile,
        {
          backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.actionTileIcon, { backgroundColor: `${color}1A` }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <Text
        style={[
          styles.actionTileLabel,
          { color: isDark ? "#F1F5F9" : "#0F172A" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.actionTileDesc,
          { color: isDark ? "#94A3B8" : "#64748B" },
        ]}
      >
        {desc}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Section Header ───────────────────────────
function SectionHeader({ icon, title, onSeeAll, tint, textColor }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLeft}>
        <Feather name={icon} size={18} color={tint} />
        <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={[styles.seeAllText, { color: tint }]}>See all</Text>
          <Feather name="chevron-right" size={14} color={tint} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Announcement Modal ───────────────────────
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
  const isDark = theme === "dark";

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    const communityId = await getCommunityId();
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        communityId,
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

  const inputStyle = {
    backgroundColor: isDark ? "#252525" : "#F8FAFC",
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    color: textColor,
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF" },
          ]}
        >
          <View style={styles.modalHandle} />
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: textColor }]}>
              New Announcement
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Feather
                name="x"
                size={20}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text
              style={[
                styles.inputLabel,
                { color: isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              TITLE
            </Text>
            <TextInput
              style={[styles.input, inputStyle]}
              value={title}
              onChangeText={setTitle}
              placeholder="Announcement title"
              placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.inputLabel,
                { color: isDark ? "#94A3B8" : "#64748B", marginTop: 14 },
              ]}
            >
              CONTENT
            </Text>
            <TextInput
              style={[styles.textarea, inputStyle]}
              value={content}
              onChangeText={setContent}
              placeholder="Write your announcement..."
              placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
              multiline
              numberOfLines={4}
            />
          </View>
          <View
            style={[
              styles.modalFooter,
              {
                borderTopColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.btnOutline,
                { borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0" },
              ]}
              onPress={onClose}
            >
              <Text
                style={[
                  styles.btnOutlineText,
                  { color: isDark ? "#94A3B8" : "#64748B" },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                { backgroundColor: tint, opacity: isSubmitting ? 0.6 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Publish</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminDashboard() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const muted = isDark ? "#94A3B8" : "#64748B";
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );

  const { toast, showError, showSuccess, hideToast } = useToast();

  const url = config.backendUrl;

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      if (!communityId) {
        showError("Community information not found. Please login again.");
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
      showError("Failed to load admin data");
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
    setActionLoading((prev) => ({ ...prev, [`${userId}_${action}`]: true }));
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

      showSuccess(
        `Resident ${action === "approve" ? "approved" : "rejected"} successfully.`,
      );
      fetchAdminData();
    } catch (error) {
      console.error(`Error ${action}ing resident:`, error);
      showError(`Failed to ${action} resident. Please try again.`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`${userId}_${action}`]: false }));
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

      showSuccess("Announcement created successfully!");
      fetchAdminData();
    } catch (error) {
      console.error("Error creating announcement:", error);
      showError("Failed to create announcement. Please try again.");
      throw error;
    }
  };

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
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

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
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
            <View style={[styles.adminBadge, { backgroundColor: tint }]}>
              <Feather
                name="shield"
                size={18}
                color={isDark ? "#11181C" : "#ffffff"}
              />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                Admin Dashboard
              </Text>
              <Text style={[styles.headerSub, { color: muted }]}>{today}</Text>
            </View>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={styles.statsGrid}>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
        </ScrollView>
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
          <View style={[styles.adminBadge, { backgroundColor: tint }]}>
            <Feather
              name="shield"
              size={18}
              color={isDark ? "#11181C" : "#ffffff"}
            />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              Admin Dashboard
            </Text>
            <Text style={[styles.headerSub, { color: muted }]}>{today}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowLogoutConfirm(true)}
          style={[styles.logoutBtn, { borderColor: borderCol }]}
        >
          <Feather name="log-out" size={16} color={muted} />
        </TouchableOpacity>
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
          {/* KPI Stats */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="dollar-sign"
              title="Outstanding Dues"
              value={`₹${kpis.totalDue.toLocaleString()}`}
              hint="Pending + overdue"
              accentColor="#6366F1"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="tool"
              title="Open Issues"
              value={kpis.openMaint}
              hint="Need attention"
              accentColor="#F59E0B"
              theme={theme}
              textColor={textColor}
              muted={muted}
              onPress={() => router.push("/admin/maintenance")}
            />
            <StatCard
              icon="calendar"
              title="Cancelled"
              value={kpis.cancelledBookings}
              hint="Bookings"
              accentColor="#06B6D4"
              theme={theme}
              textColor={textColor}
              muted={muted}
              onPress={() => router.push("/admin/bookings")}
            />
            <StatCard
              icon="user-plus"
              title="Pending"
              value={pendingRequests.length}
              hint="Resident requests"
              accentColor="#8B5CF6"
              theme={theme}
              textColor={textColor}
              muted={muted}
              onPress={() => router.push("/admin/residents")}
            />
          </View>

          {/* Quick Actions */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <SectionHeader
              icon="grid"
              title="Quick Actions"
              tint={tint}
              textColor={textColor}
            />
            <View style={styles.actionsGrid}>
              <ActionTile
                icon="home"
                label="Community"
                desc="Settings & config"
                color="#6366F1"
                onPress={() => router.push("/admin/communityConfig")}
                theme={theme}
              />
              <ActionTile
                icon="grid"
                label="Blocks & Units"
                desc="Structure"
                color="#06B6D4"
                onPress={() => router.push("/admin/blocksandunits")}
                theme={theme}
              />
              <ActionTile
                icon="shield"
                label="Staff"
                desc="Gatekeepers"
                color="#8B5CF6"
                onPress={() => router.push("/admin/staffmanagement")}
                theme={theme}
              />
              <ActionTile
                icon="users"
                label="Visitors"
                desc="Visitor log"
                color="#F59E0B"
                onPress={() => router.push("/admin/visitorlog")}
                theme={theme}
              />
              <ActionTile
                icon="clipboard"
                label="Notice Board"
                desc="Post notices"
                color="#F97316"
                onPress={() => router.push("/notice-board")}
                theme={theme}
              />
              <ActionTile
                icon="bar-chart-2"
                label="Surveys"
                desc="Create & review"
                color="#10B981"
                onPress={() => router.push("/surveys")}
                theme={theme}
              />
              <ActionTile
                icon="check-square"
                label="Polls"
                desc="Election polls"
                color="#8B5CF6"
                onPress={() => router.push("/election-polls")}
                theme={theme}
              />
              <ActionTile
                icon="book"
                label="Directory"
                desc="Resident list"
                color="#3B82F6"
                onPress={() => router.push("/directory")}
                theme={theme}
              />
            </View>
          </View>

          {/* Pending Resident Requests */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <SectionHeader
              icon="user-plus"
              title="Resident Requests"
              onSeeAll={() => router.push("/admin/residents")}
              tint={tint}
              textColor={textColor}
            />
            {pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather
                  name="check-circle"
                  size={28}
                  color={muted}
                  style={{ opacity: 0.4 }}
                />
                <Text style={[styles.emptyText, { color: muted }]}>
                  No pending requests
                </Text>
              </View>
            ) : (
              pendingRequests.slice(0, 5).map((request, idx) => {
                const initials = request.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <View
                    key={request.id}
                    style={[
                      styles.listRow,
                      {
                        borderTopColor: borderCol,
                        borderTopWidth: idx === 0 ? 0 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: isDark ? "#252525" : "#EEF2FF" },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: "#6366F1" }]}>
                        {initials}
                      </Text>
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={[styles.listPrimary, { color: textColor }]}>
                        {request.name}
                      </Text>
                      <Text style={[styles.listSecondary, { color: muted }]}>
                        {request.email}
                      </Text>
                    </View>
                    <View style={styles.actionBtns}>
                      <TouchableOpacity
                        style={[
                          styles.iconBtn,
                          {
                            backgroundColor: "#D1FAE520",
                            borderColor: "#6EE7B7",
                          },
                          actionLoading[`${request.id}_approve`] && {
                            opacity: 0.5,
                          },
                        ]}
                        onPress={() =>
                          handleResidentAction(request.id, "approve")
                        }
                        disabled={
                          !!actionLoading[`${request.id}_approve`] ||
                          !!actionLoading[`${request.id}_reject`]
                        }
                      >
                        {actionLoading[`${request.id}_approve`] ? (
                          <ActivityIndicator size="small" color="#10B981" />
                        ) : (
                          <Feather name="check" size={14} color="#10B981" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.iconBtn,
                          {
                            backgroundColor: "#FEE2E220",
                            borderColor: "#FCA5A5",
                          },
                          actionLoading[`${request.id}_reject`] && {
                            opacity: 0.5,
                          },
                        ]}
                        onPress={() =>
                          handleResidentAction(request.id, "reject")
                        }
                        disabled={
                          !!actionLoading[`${request.id}_approve`] ||
                          !!actionLoading[`${request.id}_reject`]
                        }
                      >
                        {actionLoading[`${request.id}_reject`] ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Feather name="x" size={14} color="#EF4444" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Announcements */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <SectionHeader
              icon="bell"
              title="Latest Announcements"
              onSeeAll={() => router.push("/admin/announcements")}
              tint={tint}
              textColor={textColor}
            />
            <TouchableOpacity
              style={[
                styles.createBtn,
                {
                  backgroundColor: isDark ? "#252525" : "#F8FAFC",
                  borderColor: borderCol,
                },
              ]}
              onPress={() => setShowAnnouncementModal(true)}
            >
              <Feather name="plus" size={14} color={tint} />
              <Text style={[styles.createBtnText, { color: tint }]}>
                New Announcement
              </Text>
            </TouchableOpacity>
            {announcements.length === 0 ? (
              <View style={[styles.emptyState, { marginTop: 8 }]}>
                <Feather
                  name="message-square"
                  size={28}
                  color={muted}
                  style={{ opacity: 0.4 }}
                />
                <Text style={[styles.emptyText, { color: muted }]}>
                  No announcements yet
                </Text>
              </View>
            ) : (
              announcements.slice(0, 3).map((ann, idx) => (
                <View
                  key={ann.id}
                  style={[
                    styles.annRow,
                    {
                      borderTopColor: borderCol,
                      borderTopWidth: 1,
                      marginTop: idx === 0 ? 12 : 0,
                    },
                  ]}
                >
                  <View style={[styles.annDot, { backgroundColor: tint }]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.listPrimary, { color: textColor }]}>
                      {ann.title}
                    </Text>
                    <Text
                      style={[styles.listSecondary, { color: muted }]}
                      numberOfLines={2}
                    >
                      {ann.content}
                    </Text>
                    <Text style={[styles.listCaption, { color: muted }]}>
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Open Maintenance */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <SectionHeader
              icon="tool"
              title="Open Maintenance"
              onSeeAll={() => router.push("/admin/maintenance")}
              tint={tint}
              textColor={textColor}
            />
            {(() => {
              const open = maintenance.filter(
                (m) => m.status !== "RESOLVED" && m.status !== "CLOSED",
              );
              if (open.length === 0)
                return (
                  <View style={styles.emptyState}>
                    <Feather
                      name="check-circle"
                      size={28}
                      color={muted}
                      style={{ opacity: 0.4 }}
                    />
                    <Text style={[styles.emptyText, { color: muted }]}>
                      All requests resolved
                    </Text>
                  </View>
                );
              return open.slice(0, 5).map((item, idx) => {
                const pill = getStatusPill(item.status);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.listRow,
                      {
                        borderTopColor: borderCol,
                        borderTopWidth: idx === 0 ? 0 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: "#FEF3C7" },
                      ]}
                    >
                      <Feather name="tool" size={14} color="#D97706" />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={[styles.listPrimary, { color: textColor }]}>
                        {item.title || "Maintenance Request"}
                      </Text>
                      <Text style={[styles.listSecondary, { color: muted }]}>
                        {item.category || "General"} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.pillText, { color: pill.text }]}>
                        {item.status?.replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                );
              });
            })()}
          </View>

          {/* Recent Bookings */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <SectionHeader
              icon="calendar"
              title="Recent Bookings"
              onSeeAll={() => router.push("/admin/bookings")}
              tint={tint}
              textColor={textColor}
            />
            {bookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather
                  name="calendar"
                  size={28}
                  color={muted}
                  style={{ opacity: 0.4 }}
                />
                <Text style={[styles.emptyText, { color: muted }]}>
                  No bookings yet
                </Text>
              </View>
            ) : (
              bookings.slice(0, 5).map((booking, idx) => {
                const pill = getStatusPill(booking.status);
                return (
                  <View
                    key={booking.id}
                    style={[
                      styles.listRow,
                      {
                        borderTopColor: borderCol,
                        borderTopWidth: idx === 0 ? 0 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: "#DBEAFE" },
                      ]}
                    >
                      <Feather name="calendar" size={14} color="#2563EB" />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={[styles.listPrimary, { color: textColor }]}>
                        {booking.facility?.name || "Amenity"}
                      </Text>
                      <Text style={[styles.listSecondary, { color: muted }]}>
                        {booking.user?.name} ·{" "}
                        {new Date(booking.startsAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.pillText, { color: pill.text }]}>
                        {booking.status}
                      </Text>
                    </View>
                  </View>
                );
              })
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
      <ConfirmModal
        visible={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of the admin dashboard?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        icon="log-out"
        loading={loggingOut}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
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
  // Header
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  adminBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Scroll + content
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statTitle: { fontSize: 12, fontWeight: "500" },
  statHint: { fontSize: 11 },
  // Card
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 4 },
  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "600" },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: "500" },
  // Actions grid
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionTile: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  actionTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionTileLabel: { fontSize: 14, fontWeight: "600" },
  actionTileDesc: { fontSize: 11 },
  // Create announcement button
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  createBtnText: { fontSize: 13, fontWeight: "600" },
  // List rows
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "700" },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  listInfo: { flex: 1, gap: 2 },
  listPrimary: { fontSize: 14, fontWeight: "600" },
  listSecondary: { fontSize: 12 },
  listCaption: { fontSize: 11 },
  // Action icon buttons
  actionBtns: { flexDirection: "row", gap: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Status pills
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  // Announcement row
  annRow: { flexDirection: "row", gap: 12, paddingVertical: 10 },
  annDot: { width: 4, borderRadius: 2, alignSelf: "stretch", marginTop: 3 },
  // Empty
  emptyState: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(100,116,139,0.3)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 96,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  btnOutline: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  btnOutlineText: { fontSize: 14, fontWeight: "600" },
  btnPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimaryText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
});