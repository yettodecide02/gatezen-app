// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const PRIORITY_COLORS = { HIGH: "#EF4444", MEDIUM: "#F59E0B", LOW: "#10B981", NORMAL: "#3B82F6" };
const PRIORITY_LABELS = { HIGH: "HIGH", MEDIUM: "MED", LOW: "LOW", NORMAL: "NRML" };

export default function Announcements() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const { toast, showError, hideToast } = useToast();

  const fetchAnnouncements = useCallback(async () => {
    try {
      const [token, user] = await Promise.all([getToken(), getUser()]);
      const communityId = user?.communityId;
      if (!communityId) return;
      const res = await axios.get(`${config.backendUrl}/resident/announcements`, { params: { communityId }, headers: { Authorization: `Bearer ${token}` } });
      setAnnouncements(res.data?.data ?? []);
    } catch { showError("Failed to load announcements"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
              <Feather name="arrow-left" size={18} color={text} />
            </Pressable>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Announcements</Text>
              <Text style={{ fontSize: 12, color: muted }}>{announcements.length} notice{announcements.length !== 1 ? "s" : ""}</Text>
            </View>
          </View>
          <Pressable onPress={() => { setRefreshing(true); fetchAnnouncements(); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
            <Feather name="refresh-cw" size={16} color={tint} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAnnouncements(); }} tintColor={tint} />}>
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}><ActivityIndicator size="large" color={tint} /></View>
        ) : announcements.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 50, gap: 8 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
              <Feather name="bell-off" size={24} color={tint} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>No Announcements</Text>
            <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>Check back later for community updates.</Text>
          </View>
        ) : announcements.map((item) => {
          const pc = PRIORITY_COLORS[item.priority] || muted;
          const isExp = expanded === item.id;
          return (
            <Pressable key={item.id} onPress={() => setExpanded(isExp ? null : item.id)}
              style={({ pressed }) => ({ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: isExp ? (pc + "50") : borderCol, padding: 14, opacity: pressed ? 0.9 : 1 })}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: pc + "18", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                  <Feather name="bell" size={18} color={pc} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: text, flex: 1, marginRight: 8 }} numberOfLines={isExp ? undefined : 1}>{item.title}</Text>
                    {item.priority && item.priority !== "NORMAL" && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: pc + "20" }}>
                        <Text style={{ fontSize: 9, fontWeight: "700", color: pc }}>{PRIORITY_LABELS[item.priority] || item.priority}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: muted }}>{timeAgo(item.createdAt)}{item.authorName ? ` · ${item.authorName}` : ""}</Text>
                  {isExp && <Text style={{ fontSize: 13, color: text, marginTop: 6, lineHeight: 20 }}>{item.body || item.content || item.message || ""}</Text>}
                </View>
                <Feather name={isExp ? "chevron-up" : "chevron-down"} size={16} color={muted} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
