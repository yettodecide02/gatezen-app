// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, RefreshControl,
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

export default function StaffManagement() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const [gatekeepers, setGatekeepers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  const { toast, showError, showSuccess, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => { fetchGatekeepers(); }, []);

  const fetchGatekeepers = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      const res = await axios.get(`${url}/admin/gatekeepers`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId },
      });
      setGatekeepers(res.data || []);
    } catch {
      showError("Failed to fetch gatekeepers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmDelete = async () => {
    const id = deleteConfirmId;
    setDeleting(true);
    try {
      const token = await getToken();
      await axios.delete(`${url}/admin/gatekeepers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSuccess("Gatekeeper removed successfully");
      fetchGatekeepers();
    } catch (e) {
      showError(e.response?.data?.error || "Failed to remove gatekeeper");
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      showError("All fields are required");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      await axios.post(`${url}/admin/gatekeeper-signup`,
        { ...formData, communityId },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      setFormData({ name: "", email: "", password: "" });
      setShowModal(false);
      showSuccess("Gatekeeper created successfully");
      fetchGatekeepers();
    } catch (e) {
      showError(e.response?.data?.error || "Failed to create gatekeeper");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { label: "Total Staff", value: gatekeepers.length, icon: "shield", color: "#6366F1" },
    { label: "Active", value: gatekeepers.filter(g => g.status === "APPROVED" || g.status === "ACTIVE").length, icon: "check-circle", color: "#10B981" },
    { label: "Inactive", value: gatekeepers.filter(g => g.status !== "APPROVED" && g.status !== "ACTIVE").length, icon: "user-x", color: "#F59E0B" },
    { label: "On Duty", value: gatekeepers.filter(g => g.onDuty).length, icon: "clock", color: "#3B82F6" },
  ];

  const getStatusPill = (status) => {
    if (status === "APPROVED" || status === "ACTIVE")
      return { bg: "#10B98120", text: "#10B981", label: status };
    if (status === "PENDING") return { bg: "#F59E0B20", text: "#F59E0B", label: "PENDING" };
    return { bg: "#6B728020", text: "#6B7280", label: status || "INACTIVE" };
  };

  const getInitials = (name) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "ST";

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={tint} />
        <Text style={[styles.loadingText, { color: muted }]}>Loading staff...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Toast {...toast} onHide={hideToast} />
      <ConfirmModal
        visible={!!deleteConfirmId}
        title="Remove Gatekeeper"
        message="Are you sure you want to remove this gatekeeper?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
        loading={deleting}
        confirmText="Remove"
        confirmColor="#EF4444"
      />

      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 20), borderBottomColor: borderCol, backgroundColor: bg }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: borderCol }]}>
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: textColor }]}>Staff Management</Text>
            <Text style={[styles.screenSub, { color: muted }]}>{gatekeepers.length} gatekeepers</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: tint }]}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGatekeepers(); }} tintColor={tint} />}
      >
        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.statIconWrap, { backgroundColor: s.color + "1A" }]}>
                <Feather name={s.icon} size={16} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: textColor }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: muted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Staff List */}
        <Text style={[styles.sectionTitle, { color: textColor }]}>Gatekeepers</Text>
        {gatekeepers.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.emptyIcon, { backgroundColor: tint + "1A" }]}>
              <Feather name="shield" size={28} color={tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No gatekeepers yet</Text>
            <Text style={[styles.emptyMsg, { color: muted }]}>Add your first gatekeeper to get started</Text>
          </View>
        ) : (
          gatekeepers.map((g) => {
            const pill = getStatusPill(g.status);
            return (
              <View key={g.id} style={[styles.staffCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.staffRow}>
                  <View style={[styles.avatar, { backgroundColor: "#6366F11A" }]}>
                    <Text style={[styles.avatarText, { color: "#6366F1" }]}>{getInitials(g.name)}</Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={[styles.staffName, { color: textColor }]}>{g.name}</Text>
                    <Text style={[styles.staffEmail, { color: muted }]}>{g.email}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.pillText, { color: pill.text }]}>{pill.label}</Text>
                  </View>
                </View>
                <View style={[styles.staffDivider, { backgroundColor: borderCol }]} />
                <View style={styles.staffMeta}>
                  <View style={styles.metaItem}>
                    <Feather name="calendar" size={12} color={muted} />
                    <Text style={[styles.metaText, { color: muted }]}>
                      Joined {g.createdAt ? new Date(g.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDeleteConfirmId(g.id)} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={14} color="#EF4444" />
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF" }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Add Gatekeeper</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.modalClose, { borderColor: borderCol }]}>
                <Feather name="x" size={16} color={textColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {[
                { label: "Full Name", field: "name", placeholder: "Enter full name", icon: "user" },
                { label: "Email Address", field: "email", placeholder: "Enter email", icon: "mail" },
              ].map(({ label, field, placeholder, icon }) => (
                <View key={field} style={styles.fieldWrap}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>{label}</Text>
                  <View style={[styles.fieldRow, { borderColor: borderCol, backgroundColor: isDark ? "#111111" : "#F8FAFC" }]}>
                    <Feather name={icon} size={16} color={muted} />
                    <TextInput
                      style={[styles.fieldInput, { color: textColor }]}
                      placeholder={placeholder}
                      placeholderTextColor={muted}
                      value={formData[field]}
                      onChangeText={(v) => setFormData(p => ({ ...p, [field]: v }))}
                      keyboardType={field === "email" ? "email-address" : "default"}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              ))}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Password</Text>
                <View style={[styles.fieldRow, { borderColor: borderCol, backgroundColor: isDark ? "#111111" : "#F8FAFC" }]}>
                  <Feather name="lock" size={16} color={muted} />
                  <TextInput
                    style={[styles.fieldInput, { color: textColor }]}
                    placeholder="Set a password"
                    placeholderTextColor={muted}
                    value={formData.password}
                    onChangeText={(v) => setFormData(p => ({ ...p, password: v }))}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={muted} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.cancelBtn, { borderColor: borderCol }]}>
                <Text style={[styles.cancelBtnText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[styles.submitBtn, { backgroundColor: tint, opacity: submitting ? 0.6 : 1 }]}>
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Create Gatekeeper</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  screenSub: { fontSize: 12, fontWeight: "500", marginTop: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  scroll: { padding: 16, paddingBottom: 40, gap: 10 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  statCard: { width: "48%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  statIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6, marginTop: 4 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  emptyMsg: { fontSize: 13, textAlign: "center" },
  staffCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10 },
  staffRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontWeight: "700" },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 15, fontWeight: "600" },
  staffEmail: { fontSize: 12, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  staffDivider: { height: 1, marginVertical: 12 },
  staffMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12 },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#EF444415" },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: "#EF4444" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalClose: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  modalFooter: { flexDirection: "row", gap: 10, padding: 20, borderTopWidth: 1 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  fieldInput: { flex: 1, fontSize: 15 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  cancelBtnText: { fontSize: 14, fontWeight: "600" },
  submitBtn: { flex: 2, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
