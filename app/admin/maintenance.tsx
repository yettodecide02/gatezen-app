// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
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

// --- Status config ---
const STATUS_CONFIG = {
  SUBMITTED: { icon: "clock", color: "#F59E0B", bg: "#FEF3C7", label: "Submitted" },
  IN_PROGRESS: { icon: "play-circle", color: "#3B82F6", bg: "#DBEAFE", label: "In Progress" },
  RESOLVED: { icon: "check-circle", color: "#10B981", bg: "#D1FAE5", label: "Resolved" },
  CLOSED: { icon: "x-circle", color: "#6B7280", bg: "#F3F4F6", label: "Close" },
};

function getStatusPill(status) {
  const s = status?.toUpperCase();
  if (s === "RESOLVED") return { bg: "#D1FAE5", text: "#065F46" };
  if (s === "IN_PROGRESS") return { bg: "#DBEAFE", text: "#1E40AF" };
  if (s === "SUBMITTED" || s === "PENDING") return { bg: "#FEF3C7", text: "#92400E" };
  if (s === "CLOSED") return { bg: "#F3F4F6", text: "#374151" };
  return { bg: "#F3F4F6", text: "#374151" };
}

function getPriorityColor(priority) {
  switch (priority?.toLowerCase()) {
    case "high": return "#EF4444";
    case "medium": return "#F59E0B";
    case "low": return "#10B981";
    default: return "#6B7280";
  }
}

