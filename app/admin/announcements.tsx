// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
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
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/hooks/useToast";

// --- Announcement Card ---
function AnnouncementCard({ announcement, theme, textColor, muted, onDelete, tint, borderCol }) {
  const isDark = theme === "dark";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  return (
    <View style={[styles.annCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={styles.annCardHeader}>
        <View style={[styles.annIconWrap, { backgroundColor: tint + "15" }]}>
          <Feather name="bell" size={15} color={tint} />
        </View>
        <View style={styles.annHeaderInfo}>
          <Text style={[styles.annTitle, { color: textColor }]} numberOfLines={1}>{announcement.title}</Text>
          <View style={styles.annMetaRow}>
            <Feather name="calendar" size={11} color={muted} />
            <Text style={[styles.annDate, { color: muted }]}>{formatDate(announcement.createdAt)}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.delBtn, { borderColor: "#FEE2E2" }]} onPress={() => onDelete(announcement.id)}>
          <Feather name="trash-2" size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <Text style={[styles.annContent, { color: muted }]} numberOfLines={3}>{announcement.content}</Text>
    </View>
  );
}

// --- Create Announcement Modal ---
function CreateAnnouncementModal({ visible, onClose, onSubmit, theme, textColor, tint, muted, borderCol }) {
  const isDark = theme === "dark";
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) { setError("Title and content are required"); return; }
    setLoading(true);
    try {
      await onSubmit({ title: title.trim(), content: content.trim() });
      setTitle(""); setContent(""); setError(""); onClose();
    } catch (e) { setError("Failed to create announcement"); }
    finally { setLoading(false); }
  };
  const handleClose = () => { setTitle(""); setContent(""); setError(""); onClose(); };
  const inputBg = isDark ? "#252525" : "#F8FAFC";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const sheetBg = isDark ? "#141414" : "#FFFFFF";

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          <View style={styles.sheetHandle} />
          <View style={[styles.sheetHeader, { borderBottomColor: borderCol }]}>
            <View style={styles.sheetHeaderLeft}>
              <View style={[styles.sheetIconWrap, { backgroundColor: tint + "15" }]}>
                <Feather name="bell" size={18} color={tint} />
              </View>
              <Text style={[styles.sheetTitle, { color: textColor }]}>New Announcement</Text>
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
                placeholder="Announcement title" placeholderTextColor={muted} maxLength={200}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: muted }]}>CONTENT</Text>
              <TextInput
                style={[styles.textarea, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                value={content} onChangeText={setContent}
                placeholder="Write your announcement..." placeholderTextColor={muted}
                multiline numberOfLines={6} maxLength={1000}
              />
              <Text style={[styles.charCount, { color: muted }]}>{content.length}/1000</Text>
            </View>
          </ScrollView>
          <View style={[styles.sheetFooter, { borderTopColor: borderCol }]}>
            <TouchableOpacity style={[styles.btnOutline, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0" }]} onPress={handleClose}>
              <Text style={[styles.btnOutlineText, { color: muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: tint, flex: 1.5, opacity: loading || !title.trim() || !content.trim() ? 0.5 : 1 }]}
              onPress={handleSubmit} disabled={loading || !title.trim() || !content.trim()}
            >
              <Text style={styles.btnPrimaryText}>{loading ? "Creating..." : "Create Announcement"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- Main Component ---
export default function AdminAnnouncements() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const insets = useSafeAreaInsets();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { toast, showError, showSuccess, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      if (!communityId) { showError("Community information not found."); return; }
      const res = await axios.get(`${url}/admin/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId },
      });
      setAnnouncements(res.data.announcements || []);
    } catch (e) { showError("Failed to load announcements."); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleRefresh = () => { setRefreshing(true); fetchAnnouncements(); };

  const handleCreate = async ({ title, content }) => {
    const token = await getToken();
    const communityId = await getCommunityId();
    if (!communityId) throw new Error("No community");
    const res = await axios.post(`${url}/admin/create-announcement`,
      { title, content, communityId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setAnnouncements((prev) => [res.data.announcement, ...prev]);
    showSuccess("Announcement created!");
  };

  const handleDelete = (id) => setDeleteConfirmId(id);

  const confirmDelete = async () => {
    const id = deleteConfirmId;
    setDeleting(true);
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      await axios.delete(`${url}/admin/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId },
      });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showSuccess("Announcement deleted.");
    } catch (e) { showError("Failed to delete announcement."); }
    finally { setDeleting(false); setDeleteConfirmId(null); }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
        <Feather name="bell" size={32} color={tint} style={{ opacity: 0.5, marginBottom: 12 }} />
        <Text style={{ fontSize: 14, color: muted }}>Loading announcements...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 20), borderBottomColor: borderCol, backgroundColor: bg }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: borderCol }]}>
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>Announcements</Text>
            <Text style={[styles.headerSub, { color: muted }]}>{announcements.length} announcement{announcements.length !== 1 ? "s" : ""}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: tint }]} onPress={() => setShowCreateModal(true)}>
          <Feather name="plus" size={16} color="#ffffff" />
          <Text style={styles.headerBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tint} />}>
        <View style={styles.content}>
          <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: tint + "15" }]}>
              <Feather name="bell" size={20} color={tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryValue, { color: textColor }]}>{announcements.length}</Text>
              <Text style={[styles.summaryLabel, { color: muted }]}>Total Announcements</Text>
            </View>
            <TouchableOpacity style={[styles.newBtnInline, { backgroundColor: tint + "15" }]} onPress={() => setShowCreateModal(true)}>
              <Feather name="plus" size={14} color={tint} />
              <Text style={[styles.newBtnInlineText, { color: tint }]}>Create</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="list" size={16} color={tint} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>All Announcements</Text>
            </View>
          </View>

          {announcements.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Feather name="bell-off" size={36} color={muted} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No announcements yet</Text>
              <Text style={[styles.emptyDesc, { color: muted }]}>Create your first announcement to notify residents.</Text>
              <TouchableOpacity style={[styles.emptyCreateBtn, { backgroundColor: tint }]} onPress={() => setShowCreateModal(true)}>
                <Feather name="plus" size={14} color="#ffffff" />
                <Text style={styles.emptyCreateBtnText}>Create Announcement</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {announcements.map((ann) => (
                <AnnouncementCard key={ann.id} announcement={ann} theme={theme} textColor={textColor} muted={muted} tint={tint} borderCol={borderCol} onDelete={handleDelete} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <CreateAnnouncementModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        theme={theme} textColor={textColor} tint={tint} muted={muted} borderCol={borderCol}
      />

      <ConfirmModal
        visible={!!deleteConfirmId}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This cannot be undone."
        confirmLabel="Delete" confirmColor="#EF4444" icon="trash-2"
        loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteConfirmId(null)}
      />

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
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  headerBtnText: { fontSize: 13, fontWeight: "600", color: "#ffffff" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 14 },
  summaryCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  summaryIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  summaryValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  summaryLabel: { fontSize: 12, fontWeight: "500", marginTop: 1 },
  newBtnInline: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  newBtnInlineText: { fontSize: 13, fontWeight: "600" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 15, fontWeight: "600" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  emptyDesc: { fontSize: 13, textAlign: "center" },
  emptyCreateBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  emptyCreateBtnText: { fontSize: 13, fontWeight: "600", color: "#ffffff" },
  annCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  annCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  annIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  annHeaderInfo: { flex: 1 },
  annTitle: { fontSize: 14, fontWeight: "600" },
  annMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  annDate: { fontSize: 11 },
  delBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  annContent: { fontSize: 13, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: "rgba(150,150,150,0.3)", borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  sheetHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  sheetCloseBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16 },
  sheetFooter: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, marginTop: 8 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginBottom: 14 },
  errorBannerText: { fontSize: 13, color: "#991B1B", flex: 1 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 7, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  textarea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, textAlignVertical: "top", minHeight: 110 },
  charCount: { fontSize: 11, textAlign: "right", marginTop: 5 },
  btnPrimary: { paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  btnPrimaryText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  btnOutline: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  btnOutlineText: { fontSize: 14, fontWeight: "600" },
});
