// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
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
import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { getCommunityId, getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";

// --- Category config ---
const CATEGORIES = {
  GENERAL:     { icon: "info",           color: "#3B82F6", bg: "#DBEAFE", darkBg: "#0A1E40", label: "General"     },
  MAINTENANCE: { icon: "tool",           color: "#F59E0B", bg: "#FEF3C7", darkBg: "#2D1A00", label: "Maintenance" },
  EVENT:       { icon: "calendar",       color: "#8B5CF6", bg: "#EDE9FE", darkBg: "#1E1040", label: "Event"       },
  EMERGENCY:   { icon: "alert-triangle", color: "#EF4444", bg: "#FEE2E2", darkBg: "#3B0000", label: "Emergency"   },
  RULE:        { icon: "book-open",      color: "#06B6D4", bg: "#CFFAFE", darkBg: "#002030", label: "Rules"       },
};
const FILTER_TABS = [
  { key: "ALL", label: "All", icon: "list" },
  ...Object.entries(CATEGORIES).map(([k, v]) => ({ key: k, label: v.label, icon: v.icon })),
];
function getCat(key) {
  return CATEGORIES[(key || "GENERAL").toUpperCase()] ?? CATEGORIES.GENERAL;
}
function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 7 ? `${days}d ago` : new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

// --- Notice Card ---
function NoticeCard({ notice, isAdmin, isDark, textColor, muted, borderCol, cardBg, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const cfg    = getCat(notice.category);
  const isLong = (notice.content || "").length > 150;

  return (
    <TouchableOpacity
      activeOpacity={isLong ? 0.85 : 1}
      onPress={() => isLong && setExpanded((v) => !v)}
      style={[styles.noticeCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: cfg.color }]}
    >
      <View style={styles.noticeTop}>
        <View style={[styles.noticeCatIcon, { backgroundColor: isDark ? cfg.darkBg : cfg.bg }]}>
          <Feather name={cfg.icon} size={13} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.noticeTitleRow}>
            <Text style={[styles.noticeTitle, { color: textColor }]} numberOfLines={2}>{notice.title}</Text>
            {notice.isPinned && (
              <View style={[styles.pinnedBadge, { backgroundColor: isDark ? cfg.darkBg : cfg.bg }]}>
                <Feather name="bookmark" size={8} color={cfg.color} />
                <Text style={[styles.pinnedText, { color: cfg.color }]}>PINNED</Text>
              </View>
            )}
          </View>
          <View style={styles.noticeMeta}>
            <View style={[styles.catPill, { backgroundColor: isDark ? cfg.darkBg : cfg.bg }]}>
              <Text style={[styles.catPillText, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
            </View>
            <Text style={[styles.metaText, { color: muted }]}>{timeAgo(notice.createdAt)}</Text>
            {notice.author ? <Text style={[styles.metaText, { color: muted }]}>· {notice.author}</Text> : null}
          </View>
        </View>
        {isAdmin && (
          <TouchableOpacity onPress={() => onDelete(notice.id)} style={[styles.delBtn, { borderColor: "#FEE2E2" }]}>
            <Feather name="trash-2" size={13} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.noticeContent, { color: muted }]} numberOfLines={expanded ? undefined : 3}>
        {notice.content}
      </Text>
      {isLong && (
        <Text style={[styles.readMore, { color: cfg.color }]}>
          {expanded ? "Show less" : "Read more"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// --- Post Notice Modal ---
function PostNoticeModal({ visible, onClose, onSubmit, theme, textColor, tint, muted, borderCol }) {
  const isDark      = theme === "dark";
  const inputBg     = isDark ? "#252525" : "#F8FAFC";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const sheetBg     = isDark ? "#141414" : "#FFFFFF";

  const [title,    setTitle]    = useState("");
  const [content,  setContent]  = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [pinned,   setPinned]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleClose = () => { setTitle(""); setContent(""); setCategory("GENERAL"); setPinned(false); setError(""); onClose(); };
  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) { setError("Title and content are required"); return; }
    setLoading(true);
    try {
      await onSubmit({ title: title.trim(), content: content.trim(), category, isPinned: pinned });
      handleClose();
    } catch (e) { setError(e?.response?.data?.message || "Failed to post notice"); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          <View style={styles.sheetHandle} />
          <View style={[styles.sheetHeader, { borderBottomColor: borderCol }]}>
            <View style={styles.sheetHeaderLeft}>
              <View style={[styles.sheetIconWrap, { backgroundColor: tint + "15" }]}>
                <Feather name="file-text" size={18} color={tint} />
              </View>
              <Text style={[styles.sheetTitle, { color: textColor }]}>Post Notice</Text>
            </View>
            <TouchableOpacity style={[styles.sheetCloseBtn, { borderColor: borderCol }]} onPress={handleClose}>
              <Feather name="x" size={18} color={textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {!!error && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: muted }]}>TITLE</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                value={title} onChangeText={setTitle}
                placeholder="Notice title" placeholderTextColor={muted} maxLength={200}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: muted }]}>CATEGORY</Text>
              <View style={styles.catGrid}>
                {Object.entries(CATEGORIES).map(([key, cfg]) => {
                  const active = category === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setCategory(key)}
                      style={[styles.catOption, {
                        backgroundColor: active ? (isDark ? cfg.darkBg : cfg.bg) : (isDark ? "#252525" : "#F8FAFC"),
                        borderColor:     active ? cfg.color : inputBorder,
                      }]}
                    >
                      <Feather name={cfg.icon} size={11} color={active ? cfg.color : muted} />
                      <Text style={[styles.catOptionText, { color: active ? cfg.color : muted }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: muted }]}>CONTENT</Text>
              <TextInput
                style={[styles.textarea, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                value={content} onChangeText={setContent}
                placeholder="Write notice content..." placeholderTextColor={muted}
                multiline numberOfLines={6} maxLength={2000}
              />
              <Text style={[styles.charCount, { color: muted }]}>{content.length}/2000</Text>
            </View>

            {/* Pin toggle */}
            <TouchableOpacity
              onPress={() => setPinned((p) => !p)}
              style={[styles.pinRow, {
                backgroundColor: isDark ? "#252525" : "#F8FAFC",
                borderColor:     inputBorder,
              }]}
            >
              <View style={[styles.pinIconWrap, { backgroundColor: pinned ? "#3B82F620" : (isDark ? "#1A1A1A" : "#EEF2FF") }]}>
                <Feather name="bookmark" size={14} color={pinned ? "#3B82F6" : muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pinLabel, { color: textColor }]}>Pin this notice</Text>
                <Text style={[styles.pinSub, { color: muted }]}>Pinned notices appear at the top</Text>
              </View>
              <View style={[styles.toggleTrack, { backgroundColor: pinned ? "#3B82F6" : (isDark ? "#3A3A3A" : "#D1D5DB") }]}>
                <View style={[styles.toggleThumb, { transform: [{ translateX: pinned ? 18 : 2 }] }]} />
              </View>
            </TouchableOpacity>
          </ScrollView>

          <View style={[styles.sheetFooter, { borderTopColor: borderCol }]}>
            <TouchableOpacity style={[styles.btnOutline, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0" }]} onPress={handleClose}>
              <Text style={[styles.btnOutlineText, { color: muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: tint, flex: 1.5, opacity: loading || !title.trim() || !content.trim() ? 0.5 : 1 }]}
              onPress={handleSubmit} disabled={loading || !title.trim() || !content.trim()}
            >
              <Text style={styles.btnPrimaryText}>{loading ? "Posting..." : "Post Notice"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- Main Component ---
export default function NoticeBoard() {
  const theme     = useColorScheme() ?? "light";
  const isDark    = theme === "dark";
  const bg        = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint      = useThemeColor({}, "tint");
  const muted     = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg    = isDark ? "#1A1A1A" : "#FFFFFF";
  const insets    = useSafeAreaInsets();

  const [notices,        setNotices]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [isAdmin,        setIsAdmin]        = useState(false);
  const [activeFilter,   setActiveFilter]   = useState("ALL");
  const [showPostModal,  setShowPostModal]  = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting,       setDeleting]       = useState(false);

  const { toast, showError, showSuccess, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => { fetchNotices(); }, []);

  const fetchNotices = async () => {
    try {
      const [token, communityId, user] = await Promise.all([getToken(), getCommunityId(), getUser()]);
      setIsAdmin(user?.role === "ADMIN");
      if (!communityId) { showError("Community not found."); return; }
      const res = await axios.get(`${url}//notice-board`, {
        headers: { Authorization: `Bearer ${token}` },
        params:  { communityId },
      });
      const raw  = res.data?.notices ?? res.data?.data ?? res.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      // Pinned notices always first
      setNotices([...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
    } catch (e) {
      showError("Failed to load notices.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchNotices(); };

  const handlePost = async (data) => {
    const [token, communityId] = await Promise.all([getToken(), getCommunityId()]);
    await axios.post(`${url}/notice-board`, { ...data, communityId }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    showSuccess("Notice posted successfully!");
    fetchNotices();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      await axios.delete(`${url}/notice-board/${deleteConfirmId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotices((prev) => prev.filter((n) => n.id !== deleteConfirmId));
      showSuccess("Notice deleted.");
    } catch (e) {
      showError("Failed to delete notice.");
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const visible = activeFilter === "ALL"
    ? notices
    : notices.filter((n) => (n.category || "GENERAL").toUpperCase() === activeFilter);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
        <Feather name="file-text" size={32} color={tint} style={{ opacity: 0.5, marginBottom: 12 }} />
        <Text style={{ fontSize: 14, color: muted }}>Loading notices...</Text>
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
            <Text style={[styles.headerTitle, { color: textColor }]}>Notice Board</Text>
            <Text style={[styles.headerSub, { color: muted }]}>
              {visible.length} notice{visible.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        {isAdmin && (
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: tint }]} onPress={() => setShowPostModal(true)}>
            <Feather name="plus" size={16} color="#ffffff" />
            <Text style={styles.headerBtnText}>Post</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter tabs */}
      <View style={[styles.filterWrap, { borderBottomColor: borderCol }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TABS.map((f) => {
            const active = activeFilter === f.key;
            const cfg    = f.key !== "ALL" ? getCat(f.key) : null;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[styles.filterTab, {
                  backgroundColor: active ? (cfg ? (isDark ? cfg.darkBg : cfg.bg) : tint + "20") : "transparent",
                  borderColor:     active ? (cfg ? cfg.color : tint) : borderCol,
                }]}
              >
                <Feather name={f.icon} size={11} color={active ? (cfg ? cfg.color : tint) : muted} />
                <Text style={[styles.filterTabText, { color: active ? (cfg ? cfg.color : tint) : muted }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tint} />}
      >
        <View style={styles.content}>
          {/* Summary card */}
          <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: tint + "15" }]}>
              <Feather name="file-text" size={20} color={tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryValue, { color: textColor }]}>{notices.length}</Text>
              <Text style={[styles.summaryLabel, { color: muted }]}>Total Notices</Text>
            </View>
            {isAdmin && (
              <TouchableOpacity style={[styles.newBtnInline, { backgroundColor: tint + "15" }]} onPress={() => setShowPostModal(true)}>
                <Feather name="plus" size={14} color={tint} />
                <Text style={[styles.newBtnInlineText, { color: tint }]}>New</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.sectionRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="list" size={16} color={tint} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {activeFilter === "ALL" ? "All Notices" : getCat(activeFilter).label + " Notices"}
              </Text>
            </View>
          </View>

          {visible.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Feather name="file-text" size={36} color={muted} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No notices yet</Text>
              <Text style={[styles.emptyDesc, { color: muted }]}>
                {activeFilter === "ALL" ? "No notices have been posted." : `No ${getCat(activeFilter).label.toLowerCase()} notices found.`}
              </Text>
              {isAdmin && activeFilter === "ALL" && (
                <TouchableOpacity style={[styles.emptyCreateBtn, { backgroundColor: tint }]} onPress={() => setShowPostModal(true)}>
                  <Feather name="plus" size={14} color="#ffffff" />
                  <Text style={styles.emptyCreateBtnText}>Post First Notice</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {visible.map((n) => (
                <NoticeCard
                  key={n.id}
                  notice={n}
                  isAdmin={isAdmin}
                  isDark={isDark}
                  textColor={textColor}
                  muted={muted}
                  borderCol={borderCol}
                  cardBg={cardBg}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <PostNoticeModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        onSubmit={handlePost}
        theme={theme} textColor={textColor} tint={tint} muted={muted} borderCol={borderCol}
      />

      <ConfirmModal
        visible={!!deleteConfirmId}
        title="Delete Notice"
        message="Are you sure you want to delete this notice? This cannot be undone."
        confirmLabel="Delete" confirmColor="#EF4444" icon="trash-2"
        loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteConfirmId(null)}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },
  headerBar:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerLeft:        { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:           { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle:       { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  headerSub:         { fontSize: 12, marginTop: 1 },
  headerBtn:         { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  headerBtnText:     { fontSize: 13, fontWeight: "600", color: "#ffffff" },
  filterWrap:        { borderBottomWidth: 1 },
  filterScroll:      { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterTabText:     { fontSize: 12, fontWeight: "600" },
  scroll:            { flex: 1 },
  content:           { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 14 },
  summaryCard:       { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  summaryIconWrap:   { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  summaryValue:      { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  summaryLabel:      { fontSize: 12, fontWeight: "500", marginTop: 1 },
  newBtnInline:      { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  newBtnInlineText:  { fontSize: 13, fontWeight: "600" },
  sectionRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle:      { fontSize: 15, fontWeight: "600" },
  emptyCard:         { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyTitle:        { fontSize: 16, fontWeight: "600", marginTop: 4 },
  emptyDesc:         { fontSize: 13, textAlign: "center" },
  emptyCreateBtn:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  emptyCreateBtnText:{ fontSize: 13, fontWeight: "600", color: "#ffffff" },
  // Notice card
  noticeCard:        { borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, padding: 14, gap: 8 },
  noticeTop:         { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noticeCatIcon:     { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  noticeTitleRow:    { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  noticeTitle:       { fontSize: 14, fontWeight: "600", flex: 1 },
  pinnedBadge:       { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pinnedText:        { fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
  noticeMeta:        { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" },
  catPill:           { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  catPillText:       { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  metaText:          { fontSize: 11 },
  noticeContent:     { fontSize: 13, lineHeight: 20 },
  readMore:          { fontSize: 12, fontWeight: "600" },
  delBtn:            { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  // Modal — exactly matching announcements.tsx
  modalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet:             { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  sheetHandle:       { width: 40, height: 4, backgroundColor: "rgba(150,150,150,0.3)", borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  sheetHeader:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  sheetHeaderLeft:   { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetIconWrap:     { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sheetTitle:        { fontSize: 17, fontWeight: "700" },
  sheetCloseBtn:     { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sheetBody:         { paddingHorizontal: 20, paddingTop: 16 },
  sheetFooter:       { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, marginTop: 8 },
  errorBanner:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginBottom: 14 },
  errorBannerText:   { fontSize: 13, color: "#991B1B", flex: 1 },
  inputGroup:        { marginBottom: 16 },
  inputLabel:        { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 7, textTransform: "uppercase" },
  input:             { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  textarea:          { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, textAlignVertical: "top", minHeight: 110 },
  charCount:         { fontSize: 11, textAlign: "right", marginTop: 5 },
  catGrid:           { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catOption:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catOptionText:     { fontSize: 12, fontWeight: "600" },
  pinRow:            { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  pinIconWrap:       { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  pinLabel:          { fontSize: 14, fontWeight: "600" },
  pinSub:            { fontSize: 11, marginTop: 2 },
  toggleTrack:       { width: 40, height: 22, borderRadius: 11, justifyContent: "center" },
  toggleThumb:       { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },
  btnPrimary:        { paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  btnPrimaryText:    { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  btnOutline:        { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  btnOutlineText:    { fontSize: 14, fontWeight: "600" },
});