// --- Maintenance Card ---
function MaintenanceCard({ item, theme, textColor, muted, tint, onStatusUpdate, updateLoading, onAddComment, borderCol }) {
  const isDark = theme === "dark";
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const pill = getStatusPill(item.status);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    await onAddComment(item.id, commentText.trim());
    setCommentText("");
    setCommentLoading(false);
  };

  return (
    <View style={[styles.mCard, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderColor: borderCol }]}>
      {/* Card header row */}
      <View style={styles.mCardTop}>
        <View style={[styles.mIconCircle, { backgroundColor: "#FEF3C7" }]}>
          <Feather name="tool" size={15} color="#D97706" />
        </View>
        <View style={styles.mCardInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.mCardTitle, { color: textColor }]} numberOfLines={1}>{item.title || "Maintenance Request"}</Text>
            {item.priority && <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Feather name="tag" size={11} color={muted} />
            <Text style={[styles.mMeta, { color: muted }]}>{item.category || "General"}</Text>
          </View>
        </View>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.pillText, { color: pill.text }]}>{item.status?.replace("_", " ")}</Text>
        </View>
      </View>

      {/* Description */}
      {item.description && (
        <Text style={[styles.mDesc, { color: muted }]} numberOfLines={2}>{item.description}</Text>
      )}

      {/* Footer meta */}
      <View style={[styles.mCardMeta, { borderTopColor: borderCol }]}>
        <View style={styles.mMetaItem}>
          <Feather name="user" size={11} color={muted} />
          <Text style={[styles.mMeta, { color: muted }]}>{item.user?.name || "Unknown"}</Text>
        </View>
        <View style={styles.mMetaItem}>
          <Feather name="calendar" size={11} color={muted} />
          <Text style={[styles.mMeta, { color: muted }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>

      {/* Status Action Buttons */}
      <View style={[styles.mActions, { borderTopColor: borderCol }]}>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          if (status === item.status) return null;
          return (
            <TouchableOpacity
              key={status}
              style={[styles.mActionBtn, { backgroundColor: cfg.bg, opacity: updateLoading ? 0.5 : 1 }]}
              onPress={() => onStatusUpdate(item.id, status)}
              disabled={!!updateLoading}
            >
              <Feather name={cfg.icon} size={12} color={cfg.color} />
              <Text style={[styles.mActionBtnText, { color: cfg.color }]}>{updateLoading ? "..." : cfg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Comments Toggle */}
      <TouchableOpacity style={[styles.commentToggle, { borderTopColor: borderCol }]} onPress={() => setShowComments((v) => !v)}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="message-circle" size={13} color={tint} />
          <Text style={[styles.commentToggleText, { color: tint }]}>{item.comments?.length || 0} Comment{(item.comments?.length || 0) !== 1 ? "s" : ""}</Text>
        </View>
        <Feather name={showComments ? "chevron-up" : "chevron-down"} size={13} color={muted} />
      </TouchableOpacity>

      {showComments && (
        <View style={[styles.commentsSection, { borderTopColor: borderCol }]}>
          {(!item.comments || item.comments.length === 0) ? (
            <Text style={[styles.noComments, { color: muted }]}>No comments yet.</Text>
          ) : (
            item.comments.map((c) => (
              <View key={c.id} style={[styles.commentItem, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
                <View style={styles.commentHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.commentAuthor, { color: textColor }]}>{c.user?.name || "Unknown"}</Text>
                    {c.user?.role === "ADMIN" && (
                      <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>
                    )}
                  </View>
                  <Text style={[styles.commentTime, { color: muted }]}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.commentText, { color: textColor }]}>{c.text}</Text>
              </View>
            ))
          )}
          <View style={[styles.addCommentRow, { borderTopColor: borderCol }]}>
            <TextInput
              style={[styles.commentInput, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: textColor, borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" }]}
              placeholder="Add a comment..." placeholderTextColor={muted}
              value={commentText} onChangeText={setCommentText} multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: tint, opacity: commentLoading || !commentText.trim() ? 0.4 : 1 }]}
              onPress={handleSubmitComment} disabled={commentLoading || !commentText.trim()}
            >
              <Feather name="send" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// --- Stat Card ---
function StatCard({ icon, title, value, color = "#6366F1", theme, textColor, muted }) {
  const isDark = theme === "dark";
  return (
    <View style={[styles.statCard, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "1A" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: muted }]}>{title}</Text>
    </View>
  );
}

// --- Main Component ---
export default function AdminMaintenance() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const insets = useSafeAreaInsets();

  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [updateLoading, setUpdateLoading] = useState({});

  const { toast, showError, showSuccess, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => { fetchMaintenance(); }, []);

  const fetchMaintenance = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      if (!communityId) { showError("Community information not found."); return; }
      const res = await axios.get(`${url}/admin/maintenance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId },
      });
      setMaintenance(res.data.maintenance || []);
    } catch (e) { showError("Failed to load maintenance data."); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleRefresh = () => { setRefreshing(true); fetchMaintenance(); };

  const handleStatusUpdate = async (ticketId, newStatus) => {
    setUpdateLoading((p) => ({ ...p, [ticketId]: true }));
    try {
      const token = await getToken();
      await axios.post(`${url}/admin/maintenance/update`,
        { ticketId, status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMaintenance((p) => p.map((i) => i.id === ticketId ? { ...i, status: newStatus } : i));
      showSuccess(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    } catch (e) { showError(e.response?.data?.error || "Failed to update status"); }
    finally { setUpdateLoading((p) => ({ ...p, [ticketId]: false })); }
  };

  const handleAddComment = async (ticketId, text) => {
    try {
      const token = await getToken();
      const res = await axios.post(`${url}/admin/maintenance/${ticketId}/comments`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newComment = res.data.comment;
      setMaintenance((p) => p.map((i) => i.id === ticketId ? { ...i, comments: [...(i.comments || []), newComment] } : i));
    } catch (e) { showError(e.response?.data?.error || "Failed to add comment"); }
  };

  const getFiltered = () => {
    switch (activeTab) {
      case "pending": return maintenance.filter((m) => m.status === "PENDING" || m.status === "SUBMITTED");
      case "in_progress": return maintenance.filter((m) => m.status === "IN_PROGRESS");
      case "resolved": return maintenance.filter((m) => m.status === "RESOLVED");
      case "closed": return maintenance.filter((m) => m.status === "CLOSED");
      default: return maintenance;
    }
  };

  const pending = maintenance.filter((m) => m.status === "PENDING" || m.status === "SUBMITTED").length;
  const inProgress = maintenance.filter((m) => m.status === "IN_PROGRESS").length;
  const resolved = maintenance.filter((m) => m.status === "RESOLVED").length;
  const closed = maintenance.filter((m) => m.status === "CLOSED").length;
  const stats = { total: maintenance.length, pending, inProgress, resolved, closed };

  const tabs = [
    { key: "all", label: "All", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "in_progress", label: "In Progress", count: stats.inProgress },
    { key: "resolved", label: "Resolved", count: stats.resolved },
    { key: "closed", label: "Closed", count: stats.closed },
  ];

  const filteredMaintenance = getFiltered();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
        <Feather name="tool" size={32} color={tint} style={{ opacity: 0.5, marginBottom: 12 }} />
        <Text style={{ fontSize: 14, color: muted }}>Loading maintenance requests...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 20), borderBottomColor: borderCol, backgroundColor: bg }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: borderCol }]}>
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>Maintenance</Text>
            <Text style={[styles.headerSub, { color: muted }]}>Manage maintenance requests</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tint} />}>
        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsGrid}>
            <StatCard icon="tool" title="Total" value={stats.total} color="#6366F1" theme={theme} textColor={textColor} muted={muted} />
            <StatCard icon="clock" title="Pending" value={stats.pending} color="#F59E0B" theme={theme} textColor={textColor} muted={muted} />
            <StatCard icon="play-circle" title="In Progress" value={stats.inProgress} color="#3B82F6" theme={theme} textColor={textColor} muted={muted} />
            <StatCard icon="check-circle" title="Resolved" value={stats.resolved} color="#10B981" theme={theme} textColor={textColor} muted={muted} />
          </View>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tab, { backgroundColor: isActive ? tint : "transparent", borderColor: isActive ? tint : borderCol }]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Text style={[styles.tabText, { color: isActive ? "#ffffff" : muted }]}>{tab.label}</Text>
                    {tab.count > 0 && (
                      <View style={[styles.tabCount, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : tint + "20" }]}>
                        <Text style={[styles.tabCountText, { color: isActive ? "#ffffff" : tint }]}>{tab.count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* List container */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.listHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Feather name="tool" size={16} color={tint} />
                <Text style={[styles.listHeaderTitle, { color: textColor }]}>
                  {activeTab === "all" ? "All Requests" : activeTab === "pending" ? "Pending" : activeTab === "in_progress" ? "In Progress" : activeTab === "resolved" ? "Resolved" : "Closed"}
                </Text>
              </View>
              <Text style={[styles.listCount, { color: muted }]}>{filteredMaintenance.length}</Text>
            </View>

            {filteredMaintenance.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="tool" size={36} color={muted} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: muted }]}>No maintenance requests found</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {filteredMaintenance.map((item) => (
                  <MaintenanceCard
                    key={item.id} item={item} theme={theme} textColor={textColor}
                    muted={muted} tint={tint} borderCol={borderCol}
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

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "48%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  statIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  tab: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  tabText: { fontSize: 13, fontWeight: "600" },
  tabCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, alignItems: "center" },
  tabCountText: { fontSize: 10, fontWeight: "700" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  listHeaderTitle: { fontSize: 15, fontWeight: "600" },
  listCount: { fontSize: 12, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 13 },
  // Maintenance cards
  mCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  mCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  mIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  mCardInfo: { flex: 1 },
  mCardTitle: { fontSize: 14, fontWeight: "600", flex: 1 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  mMeta: { fontSize: 12 },
  mDesc: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  mCardMeta: { flexDirection: "row", gap: 16, paddingTop: 10, borderTopWidth: 1, marginBottom: 10 },
  mMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  mActions: { flexDirection: "row", flexWrap: "wrap", gap: 7, paddingTop: 10, borderTopWidth: 1 },
  mActionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10 },
  mActionBtnText: { fontSize: 12, fontWeight: "600" },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  commentToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, marginTop: 8 },
  commentToggleText: { fontSize: 12, fontWeight: "600" },
  commentsSection: { paddingTop: 10, borderTopWidth: 1, marginTop: 8, gap: 8 },
  noComments: { fontSize: 12, textAlign: "center", paddingVertical: 8 },
  commentItem: { borderRadius: 10, padding: 10, gap: 4 },
  commentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  commentAuthor: { fontSize: 12, fontWeight: "600" },
  adminBadge: { backgroundColor: "#6366F120", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adminBadgeText: { fontSize: 9, fontWeight: "700", color: "#6366F1" },
  commentTime: { fontSize: 10 },
  commentText: { fontSize: 12, lineHeight: 18 },
  addCommentRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 8, borderTopWidth: 1 },
  commentInput: { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, maxHeight: 80 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
