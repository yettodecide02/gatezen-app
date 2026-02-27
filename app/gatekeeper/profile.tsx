// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/hooks/useToast";

export default function GatekeeperProfile() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const { toast, showError, hideToast } = useToast();
  const [user, setUserState] = useState(null);
  const [token, setTokenState] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    (async () => { const [t, u] = await Promise.all([getToken(), getUser()]); setTokenState(t); setUserState(u); })();
  }, []);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const res = await axios.get(`${config.backendUrl}/gatekeeper/stats`, { headers: { Authorization: `Bearer ${token}` } });
      setStats(res.data.today || res.data);
    } catch { /* silent */ }
    finally { setLoadingStats(false); }
  }, [token]);

  useEffect(() => { if (token) loadStats(); }, [token]);

  const confirmLogout = useCallback(async () => {
    setLoggingOut(true);
    try { await AsyncStorage.multiRemove(["token", "user"]); router.replace("/login"); }
    catch { showError("Failed to logout"); }
    finally { setLoggingOut(false); setShowLogout(false); }
  }, []);

  const initials = (user?.name || "G").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const statItems = [
    { icon: "users", color: "#3B82F6", label: "Checked In", value: stats?.checkedIn ?? "—" },
    { icon: "log-out", color: "#10B981", label: "Checked Out", value: stats?.checkedOut ?? "—" },
    { icon: "package", color: "#F59E0B", label: "Packages", value: stats?.packages ?? "—" },
    { icon: "alert-circle", color: "#EF4444", label: "Pending", value: stats?.pending ?? "—" },
  ];

  const infoRows = [
    { icon: "mail", label: "Email", value: user?.email },
    { icon: "home", label: "Community", value: user?.community?.name || user?.communityName },
    { icon: "shield", label: "Role", value: "Gatekeeper" },
  ].filter(r => r.value);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: text }}>Profile</Text>
        <Text style={{ fontSize: 13, color: muted }}>Gatekeeper account</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }}>
        {/* Avatar */}
        <View style={{ alignItems: "center", gap: 8 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: tint + "20", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: tint }}>{initials}</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: text }}>{user?.name || "Gatekeeper"}</Text>
          <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: "#10B98120" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#10B981" }}>ON DUTY</Text>
          </View>
        </View>

        {/* Today stats */}
        <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14 }}>
          <Text style={{ fontSize: 11, color: muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Today's Activity</Text>
          {loadingStats ? (
            <ActivityIndicator color={tint} style={{ paddingVertical: 12 }} />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {statItems.map(s => (
                <View key={s.label} style={{ flex: 1, minWidth: "40%", backgroundColor: s.color + "10", borderRadius: 12, padding: 12, alignItems: "center", gap: 4 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: s.color + "20", alignItems: "center", justifyContent: "center" }}>
                    <Feather name={s.icon} size={14} color={s.color} />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: s.color }}>{s.value}</Text>
                  <Text style={{ fontSize: 10, color: muted, fontWeight: "600", textAlign: "center" }}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info */}
        {infoRows.length > 0 && (
          <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, overflow: "hidden" }}>
            {infoRows.map((r, i) => (
              <View key={r.label} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: i < infoRows.length - 1 ? 1 : 0, borderBottomColor: borderCol }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
                  <Feather name={r.icon} size={15} color={tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: muted }}>{r.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: text }}>{r.value}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Logout */}
        <Pressable onPress={() => setShowLogout(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EF444410", borderRadius: 14, borderWidth: 1, borderColor: "#EF444425", padding: 14 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#EF444418", alignItems: "center", justifyContent: "center" }}>
            <Feather name="log-out" size={16} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#EF4444" }}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <ConfirmModal visible={showLogout} title="Sign Out" description="Are you sure you want to sign out?" onCancel={() => setShowLogout(false)} onConfirm={confirmLogout} loading={loggingOut} />
      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
