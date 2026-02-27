// @ts-nocheck
import React, { useEffect, useState, useMemo } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, Switch } from "react-native";
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

const mapStatus = (s) => {
  switch (s?.toUpperCase()) {
    case "COMPLETED": return "paid";
    case "FAILED": return "failed";
    default: return "due";
  }
};
const STATUS_MAP = { paid: { color: "#10B981", label: "PAID" }, failed: { color: "#EF4444", label: "FAIL" }, due: { color: "#F59E0B", label: "DUE" } };

export default function Payments() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autopay, setAutopay] = useState(false);
  const { toast, showInfo, showError, hideToast } = useToast();

  const due = useMemo(() => items.filter(i => i.status === "due"), [items]);
  const history = useMemo(() => items.filter(i => i.status !== "due"), [items]);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        if (!t || !u?.communityId) return;
        const res = await axios.get(`${config.backendUrl}/resident/payments`, { params: { communityId: u.communityId }, headers: { Authorization: `Bearer ${t}` } });
        const raw = res.data?.data ?? res.data ?? [];
        setItems((Array.isArray(raw) ? raw : []).map(p => ({ id: p.id, description: p.description, amount: p.amount, currency: p.currency || "INR", status: mapStatus(p.status), createdAt: p.createdAt, paidAt: p.paidAt })));
      } catch { showError("Failed to load payments"); }
      finally { setLoading(false); }
    })();
  }, []);

  const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtAmt = (amt, cur) => `${cur === "INR" ? "₹" : "$"}${Number(amt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const PaymentCard = ({ item }) => {
    const sc = STATUS_MAP[item.status] || STATUS_MAP.due;
    return (
      <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: sc.color + "1A", alignItems: "center", justifyContent: "center" }}>
            <Feather name="credit-card" size={18} color={sc.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: text, flex: 1, marginRight: 8 }} numberOfLines={1}>{item.description || "Payment"}</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: sc.color + "20" }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: sc.color }}>{sc.label}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>{fmt(item.createdAt)}{item.paidAt ? ` · Paid ${fmt(item.paidAt)}` : ""}</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: sc.color }}>{fmtAmt(item.amount, item.currency)}</Text>
        </View>
        {item.status === "due" && (
          <Pressable onPress={() => showInfo("Online payment will be available soon. Please contact admin for manual payment.")}
            style={({ pressed }) => ({ alignSelf: "flex-end", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: pressed ? tint + "CC" : tint })}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>Pay Now</Text>
          </Pressable>
        )}
        {item.status === "paid" && (
          <Pressable onPress={() => showInfo("Receipt download coming soon.")} style={{ alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Feather name="download" size={13} color={tint} />
            <Text style={{ fontSize: 12, color: tint, fontWeight: "500" }}>Receipt</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
            <Feather name="arrow-left" size={18} color={text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Payments</Text>
            <Text style={{ fontSize: 12, color: muted }}>Manage your bills</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color={tint} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>

          {/* Overdue banner */}
          {due.length > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EF44440D", borderWidth: 1, borderColor: "#EF444430", borderRadius: 12, padding: 12 }}>
              <Feather name="alert-circle" size={18} color="#EF4444" />
              <Text style={{ flex: 1, fontSize: 13, color: "#EF4444", fontWeight: "500" }}>You have {due.length} pending payment{due.length !== 1 ? "s" : ""}. Please clear dues soon.</Text>
            </View>
          )}

          {/* Stats */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { label: "Due", value: due.length, color: "#F59E0B" },
              { label: "Paid", value: items.filter(i => i.status==="paid").length, color: "#10B981" },
              { label: "Total", value: items.length, color: tint },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Autopay */}
          <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
              <Feather name="repeat" size={18} color={tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: text }}>Autopay</Text>
              <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>Auto-process monthly dues</Text>
            </View>
            <Switch value={autopay} onValueChange={setAutopay} trackColor={{ false: borderCol, true: tint + "60" }} thumbColor={autopay ? tint : muted} />
          </View>

          {/* Due section */}
          {due.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Pending</Text>
              {due.map(item => <PaymentCard key={item.id} item={item} />)}
            </View>
          )}

          {/* History */}
          {history.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: 0.5 }}>History</Text>
              {history.map(item => <PaymentCard key={item.id} item={item} />)}
            </View>
          )}

          {items.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
                <Feather name="credit-card" size={24} color={tint} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>No Payments</Text>
              <Text style={{ fontSize: 13, color: muted }}>All clear — no bills due.</Text>
            </View>
          )}

        </ScrollView>
      )}
      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
