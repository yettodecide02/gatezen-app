// @ts-nocheck
import React, { useEffect, useState, useMemo } from "react";
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

// ─── Status pill helper ─────────────────────────────
function statusPill(status) {
  const s = status?.toUpperCase();
  if (s === "APPROVED")
    return { bg: "#D1FAE5", text: "#065F46", label: "Approved" };
  if (s === "PENDING")
    return { bg: "#FEF3C7", text: "#92400E", label: "Pending" };
  if (s === "REJECTED")
    return { bg: "#FEE2E2", text: "#991B1B", label: "Rejected" };
  return { bg: "#F3F4F6", text: "#374151", label: status || "Unknown" };
}

// ─── Resident Card ───────────────────────────────────
function ResidentCard({
  resident,
  onAction,
  showActions = false,
  theme,
  textColor,
  muted,
  tint,
}) {
  const isDark = theme === "dark";
  const pill = statusPill(resident.status);
  const initials = resident.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const canApprove =
    showActions &&
    (resident.status === "PENDING" || resident.status === "REJECTED");
  const canReject = showActions && resident.status === "PENDING";

  return (
    <View
      style={[
        styles.residentCard,
        {
          backgroundColor: isDark ? "#1A1A1A" : "#fff",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <View style={styles.residentRow}>
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
        <View style={styles.residentInfo}>
          <Text style={[styles.residentName, { color: textColor }]}>
            {resident.name}
          </Text>
          <Text style={[styles.residentMeta, { color: muted }]}>
            {resident.email}
          </Text>
          <Text style={[styles.residentMeta, { color: muted }]}>
            Joined {new Date(resident.createdAt).toLocaleDateString()}
          </Text>
          {resident.unit && (
            <Text style={[styles.residentMeta, { color: muted }]}>
              Unit: {resident.unit?.number}
            </Text>
          )}
        </View>
        <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.statusPillText, { color: pill.text }]}>
            {pill.label}
          </Text>
        </View>
      </View>
      {(canApprove || canReject) && (
        <View
          style={[
            styles.residentBtns,
            {
              borderTopColor: isDark
                ? "rgba(255,255,255,0.07)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          {canApprove && (
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => onAction(resident.id, "approve")}
            >
              <Feather name="check" size={13} color="#ffffff" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
          )}
          {canReject && (
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => onAction(resident.id, "reject")}
            >
              <Feather name="x" size={13} color="#ffffff" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Stat Card ───────────────────────────────────────
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
          backgroundColor: isDark ? "#1A1A1A" : "#ffffff",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: `${color}1A` }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: muted }]}>{title}</Text>
    </View>
  );
}

