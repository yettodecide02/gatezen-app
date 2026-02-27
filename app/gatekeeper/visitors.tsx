// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const V_STATUS = {
  pending: { color: "#F59E0B", label: "PNDG" }, cancelled: { color: "#EF4444", label: "CNCL" },
  checked_in: { color: "#3B82F6", label: "IN" }, checked_out: { color: "#94A3B8", label: "OUT" },
};
const K_STATUS = {
  PENDING: { color: "#F59E0B", label: "PNDG" }, APPROVED: { color: "#10B981", label: "APPR" },
  REJECTED: { color: "#EF4444", label: "RJCT" }, CHECKED_IN: { color: "#3B82F6", label: "IN" }, CHECKED_OUT: { color: "#94A3B8", label: "OUT" },
};

export default function GatekeeperVisitors() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const { toast, showError, showSuccess, hideToast } = useToast();
  const [user, setUserState] = useState(null);
  const [token, setTokenState] = useState(null);
  const [activeTab, setActiveTab] = useState("visitors");
  const [visitors, setVisitors] = useState([]);
  const [kidPasses, setKidPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    (async () => { const [t, u] = await Promise.all([getToken(), getUser()]); setTokenState(t); setUserState(u); })();
  }, []);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, kRes] = await Promise.all([
        axios.get(`${config.backendUrl}/gatekeeper`, { headers: authHeaders }),
        axios.get(`${config.backendUrl}/gatekeeper/kid-passes`, { headers: authHeaders }),
      ]);
      setVisitors(Array.isArray(vRes.data) ? vRes.data : []);
      setKidPasses(Array.isArray(kRes.data) ? kRes.data : []);
    } catch { showError("Failed to load data"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (user) load(); }, [user]);

  const updateVisitor = async (id, status) => {
    setUpdating(id);
    try {
      const res = await axios.post(`${config.backendUrl}/gatekeeper`, { id, status }, { headers: authHeaders });
      setVisitors(prev => prev.map(v => v.id === id ? res.data : v));
      showSuccess(`Visitor ${status.replace("_", " ")}`);
    } catch (e) { showError(e?.response?.data?.error || "Failed to update"); }
    finally { setUpdating(null); }
  };

  const updateKidPass = async (id, status) => {
    setUpdating(id);
    try {
      const res = await axios.post(`${config.backendUrl}/gatekeeper/kid-passes/${id}`, { status }, { headers: authHeaders });
      setKidPasses(prev => prev.map(p => p.id === id ? res.data : p));
      showSuccess(`Kid pass ${status.toLowerCase()}`);
    } catch (e) { showError(e?.response?.data?.error || "Failed to update"); }
    finally { setUpdating(null); }
  };

  const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const TABS = [
    { key: "visitors", label: "Visitors", count: visitors.length },
    { key: "kids", label: "Kid Passes", count: kidPasses.length },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 0, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: text }}>Visitor Management</Text>
          <Text style={{ fontSize: 13, color: muted }}>Check in & verify visitors</Text>
        </View>
        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 0 }}>
          {TABS.map(t => (
            <Pressable key={t.key} onPress={() => setActiveTab(t.key)}
              style={{ flex: 1, alignItems: "center", paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: activeTab === t.key ? tint : "transparent" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: activeTab === t.key ? tint : muted }}>{t.label}</Text>
                <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, backgroundColor: activeTab === t.key ? tint + "20" : borderCol }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: activeTab === t.key ? tint : muted }}>{t.count}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color={tint} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}>
          {activeTab === "visitors" ? (
            visitors.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="users" size={24} color={tint} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>No Visitors</Text>
                <Text style={{ fontSize: 13, color: muted }}>No visitor records found.</Text>
              </View>
            ) : visitors.map(v => {
              const key = (v.status || "pending").toLowerCase();
              const sc = V_STATUS[key] || V_STATUS.pending;
              const isPending = key === "pending";
              return (
                <View key={v.id} style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: sc.color + "18", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="user" size={18} color={sc.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: text }}>{v.name || v.visitorName || "Visitor"}</Text>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: sc.color + "20" }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: sc.color }}>{sc.label}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>{v.visitorType || "Guest"}{v.phone ? ` · ${v.phone}` : ""}</Text>
                      {(v.expectedAt || v.visitDate) && <Text style={{ fontSize: 11, color: muted }}>{fmt(v.expectedAt || v.visitDate)}</Text>}
                    </View>
                  </View>
                  {isPending && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                      <Pressable onPress={() => updateVisitor(v.id, "cancelled")} disabled={updating === v.id}
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#EF444430", backgroundColor: "#EF444408", alignItems: "center" }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#EF4444" }}>Deny</Text>
                      </Pressable>
                      <Pressable onPress={() => updateVisitor(v.id, "checked_in")} disabled={updating === v.id}
                        style={{ flex: 2, paddingVertical: 8, borderRadius: 10, backgroundColor: tint, alignItems: "center" }}>
                        {updating === v.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>Allow Entry</Text>}
                      </Pressable>
                    </View>
                  )}
                  {key === "checked_in" && (
                    <Pressable onPress={() => updateVisitor(v.id, "checked_out")} disabled={updating === v.id}
                      style={{ marginTop: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: borderCol, alignItems: "center" }}>
                      {updating === v.id ? <ActivityIndicator size="small" color={muted} /> : <Text style={{ fontSize: 12, fontWeight: "600", color: muted }}>Mark as Exited</Text>}
                    </Pressable>
                  )}
                </View>
              );
            })
          ) : (
            kidPasses.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#8B5CF615", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="smile" size={24} color="#8B5CF6" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>No Kid Passes</Text>
                <Text style={{ fontSize: 13, color: muted }}>No kid exit passes found.</Text>
              </View>
            ) : kidPasses.map(p => {
              const sc = K_STATUS[p.status] || K_STATUS.PENDING;
              const isPending = p.status === "PENDING";
              const isIn = p.status === "CHECKED_IN";
              return (
                <View key={p.id} style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#8B5CF618", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="smile" size={18} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: text }}>{p.childName || "Child"}</Text>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: sc.color + "20" }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: sc.color }}>{sc.label}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>Parent: {p.parentName || "—"}{p.contact ? ` · ${p.contact}` : ""}</Text>
                      {p.validFrom && <Text style={{ fontSize: 11, color: muted }}>{fmt(p.validFrom)}{p.validTo ? ` – ${fmt(p.validTo)}` : ""}</Text>}
                    </View>
                  </View>
                  {(isPending || isIn) && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                      {isPending && (
                        <>
                          <Pressable onPress={() => updateKidPass(p.id, "REJECTED")} disabled={updating === p.id}
                            style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#EF444430", backgroundColor: "#EF444408", alignItems: "center" }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#EF4444" }}>Reject</Text>
                          </Pressable>
                          <Pressable onPress={() => updateKidPass(p.id, "CHECKED_IN")} disabled={updating === p.id}
                            style={{ flex: 2, paddingVertical: 8, borderRadius: 10, backgroundColor: tint, alignItems: "center" }}>
                            {updating === p.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>Allow Exit</Text>}
                          </Pressable>
                        </>
                      )}
                      {isIn && (
                        <Pressable onPress={() => updateKidPass(p.id, "CHECKED_OUT")} disabled={updating === p.id}
                          style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: borderCol, alignItems: "center" }}>
                          {updating === p.id ? <ActivityIndicator size="small" color={muted} /> : <Text style={{ fontSize: 12, fontWeight: "600", color: muted }}>Mark Returned</Text>}
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
