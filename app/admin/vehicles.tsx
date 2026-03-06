// @ts-nocheck
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";

import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { getCommunityId, getToken } from "@/lib/auth";
import { config } from "@/lib/config";

const TABS = ["PENDING", "APPROVED", "REJECTED"] as const;
type Tab = (typeof TABS)[number];

const STATUS_CONFIG = {
  PENDING:  { color: "#F59E0B", bg: "#FEF3C720", label: "Pending" },
  APPROVED: { color: "#10B981", bg: "#10B98120", label: "Approved" },
  REJECTED: { color: "#EF4444", bg: "#EF444420", label: "Rejected" },
};

export default function AdminVehicles() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const { toast, showError, showSuccess, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("PENDING");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [token, communityId] = await Promise.all([getToken(), getCommunityId()]);
      if (!communityId) return;
      const res = await axios.get(`${config.backendUrl}/admin/vehicles`, {
        params: { communityId, status: activeTab },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const raw = res.data?.vehicles ?? res.data ?? [];
      setVehicles(Array.isArray(raw) ? raw : []);
    } catch {
      showError("Failed to load vehicles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      const token = await getToken();
      await axios.patch(`${config.backendUrl}/admin/vehicles/${id}`,
        { status: "APPROVED" },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      showSuccess("Vehicle approved.");
      load();
    } catch { showError("Failed to approve."); }
    finally { setActioning(null); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActioning(rejectId);
    try {
      const token = await getToken();
      await axios.patch(`${config.backendUrl}/admin/vehicles/${rejectId}`,
        { status: "REJECTED", rejectionReason: rejectReason.trim() || "Not approved" },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      showSuccess("Vehicle rejected.");
      setRejectId(null); setRejectReason("");
      load();
    } catch { showError("Failed to reject."); }
    finally { setActioning(null); }
  };

  const fieldBg = isDark ? "#111111" : "#F8FAFC";

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderCol, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
          <Feather name="arrow-left" size={18} color={text} />
        </Pressable>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: text }}>Vehicle Registrations</Text>
          <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>Review resident vehicles</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setActiveTab(t)}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: activeTab === t ? tint : "transparent", borderWidth: 1, borderColor: activeTab === t ? tint : borderCol }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: activeTab === t ? "#fff" : muted }}>{STATUS_CONFIG[t].label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color={tint} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={tint} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
        >
          {vehicles.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}>
              <Feather name="truck" size={32} color={muted} style={{ opacity: 0.3 }} />
              <Text style={{ fontSize: 15, color: muted }}>No {STATUS_CONFIG[activeTab].label.toLowerCase()} vehicles</Text>
            </View>
          ) : vehicles.map((v) => (
            <View key={v.id} style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: borderCol, padding: 16, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="truck" size={20} color={tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: text, letterSpacing: 0.5 }}>{v.plateNumber}</Text>
                  <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                    {[v.vehicleType, v.brand, v.model, v.color].filter(Boolean).join(" · ")}
                  </Text>
                  {v.user && (
                    <Text style={{ fontSize: 12, color: muted, marginTop: 4 }}>
                      <Feather name="user" size={11} /> {v.user.name}
                      {v.user.unitNumber ? ` · Unit ${v.user.unitNumber}` : ""}
                      {v.user.blockName ? ` · Block ${v.user.blockName}` : ""}
                    </Text>
                  )}
                </View>
              </View>

              {activeTab === "PENDING" && (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable onPress={() => { setRejectId(v.id); setRejectReason(""); }}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#EF444430", alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#EF4444" }}>Reject</Text>
                  </Pressable>
                  <Pressable onPress={() => handleApprove(v.id)} disabled={actioning === v.id}
                    style={{ flex: 2, paddingVertical: 10, borderRadius: 10, backgroundColor: "#10B981", alignItems: "center", opacity: actioning === v.id ? 0.7 : 1 }}
                  >
                    {actioning === v.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Approve</Text>}
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Reject reason modal */}
      {rejectId && (
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: insets.bottom + 20, gap: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: text }}>Rejection Reason</Text>
            <TextInput style={{ backgroundColor: fieldBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 12, fontSize: 14, color: text, minHeight: 80, textAlignVertical: "top" }}
              value={rejectReason} onChangeText={setRejectReason} placeholder="Optional reason…" placeholderTextColor={muted} multiline
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={() => setRejectId(null)} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: borderCol, alignItems: "center" }}>
                <Text style={{ color: muted, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleReject} disabled={!!actioning} style={{ flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: "#EF4444", alignItems: "center", opacity: actioning ? 0.7 : 1 }}>
                {actioning ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontWeight: "700", color: "#fff" }}>Confirm Reject</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
