// @ts-nocheck
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const STATUS_CONF = {
  PENDING: { color: "#F59E0B", label: "PNDG" }, APPROVED: { color: "#10B981", label: "APPR" },
  REJECTED: { color: "#EF4444", label: "RJCT" }, CHECKED_IN: { color: "#3B82F6", label: "IN" }, CHECKED_OUT: { color: "#94A3B8", label: "OUT" },
};

function pad(n) { return String(n).padStart(2, "0"); }
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m-1, d); dt.setDate(dt.getDate() + days);
  return isoDate(dt);
}
const today = isoDate(new Date());

export default function KidPasses() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const fieldBg = isDark ? "#111111" : "#F8FAFC";

  const [user, setUserState] = useState(null);
  const [token, setTokenState] = useState(null);
  const [kidPasses, setKidPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ childName: "", childAge: "", parentName: "", contact: "", permissions: "", validFrom: today, validTo: addDays(today, 7) });
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const { toast, showError, showSuccess, hideToast } = useToast();

  useEffect(() => {
    (async () => {
      const [t, u] = await Promise.all([getToken(), getUser()]);
      setTokenState(t); setUserState(u);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!user?.id || !user?.communityId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${config.backendUrl}/resident/kid-passes?userId=${user.id}&communityId=${user.communityId}`, { headers: { Authorization: `Bearer ${token}` } });
      setKidPasses(Array.isArray(res.data) ? res.data : []);
    } catch { showError("Failed to load kid passes"); }
    finally { setLoading(false); }
  }, [user, token]);

  useEffect(() => { if (user) load(); }, [user]);

  const handleCreate = async () => {
    if (!form.childName.trim()) { showError("Child name is required"); return; }
    if (!form.parentName.trim()) { showError("Parent name is required"); return; }
    if (!form.contact.trim()) { showError("Contact is required"); return; }
    try {
      setSubmitting(true);
      const [fy, fm, fd] = form.validFrom.split("-").map(Number);
      const [ty, tm, td] = form.validTo.split("-").map(Number);
      await axios.post(`${config.backendUrl}/resident/kid-passes`, {
        childName: form.childName.trim(), childAge: form.childAge ? parseInt(form.childAge) : null,
        parentName: form.parentName.trim(), contact: form.contact.trim(),
        permissions: form.permissions.trim() || "Standard access",
        validFrom: new Date(fy, fm-1, fd, 0, 0, 0).toISOString(),
        validTo: new Date(ty, tm-1, td, 23, 59, 59).toISOString(),
        communityId: user.communityId, userId: user.id,
      }, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      showSuccess("Kid pass created!");
      setShowCreateModal(false);
      setForm({ childName: "", childAge: "", parentName: "", contact: "", permissions: "", validFrom: today, validTo: addDays(today, 7) });
      load();
    } catch (e) { showError(e.response?.data?.error || "Failed to create kid pass"); }
    finally { setSubmitting(false); }
  };

  const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtShort = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
            <Feather name="arrow-left" size={18} color={text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Kids Exit Passes</Text>
            <Text style={{ fontSize: 12, color: muted }}>Child exit permissions</Text>
          </View>
          <Pressable onPress={() => setShowCreateModal(true)} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: tint }}>
            <Feather name="plus" size={14} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>New</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}><ActivityIndicator size="large" color={tint} /></View>
        ) : kidPasses.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
              <Feather name="shield" size={24} color={tint} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>No Kid Passes</Text>
            <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>Create a pass to allow supervised child exit.</Text>
            <Pressable onPress={() => setShowCreateModal(true)} style={{ marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: tint }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>Create Pass</Text>
            </Pressable>
          </View>
        ) : kidPasses.map((kp) => {
          const sc = STATUS_CONF[kp.status] || STATUS_CONF.PENDING;
          return (
            <View key={kp.id} style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: text }}>{kp.childName}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: sc.color + "20" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: sc.color }}>{sc.label}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: muted }}>
                {kp.childAge ? `Age ${kp.childAge} · ` : ""}Parent: {kp.parentName} · {kp.contact}
              </Text>
              <Text style={{ fontSize: 11, color: muted }}>Valid: {fmt(kp.validFrom)} — {fmt(kp.validTo)}</Text>
              {kp.permissions && <Text style={{ fontSize: 11, color: tint }}>Permissions: {kp.permissions}</Text>}
            </View>
          );
        })}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <ScrollView style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, maxHeight: "90%", paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>New Kid Pass</Text>
              <Pressable onPress={() => setShowCreateModal(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: borderCol, alignItems: "center", justifyContent: "center" }}>
                <Feather name="x" size={16} color={text} />
              </Pressable>
            </View>
            {[
              { label: "Child Name *", key: "childName", placeholder: "Enter child name" },
              { label: "Child Age", key: "childAge", placeholder: "Age (optional)", keyboardType: "numeric" },
              { label: "Parent Name *", key: "parentName", placeholder: "Your name" },
              { label: "Contact *", key: "contact", placeholder: "Phone number", keyboardType: "phone-pad" },
              { label: "Permissions", key: "permissions", placeholder: "e.g. Standard access" },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 5 }}>{f.label}</Text>
                <TextInput value={form[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} placeholder={f.placeholder} placeholderTextColor={muted} keyboardType={f.keyboardType || "default"}
                  style={{ backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: text }} />
              </View>
            ))}
            {/* Date pickers */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 5 }}>Valid From</Text>
                <Pressable onPress={() => setShowFromPicker(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
                  <Feather name="calendar" size={13} color={muted} /><Text style={{ fontSize: 13, color: text }}>{fmtShort(form.validFrom)}</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 5 }}>Valid To</Text>
                <Pressable onPress={() => setShowToPicker(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
                  <Feather name="calendar" size={13} color={muted} /><Text style={{ fontSize: 13, color: text }}>{fmtShort(form.validTo)}</Text>
                </Pressable>
              </View>
            </View>
            <Pressable onPress={handleCreate} disabled={submitting}
              style={({ pressed }) => ({ backgroundColor: pressed || submitting ? tint + "CC" : tint, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 4, marginBottom: 8 })}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Create Pass</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {showFromPicker && <DateTimePicker value={new Date(form.validFrom + "T00:00:00")} mode="date" onChange={(e, d) => { setShowFromPicker(false); if (e.type==="set" && d) setForm(p => ({ ...p, validFrom: isoDate(d) })); }} />}
      {showToPicker && <DateTimePicker value={new Date(form.validTo + "T00:00:00")} mode="date" minimumDate={new Date(form.validFrom + "T00:00:00")} onChange={(e, d) => { setShowToPicker(false); if (e.type==="set" && d) setForm(p => ({ ...p, validTo: isoDate(d) })); }} />}
      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