export default function AdminResidents() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const insets = useSafeAreaInsets();

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { toast, showError, showSuccess, hideToast } = useToast();

  const url = config.backendUrl;

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      if (!communityId) {
        showError("Community information not found. Please login again.");
        return;
      }

      const res = await axios.get(url + "/admin/residents", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: communityId },
      });
      setResidents(res.data.residents || []);
    } catch (error) {
      console.error("Error fetching residents:", error);
      showError("Failed to load residents data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchResidents();
  };

  const handleResidentAction = async (userId, action) => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      const endpoint =
        action === "approve"
          ? "/admin/approve-resident"
          : "/admin/reject-resident";

      await axios.post(
        url + endpoint,
        { userId, communityId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      showSuccess(
        `Resident ${
          action === "approve" ? "approved" : "rejected"
        } successfully.`,
      );
      fetchResidents();
    } catch (error) {
      console.error(`Error ${action}ing resident:`, error);
      showError(`Failed to ${action} resident. Please try again.`);
    }
  };

  const getFilteredResidents = () => {
    switch (activeTab) {
      case "pending":
        return residents.filter((r) => r.status === "PENDING");
      case "approved":
        return residents.filter((r) => r.status === "APPROVED");
      case "rejected":
        return residents.filter((r) => r.status === "REJECTED");
      default:
        return residents;
    }
  };

  const getStats = () => {
    const pending = residents.filter((r) => r.status === "PENDING").length;
    const approved = residents.filter((r) => r.status === "APPROVED").length;
    const rejected = residents.filter((r) => r.status === "REJECTED").length;
    return { total: residents.length, pending, approved, rejected };
  };

  const stats = getStats();
  const filteredResidents = getFilteredResidents();

  const tabs = [
    { key: "all", label: "All Residents", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "rejected", label: "Rejected", count: stats.rejected },
  ];

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
        <View style={[styles.loadingIcon, { backgroundColor: `${tint}15` }]}>
          <Feather name="users" size={28} color={tint} />
        </View>
        <Text style={[styles.loadingText, { color: muted }]}>
          Loading residents...
        </Text>
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
            <Text style={[styles.pageTitle, { color: textColor }]}>
              Residents
            </Text>
            <Text style={[styles.pageSub, { color: muted }]}>
              Manage community residents
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
              icon="users"
              title="Total"
              value={stats.total}
              color="#6366F1"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="clock"
              title="Pending"
              value={stats.pending}
              color="#F59E0B"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="user-check"
              title="Approved"
              value={stats.approved}
              color="#10B981"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="user-x"
              title="Rejected"
              value={stats.rejected}
              color="#EF4444"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
          >
            <View style={styles.tabsRow}>
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
                              : `${tint}20`,
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
              <View style={styles.listHeaderLeft}>
                <Feather name="users" size={16} color={tint} />
                <Text style={[styles.listHeaderTitle, { color: textColor }]}>
                  {activeTab === "all"
                    ? "All Residents"
                    : activeTab === "pending"
                      ? "Pending Approvals"
                      : activeTab === "approved"
                        ? "Approved"
                        : "Rejected"}
                </Text>
              </View>
              <Text style={[styles.listCount, { color: muted }]}>
                {filteredResidents.length} resident
                {filteredResidents.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {filteredResidents.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather
                  name="users"
                  size={36}
                  color={muted}
                  style={{ opacity: 0.3 }}
                />
                <Text style={[styles.emptyText, { color: muted }]}>
                  {activeTab === "all"
                    ? "No residents found"
                    : activeTab === "pending"
                      ? "No pending approvals"
                      : activeTab === "approved"
                        ? "No approved residents"
                        : "No rejected applications"}
                </Text>
              </View>
            ) : (
              <View style={styles.residentsList}>
                {filteredResidents.map((resident) => (
                  <ResidentCard
                    key={resident.id}
                    resident={resident}
                    onAction={handleResidentAction}
                    showActions={
                      activeTab === "pending" ||
                      activeTab === "all" ||
                      activeTab === "rejected"
                    }
                    theme={theme}
                    textColor={textColor}
                    muted={muted}
                    tint={tint}
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
  pageTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  pageSub: { fontSize: 12, marginTop: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  loadingText: { fontSize: 14 },
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
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statTitle: { fontSize: 12, fontWeight: "500" },
  // Tabs
  tabsScroll: { marginBottom: 4 },
  tabsRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
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
    minWidth: 20,
    alignItems: "center",
  },
  tabCountText: { fontSize: 10, fontWeight: "700" },
  // Card + list header
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  listHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  listHeaderTitle: { fontSize: 15, fontWeight: "600" },
  listCount: { fontSize: 12 },
  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 13 },
  // Resident cards
  residentsList: { gap: 10 },
  residentCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  residentRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "700" },
  residentInfo: { flex: 1, gap: 2 },
  residentName: { fontSize: 14, fontWeight: "600" },
  residentMeta: { fontSize: 12 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusPillText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  residentBtns: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#10B981",
    paddingVertical: 9,
    borderRadius: 10,
  },
  approveBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#EF4444",
    paddingVertical: 9,
    borderRadius: 10,
  },
  rejectBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
});
