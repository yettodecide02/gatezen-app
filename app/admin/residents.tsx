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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";

// Resident Card Component
function ResidentCard({
  resident,
  onAction,
  showActions = false,
  theme,
  textColor,
  muted,
  tint,
}) {
  const getStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase();
    let backgroundColor, color, borderColor;

    switch (statusUpper) {
      case "APPROVED":
        backgroundColor = "#dcfce7";
        color = "#16a34a";
        borderColor = "#bbf7d0";
        break;
      case "PENDING":
        backgroundColor = "#fef3c7";
        color = "#d97706";
        borderColor = "#fde68a";
        break;
      case "REJECTED":
        backgroundColor = "#fee2e2";
        color = "#dc2626";
        borderColor = "#fecaca";
        break;
      default:
        backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
        color = theme === "dark" ? "#d1d5db" : "#6b7280";
        borderColor = theme === "dark" ? "#4b5563" : "#d1d5db";
    }

    return (
      <View style={[styles.badge, { backgroundColor, borderColor }]}>
        <Text style={[styles.badgeText, { color }]}>
          {statusUpper === "APPROVED"
            ? "Approved"
            : statusUpper === "PENDING"
              ? "Pending"
              : "Rejected"}
        </Text>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.residentCard,
        {
          backgroundColor: theme === "dark" ? "#1F1F1F" : "#ffffff",
          borderColor:
            theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      <View style={styles.residentCardContent}>
        <View style={styles.residentInfo}>
          <Text style={[styles.residentName, { color: textColor }]}>
            {resident.name}
          </Text>
          <View style={styles.residentDetail}>
            <Feather name="mail" size={12} color={muted} />
            <Text style={[styles.residentEmail, { color: muted }]}>
              {resident.email}
            </Text>
          </View>
          <View style={styles.residentDetail}>
            <Feather name="calendar" size={12} color={muted} />
            <Text style={[styles.residentDate, { color: muted }]}>
              Joined: {new Date(resident.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.residentActions}>
          {getStatusBadge(resident.status)}
          {showActions && resident.status === "PENDING" && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#22c55e" }]}
                onPress={() => onAction(resident.id, "approve")}
              >
                <Feather name="check" size={14} color="#ffffff" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
                onPress={() => onAction(resident.id, "reject")}
              >
                <Feather name="x" size={14} color="#ffffff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          {showActions && resident.status === "REJECTED" && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#22c55e" }]}
                onPress={() => onAction(resident.id, "approve")}
              >
                <Feather name="check" size={14} color="#ffffff" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
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

export default function AdminResidents() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const muted = iconColor;
  const insets = useSafeAreaInsets();

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const url = config.backendUrl;

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
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

      const res = await axios.get(url + "/admin/residents", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: communityId },
      });
      setResidents(res.data.residents || []);
    } catch (error) {
      console.error("Error fetching residents:", error);
      Alert.alert("Error", "Failed to load residents data.");
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

      Alert.alert(
        "Success",
        `Resident has been ${
          action === "approve" ? "approved" : "rejected"
        } successfully.`,
      );
      fetchResidents();
    } catch (error) {
      console.error(`Error ${action}ing resident:`, error);
      Alert.alert("Error", `Failed to ${action} resident. Please try again.`);
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
          styles.centerContent,
          { backgroundColor: bg },
        ]}
      >
        <Feather name="loader" size={32} color={tint} />
        <Text style={[styles.loadingText, { color: textColor }]}>
          Loading residents...
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
              <Text style={[styles.title, { color: textColor }]}>
                Residents
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Manage community residents
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
              icon="users"
              title="Total Residents"
              value={stats.total}
              color="#6366f1"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="clock"
              title="Pending Approval"
              value={stats.pending}
              color="#f59e0b"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="user-check"
              title="Approved"
              value={stats.approved}
              color="#10b981"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="user-x"
              title="Rejected"
              value={stats.rejected}
              color="#ef4444"
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

          {/* Residents List */}
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
                <Feather name="users" size={20} color={tint} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  {activeTab === "all" && "All Residents"}
                  {activeTab === "pending" && "Pending Approvals"}
                  {activeTab === "approved" && "Approved Residents"}
                  {activeTab === "rejected" && "Rejected Applications"}
                </Text>
              </View>
              <Text style={[styles.countText, { color: muted }]}>
                {filteredResidents.length} resident
                {filteredResidents.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {filteredResidents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="users" size={48} color={muted} />
                <Text style={[styles.emptyText, { color: muted }]}>
                  {activeTab === "all" && "No residents found."}
                  {activeTab === "pending" && "No pending approvals."}
                  {activeTab === "approved" && "No approved residents."}
                  {activeTab === "rejected" && "No rejected applications."}
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
  residentsList: {
    gap: 12,
  },
  residentCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  residentCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  residentInfo: {
    flex: 1,
  },
  residentName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  residentDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  residentEmail: {
    fontSize: 12,
  },
  residentDate: {
    fontSize: 12,
  },
  residentActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 6,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
});
