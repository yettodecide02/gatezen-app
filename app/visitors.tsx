// @ts-nocheck
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import axios from "axios";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const STATUS_CONF = {
  pending: { color: "#F59E0B", label: "PNDG" }, cancelled: { color: "#EF4444", label: "CNCL" },
  checked_in: { color: "#10B981", label: "IN" }, checked_out: { color: "#94A3B8", label: "OUT" },
};
const VISITOR_TYPES = ["GUEST", "DELIVERY", "CAB_AUTO"];
const TYPE_LABELS = { GUEST: "Guest", DELIVERY: "Delivery", CAB_AUTO: "Cab/Auto" };

function pad(n) { return String(n).padStart(2, "0"); }
function nowDate() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function nowTime() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export default function Visitors() {
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
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [from, setFrom] = useState(nowDate());
  const [to, setTo] = useState(nowDate());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("GUEST");
  const [expectedDate, setExpectedDate] = useState(nowDate());
  const [expectedTime, setExpectedTime] = useState(nowTime());
  const [vehicle, setVehicle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const { toast, showError, showSuccess, hideToast } = useToast();
  const searchParams = useLocalSearchParams();

  useEffect(() => {
    (async () => { const [t, u] = await Promise.all([getToken(), getUser()]); setTokenState(t); setUserState(u); })();
  }, []);

  useEffect(() => { if (searchParams.visitorType) { setType(searchParams.visitorType); setShowNew(true); } }, [searchParams.visitorType]);

  const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

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
      const res = await axios.get(`${config.backendUrl}/resident/visitors?${params}`, { headers: authHeaders });
      setVisitors(Array.isArray(res.data) ? res.data : []);
    } catch { showError("Failed to load visitors"); }
    finally { setLoading(false); }
  }, [user, authHeaders, from, to]);

  useEffect(() => { if (user) load(); }, [user]);

  const createVisitor = async () => {
    if (!name.trim()) { showError("Visitor name is required"); return; }
    if (type === "GUEST" && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { showError("Invalid email address"); return; }
    setSubmitting(true);
    try {
      const [yr, mo, dy] = expectedDate.split("-").map(Number);
      const [hr, mn] = expectedTime.split(":").map(Number);
      await axios.post(`${config.backendUrl}/resident/visitor-creation`, {
        name: name.trim(), contact: email.trim() || null, visitorType: type,
        visitDate: new Date(yr, mo-1, dy, hr, mn, 0).toISOString(),
        vehicleNo: vehicle.trim() || null, communityId: user.communityId, userId: user.id,
      }, { headers: authHeaders });
      showSuccess("Visitor pre-authorized!");
      setName(""); setEmail(""); setType("GUEST"); setVehicle("");
      setExpectedDate(nowDate()); setExpectedTime(nowTime());
      setShowNew(false);
      load();
    } catch (e) { showError(e?.response?.data?.error || "Failed to create visitor pass"); }
    finally { setSubmitting(false); }
  };

  const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtShort = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
            <Feather name="arrow-left" size={18} color={text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Visitors</Text>
            <Text style={{ fontSize: 12, color: muted }}>{visitors.length} record{visitors.length !== 1 ? "s" : ""}</Text>
          </View>
          <Pressable onPress={() => setShowNew(true)} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: tint }}>
            <Feather name="user-plus" size={14} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>Invite</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* Date filter */}
        <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14, gap: 10 }}>
          <Text style={{ fontSize: 11, color: muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Date Range</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => setShowFromPicker(true)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
              <Feather name="calendar" size={13} color={muted} /><Text style={{ fontSize: 13, color: text }}>{fmtShort(from)}</Text>
            </Pressable>
            <Text style={{ alignSelf: "center", color: muted }}>—</Text>
            <Pressable onPress={() => setShowToPicker(true)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
              <Feather name="calendar" size={13} color={muted} /><Text style={{ fontSize: 13, color: text }}>{fmtShort(to)}</Text>
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
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#06B6D415", alignItems: "center", justifyContent: "center" }}>
              <Feather name="users" size={24} color="#06B6D4" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>No Visitors</Text>
            <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>No visitor records for this period.</Text>
          </View>
        ) : visitors.map((v) => {
          const key = (v.status || "pending").toLowerCase();
          const sc = STATUS_CONF[key] || STATUS_CONF.pending;
          const typeLabel = TYPE_LABELS[v.visitorType] || v.visitorType || "Guest";
          const typeColors = { Guest: "#3B82F6", Delivery: "#F59E0B", "Cab/Auto": "#10B981" };
          const tc = typeColors[typeLabel] || tint;
          return (
            <View key={v.id} style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tc + "1A", alignItems: "center", justifyContent: "center" }}>
                  <Feather name={typeLabel === "Delivery" ? "package" : typeLabel === "Cab/Auto" ? "truck" : "user"} size={18} color={tc} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: text }}>{v.name || v.visitorName || "Visitor"}</Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: sc.color + "20" }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: sc.color }}>{sc.label}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                    {typeLabel}{v.phone ? ` · ${v.phone}` : ""}{v.contact ? ` · ${v.contact}` : ""}
                  </Text>
                  {(v.expectedAt || v.visitDate) && <Text style={{ fontSize: 11, color: muted, marginTop: 1 }}>{fmt(v.expectedAt || v.visitDate)}</Text>}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* New visitor modal */}
      <Modal visible={showNew} animationType="slide" transparent onRequestClose={() => setShowNew(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <ScrollView style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%", paddingHorizontal: 20, paddingTop: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Pre-Authorize Visitor</Text>
              <Pressable onPress={() => setShowNew(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: borderCol, alignItems: "center", justifyContent: "center" }}>
                <Feather name="x" size={16} color={text} />
              </Pressable>
            </View>

            {/* Visitor type */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 8 }}>Visitor Type</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {VISITOR_TYPES.map(t => (
                  <Pressable key={t} onPress={() => setType(t)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: type === t ? tint : fieldBg, borderWidth: 1, borderColor: type === t ? tint : borderCol, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: type === t ? "#fff" : muted }}>{TYPE_LABELS[t]}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {[
              { label: "Name *", value: name, set: setName, placeholder: "Visitor name" },
              { label: type === "GUEST" ? "Email" : "Contact", value: email, set: setEmail, placeholder: type === "GUEST" ? "visitor@email.com" : "Phone number", keyboardType: type === "GUEST" ? "email-address" : "phone-pad" },
              { label: "Vehicle No.", value: vehicle, set: setVehicle, placeholder: "Optional" },
            ].map(f => (
              <View key={f.label} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 5 }}>{f.label}</Text>
                <TextInput value={f.value} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={muted} keyboardType={f.keyboardType || "default"}
                  style={{ backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: text }} />
              </View>
            ))}

            {/* Date / Time */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 5 }}>Expected Date</Text>
                <Pressable onPress={() => setShowDatePicker(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
                  <Feather name="calendar" size={13} color={muted} /><Text style={{ fontSize: 13, color: text }}>{fmtShort(expectedDate)}</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 5 }}>Time</Text>
                <Pressable onPress={() => setShowTimePicker(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
                  <Feather name="clock" size={13} color={muted} /><Text style={{ fontSize: 13, color: text }}>{expectedTime}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable onPress={createVisitor} disabled={submitting}
              style={({ pressed }) => ({ backgroundColor: pressed || submitting ? tint + "CC" : tint, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: insets.bottom + 20 })}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Send Invite</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {showFromPicker && <DateTimePicker value={new Date(from + "T00:00:00")} mode="date" onChange={(e, d) => { setShowFromPicker(false); if (e.type==="set" && d) setFrom(d.toISOString().split("T")[0]); }} />}
      {showToPicker && <DateTimePicker value={new Date(to + "T00:00:00")} mode="date" onChange={(e, d) => { setShowToPicker(false); if (e.type==="set" && d) setTo(d.toISOString().split("T")[0]); }} />}
      {showDatePicker && <DateTimePicker value={new Date(expectedDate + "T00:00:00")} mode="date" onChange={(e, d) => { setShowDatePicker(false); if (e.type==="set" && d) setExpectedDate(d.toISOString().split("T")[0]); }} />}
      {showTimePicker && <DateTimePicker value={(() => { const [h,m] = expectedTime.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0); return d; })()} mode="time" is24Hour onChange={(e, d) => { setShowTimePicker(false); if (e.type==="set" && d) { const h = String(d.getHours()).padStart(2,"0"); const m = String(d.getMinutes()).padStart(2,"0"); setExpectedTime(`${h}:${m}`); } }} />}
      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
