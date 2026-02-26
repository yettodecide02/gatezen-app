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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";

const STATUS_CONFIG = {
  SUBMITTED: {
    icon: "clock",
    color: "#f59e0b",
    bg: "#fef3c7",
    label: "Submitted",
  },
  IN_PROGRESS: {
    icon: "play",
    color: "#3b82f6",
    bg: "#dbeafe",
    label: "In Progress",
  },
  RESOLVED: {
    icon: "check-circle",
    color: "#10b981",
    bg: "#dcfce7",
    label: "Resolved",
  },
  CLOSED: {
    icon: "x-square",
    color: "#6b7280",
    bg: "#f3f4f6",
    label: "Close",
  },
};

// Maintenance Card Component
function MaintenanceCard({
  item,
  theme,
  textColor,
  muted,
  tint,
  onStatusUpdate,
  updateLoading,
  onAddComment,
}) {
  const [showComments, setShowComments] = React.useState(false);
  const [commentText, setCommentText] = React.useState("");
  const [commentLoading, setCommentLoading] = React.useState(false);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    await onAddComment(item.id, commentText.trim());
    setCommentText("");
    setCommentLoading(false);
  };
  const getStatusBadge = (status) => {
    let backgroundColor, color;

    switch (status?.toUpperCase()) {
      case "RESOLVED":
        backgroundColor = "#dcfce7";
        color = "#16a34a";
        break;
      case "IN_PROGRESS":
        backgroundColor = "#dbeafe";
        color = "#2563eb";
        break;
      case "SUBMITTED":
      case "PENDING":
        backgroundColor = "#fef3c7";
        color = "#d97706";
        break;
      default:
        backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
        color = theme === "dark" ? "#d1d5db" : "#6b7280";
    }

    return (
      <View style={[styles.badge, { backgroundColor }]}>
        <Text style={[styles.badgeText, { color }]}>
          {status?.replace("_", " ") || "Unknown"}
        </Text>
      </View>
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return muted;
    }
  };

  return (
    <View
      style={[
        styles.maintenanceCard,
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
            {item.title || "Maintenance Request"}
          </Text>
          {item.priority && (
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: getPriorityColor(item.priority) },
              ]}
            />
          )}
        </View>
        {getStatusBadge(item.status)}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardDetail}>
          <Feather name="tag" size={12} color={muted} />
          <Text style={[styles.detailText, { color: muted }]}>
            {item.category || "General"}
          </Text>
        </View>

        {item.description && (
          <Text
            style={[styles.description, { color: textColor }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.cardDetail}>
            <Feather name="user" size={12} color={muted} />
            <Text style={[styles.detailText, { color: muted }]}>
              {item.user?.name || "Unknown User"}
            </Text>
          </View>
          <View style={styles.cardDetail}>
            <Feather name="calendar" size={12} color={muted} />
            <Text style={[styles.detailText, { color: muted }]}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Status Update Actions */}
        <View style={styles.actionButtons}>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            if (status === item.status) return null;

            return (
              <TouchableOpacity
                key={status}
                onPress={() => onStatusUpdate(item.id, status)}
                disabled={updateLoading}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: updateLoading
                      ? theme === "dark"
                        ? "#374151"
                        : "#f3f4f6"
                      : config.bg,
                    opacity: updateLoading ? 0.5 : 1,
                  },
                ]}
              >
                <Feather name={config.icon} size={12} color={config.color} />
                <Text
                  style={[styles.actionButtonText, { color: config.color }]}
                >
                  {updateLoading ? "..." : config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Comments Toggle */}
        <TouchableOpacity
          style={[
            styles.commentsToggle,
            {
              borderTopColor:
                theme === "dark"
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
            },
          ]}
          onPress={() => setShowComments((v) => !v)}
        >
          <View style={styles.commentsToggleLeft}>
            <Feather name="message-circle" size={13} color={tint} />
            <Text style={[styles.commentsToggleText, { color: tint }]}>
              {item.comments?.length || 0} Comment
              {(item.comments?.length || 0) !== 1 ? "s" : ""}
            </Text>
          </View>
          <Feather
            name={showComments ? "chevron-up" : "chevron-down"}
            size={13}
            color={muted}
          />
        </TouchableOpacity>

        {/* Comments Section */}
        {showComments && (
          <View style={styles.commentsSection}>
            {!item.comments || item.comments.length === 0 ? (
              <Text style={[styles.noComments, { color: muted }]}>
                No comments yet.
              </Text>
            ) : (
              item.comments.map((c) => (
                <View
                  key={c.id}
                  style={[
                    styles.commentItem,
                    {
                      backgroundColor:
                        theme === "dark"
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                    },
                  ]}
                >
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAuthorRow}>
                      <Text
                        style={[styles.commentAuthor, { color: textColor }]}
                      >
                        {c.user?.name || "Unknown"}
                      </Text>
                      {c.user?.role === "ADMIN" && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>Admin</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.commentTime, { color: muted }]}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.commentText, { color: textColor }]}>
                    {c.text}
                  </Text>
                </View>
              ))
            )}

            {/* Add Comment Input */}
            <View
              style={[
                styles.addCommentRow,
                {
                  borderTopColor:
                    theme === "dark"
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <TextInput
                style={[
                  styles.commentInput,
                  {
                    backgroundColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.07)"
                        : "rgba(0,0,0,0.04)",
                    color: textColor,
                    borderColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.12)",
                  },
                ]}
                placeholder="Add a comment..."
                placeholderTextColor={muted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={commentLoading || !commentText.trim()}
                style={[
                  styles.commentSendBtn,
                  {
                    backgroundColor: tint,
                    opacity: commentLoading || !commentText.trim() ? 0.4 : 1,
                  },
                ]}
              >
                <Feather name="send" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
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

export default function AdminMaintenance() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const muted = iconColor;
  const insets = useSafeAreaInsets();

  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [updateLoading, setUpdateLoading] = useState({});
  const [commentLoadingMap, setCommentLoadingMap] = useState({});

  const url = config.backendUrl;

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const fetchMaintenance = async () => {
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

      const res = await axios.get(`${url}/admin/maintenance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId: communityId },
      });
      setMaintenance(res.data.maintenance || []);
    } catch (error) {
      console.error("Error fetching maintenance:", error);
      Alert.alert("Error", "Failed to load maintenance data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMaintenance();
  };

  const handleStatusUpdate = async (ticketId, newStatus) => {
    setUpdateLoading((prev) => ({ ...prev, [ticketId]: true }));

    try {
      const token = await getToken();

      await axios.post(
        `${url}/admin/maintenance/update`,
        {
          ticketId,
          status: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Update local state
      setMaintenance((prev) =>
        prev.map((item) =>
          item.id === ticketId ? { ...item, status: newStatus } : item,
        ),
      );

      Alert.alert(
        "Status Updated",
        `Maintenance request updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
      );
    } catch (error) {
      console.error("Error updating maintenance status:", error);
      Alert.alert(
        "Update Failed",
        error.response?.data?.error || "Failed to update maintenance request",
      );
    } finally {
      setUpdateLoading((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleAddComment = async (ticketId, text) => {
    try {
      const token = await getToken();
      const res = await axios.post(
        `${url}/admin/maintenance/${ticketId}/comments`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const newComment = res.data.comment;
      setMaintenance((prev) =>
        prev.map((item) =>
          item.id === ticketId
            ? { ...item, comments: [...(item.comments || []), newComment] }
            : item,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to add comment",
      );
    }
  };

  const getFilteredMaintenance = () => {
    switch (activeTab) {
      case "pending":
        return maintenance.filter(
          (m) => m.status === "PENDING" || m.status === "SUBMITTED",
        );
      case "in_progress":
        return maintenance.filter((m) => m.status === "IN_PROGRESS");
      case "resolved":
        return maintenance.filter((m) => m.status === "RESOLVED");
      case "closed":
        return maintenance.filter((m) => m.status === "CLOSED");
      default:
        return maintenance;
    }
  };

  const getStats = () => {
    const pending = maintenance.filter(
      (m) => m.status === "PENDING" || m.status === "SUBMITTED",
    ).length;
    const inProgress = maintenance.filter(
      (m) => m.status === "IN_PROGRESS",
    ).length;
    const resolved = maintenance.filter((m) => m.status === "RESOLVED").length;
    const closed = maintenance.filter((m) => m.status === "CLOSED").length;
    return { total: maintenance.length, pending, inProgress, resolved, closed };
  };

  const stats = getStats();
  const filteredMaintenance = getFilteredMaintenance();

  const tabs = [
    { key: "all", label: "All Requests", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "in_progress", label: "In Progress", count: stats.inProgress },
    { key: "resolved", label: "Resolved", count: stats.resolved },
    { key: "closed", label: "Closed", count: stats.closed },
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
          Loading maintenance requests...
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
                Maintenance
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Manage maintenance requests
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
              icon="tool"
              title="Total Requests"
              value={stats.total}
              color="#6366f1"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="clock"
              title="Pending"
              value={stats.pending}
              color="#f59e0b"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="play"
              title="In Progress"
              value={stats.inProgress}
              color="#3b82f6"
              theme={theme}
              textColor={textColor}
              muted={muted}
            />
            <StatCard
              icon="check-circle"
              title="Resolved"
              value={stats.resolved}
              color="#10b981"
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

          {/* Maintenance List */}
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
                <Feather name="tool" size={20} color={tint} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  {activeTab === "all" && "All Maintenance Requests"}
                  {activeTab === "pending" && "Pending Requests"}
                  {activeTab === "in_progress" && "In Progress Requests"}
                  {activeTab === "resolved" && "Resolved Requests"}
                </Text>
              </View>
              <Text style={[styles.countText, { color: muted }]}>
                {filteredMaintenance.length} request
                {filteredMaintenance.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {filteredMaintenance.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="tool" size={48} color={muted} />
                <Text style={[styles.emptyText, { color: muted }]}>
                  {activeTab === "all" && "No maintenance requests found."}
                  {activeTab === "pending" && "No pending requests."}
                  {activeTab === "in_progress" && "No requests in progress."}
                  {activeTab === "resolved" && "No resolved requests."}
                </Text>
              </View>
            ) : (
              <View style={styles.maintenanceList}>
                {filteredMaintenance.map((item) => (
                  <MaintenanceCard
                    key={item.id}
                    item={item}
                    theme={theme}
                    textColor={textColor}
                    muted={muted}
                    tint={tint}
                    onStatusUpdate={handleStatusUpdate}
                    updateLoading={updateLoading[item.id]}
                    onAddComment={handleAddComment}
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
  maintenanceList: {
    gap: 12,
  },
  maintenanceCard: {
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
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  commentsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  commentsToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commentsToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  commentsSection: {
    marginTop: 10,
    gap: 8,
  },
  noComments: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 8,
  },
  commentItem: {
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commentAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: "600",
  },
  adminBadge: {
    backgroundColor: "#6366f120",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6366f1",
  },
  commentTime: {
    fontSize: 10,
  },
  commentText: {
    fontSize: 12,
    lineHeight: 17,
  },
  addCommentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 80,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
