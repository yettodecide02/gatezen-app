// @ts-nocheck
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, Platform } from "react-native";
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
  pending: { color: "#F59E0B", label: "PNDG", icon: "clock" },
  cancelled: { color: "#EF4444", label: "CNCL", icon: "x-circle" },
  checked_in: { color: "#10B981", label: "IN", icon: "log-in" },
  checked_out: { color: "#94A3B8", label: "OUT", icon: "log-out" },
};

function isoDate(d) { return d.toISOString().split("T")[0]; }

export default function Passes() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const [user, setUserState] = useState(null);
  const [token, setTokenState] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(isoDate(new Date(Date.now() - 30*864e5)));
  const [to, setTo] = useState(isoDate(new Date()));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const { toast, showError, hideToast } = useToast();

  useEffect(() => {
    (async () => {
      const [t, u] = await Promise.all([getToken(), getUser()]);
      setTokenState(t);
      setUserState(u);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!user?.id || !user?.communityId) return;
    setLoading(true);
    try {
      const [fy, fm, fd] = from.split("-").map(Number);
      const [ty, tm, td] = to.split("-").map(Number);
      const params = new URLSearchParams({
        communityId: user.communityId, userId: user.id,
        from: new Date(fy, fm-1, fd, 0, 0, 0).toISOString(),
        to: new Date(ty, tm-1, td, 23, 59, 59).toISOString(),
      });
      const res = await axios.get(`${config.backendUrl}/resident/visitors?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setVisitors(Array.isArray(res.data) ? res.data : []);
    } catch { showError("Failed to load visitor passes"); }
    finally { setLoading(false); }
  }, [user, token, from, to]);

  useEffect(() => { if (user) load(); }, [user]);

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
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>My Passes</Text>
            <Text style={{ fontSize: 12, color: muted }}>Visitor pass history</Text>
          </View>
          <Pressable onPress={load} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
            <Feather name="refresh-cw" size={16} color={tint} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* Date filter */}
        <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14, gap: 10 }}>
          <Text style={{ fontSize: 11, color: muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Date Range</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => setShowFromPicker(true)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: isDark ? "#111" : "#F8FAFC", borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
              <Feather name="calendar" size={13} color={muted} />
              <Text style={{ fontSize: 13, color: text }}>{fmtShort(from)}</Text>
            </Pressable>
            <Text style={{ alignSelf: "center", color: muted, fontSize: 12 }}>—</Text>
            <Pressable onPress={() => setShowToPicker(true)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: isDark ? "#111" : "#F8FAFC", borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
              <Feather name="calendar" size={13} color={muted} />
              <Text style={{ fontSize: 13, color: text }}>{fmtShort(to)}</Text>
            </Pressable>
            <Pressable onPress={load} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>Go</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}><ActivityIndicator size="large" color={tint} /></View>
        ) : visitors.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
              <Feather name="credit-card" size={24} color={tint} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>No Passes</Text>
            <Text style={{ fontSize: 13, color: muted }}>No visitor passes in this date range.</Text>
          </View>
        ) : visitors.map((v) => {
          const key = (v.status || "pending").toLowerCase();
          const sc = STATUS_CONF[key] || STATUS_CONF.pending;
          return (
            <View key={v.id} style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: sc.color + "1A", alignItems: "center", justifyContent: "center" }}>
                  <Feather name={sc.icon} size={18} color={sc.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: text }}>{v.name || v.visitorName || "Visitor"}</Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: sc.color + "20" }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: sc.color }}>{sc.label}</Text>
                    </View>
                  </View>
                  {v.phone && <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>{v.phone}</Text>}
                  <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                    {v.expectedAt ? fmt(v.expectedAt) : v.createdAt ? fmt(v.createdAt) : ""}
                    {v.purpose ? ` · ${v.purpose}` : ""}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {showFromPicker && <DateTimePicker value={new Date(from + "T00:00:00")} mode="date" maximumDate={new Date(to + "T00:00:00")} onChange={(e, d) => { setShowFromPicker(false); if (e.type==="set" && d) setFrom(isoDate(d)); }} />}
      {showToPicker && <DateTimePicker value={new Date(to + "T00:00:00")} mode="date" minimumDate={new Date(from + "T00:00:00")} maximumDate={new Date()} onChange={(e, d) => { setShowToPicker(false); if (e.type==="set" && d) setTo(isoDate(d)); }} />}
      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
