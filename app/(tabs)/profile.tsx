// @ts-nocheck
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getUser, getToken, setUser, logout } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/hooks/useToast";

export default function Profile() {
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profile, setProfile] = useState({ id: "", name: "", email: "", block: "", unit: "", communityName: "" });
  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const user = await getUser();
      const token = await getToken();
      const basicProfile = {
        id: user?.id || "",
        name: user?.name || "",
        email: user?.email || "",
        block: user?.blockName || user?.block || "",
        unit: user?.unitNumber || user?.unit || "",
        communityName: user?.communityName || "",
      };
      if (token && user?.id) {
        try {
          const res = await axios.get(`${config.backendUrl}/resident/profile`, {
            params: { userId: user.id, communityId: user.communityId },
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data?.success) {
            const d = res.data.data;
            setProfile({ id: d.id, name: d.name, email: d.email, block: d.blockName || basicProfile.block, unit: d.unitNumber || basicProfile.unit, communityName: d.communityName || basicProfile.communityName });
            return;
          }
        } catch {}
      }
      setProfile(basicProfile);
    } catch { } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!profile.name.trim()) { showWarning("Name cannot be empty."); return; }
    try {
      setSaving(true);
      const token = await getToken();
      const res = await axios.patch(`${config.backendUrl}/resident/profile`, { name: profile.name.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) {
        const cached = await getUser();
        if (cached) await setUser({ ...cached, name: res.data.data.name });
        setProfile((p) => ({ ...p, name: res.data.data.name }));
      }
      showSuccess("Profile updated!");
      setEditing(false);
    } catch { showError("Failed to update profile."); } finally { setSaving(false); }
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try { await logout(); router.replace("/login"); }
    catch { showError("Logout failed."); setLoggingOut(false); }
    finally { setShowLogoutConfirm(false); }
  };

  const getInitials = (name) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color={tint} /></View>;
  }

  const INFO_ROWS = [
    { icon: "mail", label: "Email", value: profile.email },
    { icon: "home", label: "Community", value: profile.communityName || "—" },
    { icon: "layers", label: "Block", value: profile.block || "—" },
    { icon: "hash", label: "Unit", value: profile.unit || "—" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: text }}>Profile</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {editing && (
              <Pressable onPress={handleSave} disabled={saving}
                style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: saving ? tint + "80" : tint }}>
                <Feather name="check" size={14} color="#fff" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>{saving ? "Saving…" : "Save"}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setEditing(!editing)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
              <Feather name={editing ? "x" : "edit-2"} size={16} color={tint} />
            </Pressable>
            <Pressable onPress={() => setShowLogoutConfirm(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#EF444415", alignItems: "center", justifyContent: "center" }}>
              <Feather name="log-out" size={16} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: tint + "20", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: tint }}>{getInitials(profile.name || "R")}</Text>
          </View>
          {editing ? (
            <TextInput
              value={profile.name}
              onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))}
              style={{ fontSize: 20, fontWeight: "700", color: text, textAlign: "center", borderBottomWidth: 2, borderBottomColor: tint, paddingBottom: 4, minWidth: 160 }}
              placeholder="Your name"
              placeholderTextColor={muted}
            />
          ) : (
            <Text style={{ fontSize: 20, fontWeight: "700", color: text }}>{profile.name}</Text>
          )}
          <Text style={{ fontSize: 13, color: muted, marginTop: 3 }}>{profile.email}</Text>
        </View>

        {/* Info Card */}
        <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: borderCol, overflow: "hidden" }}>
          {INFO_ROWS.map((row, idx) => (
            <View key={row.label} style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: borderCol }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
                <Feather name={row.icon} size={16} color={tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: muted, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 }}>{row.label}</Text>
                <Text style={{ fontSize: 15, color: text, fontWeight: "500", marginTop: 1 }}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Logout Button */}
        <Pressable onPress={() => setShowLogoutConfirm(true)}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#EF444430", backgroundColor: pressed ? "#EF44441A" : "#EF44440D" })}>
          <Feather name="log-out" size={16} color="#EF4444" />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#EF4444" }}>Logout</Text>
        </Pressable>

      </ScrollView>

      <ConfirmModal
        visible={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText={loggingOut ? "Logging out…" : "Logout"}
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        confirmStyle="danger"
      />
      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
