// @ts-nocheck
import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Overstay limits (minutes) ──────────────────────────────────
const OVERSTAY_LIMITS = {
  DELIVERY: 10,
  GUEST:    240,
  CAB_AUTO: 15,
  OTHER:    120,
};

function getLimit(type) {
  return OVERSTAY_LIMITS[type?.toUpperCase()] ?? OVERSTAY_LIMITS.OTHER;
}

function getOverstayMins(checkInAt) {
  if (!checkInAt) return 0;
  return Math.floor((Date.now() - new Date(checkInAt).getTime()) / 60000);
}

function isOverstaying(v) {
  // Must be checked in but not checked out
  const checkedIn  = v.checkInAt  || (v.status?.toLowerCase() === "checked_in");
  const checkedOut = v.checkOutAt || (v.status?.toLowerCase() === "checked_out");
  if (!checkedIn || checkedOut) return false;
  const mins  = getOverstayMins(v.checkInAt || v.expectedAt);
  const limit = getLimit(v.visitorType);
  return mins > limit;
}

function formatDuration(mins) {
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hr${h !== 1 ? "s" : ""}`;
}

function getUrgency(overstayMins, limitMins) {
  const ratio = overstayMins / limitMins;
  if (ratio >= 3)   return { color: "#EF4444", bg: "#FEE2E2", darkBg: "#3B0000", label: "Critical",  icon: "alert-octagon" };
  if (ratio >= 1.5) return { color: "#F59E0B", bg: "#FEF3C7", darkBg: "#2D1A00", label: "Warning",   icon: "alert-triangle" };
  return               { color: "#F97316", bg: "#FFEDD5", darkBg: "#2D1000", label: "Overstay",  icon: "alert-circle" };
}

// ── Existing consts ────────────────────────────────────────────
const STATUS_CONF = {
  pending:     { color: "#F59E0B", label: "PNDG" },
  cancelled:   { color: "#EF4444", label: "CNCL" },
  checked_in:  { color: "#10B981", label: "IN" },
  checked_out: { color: "#94A3B8", label: "OUT" },
};
const VISITOR_TYPES  = ["GUEST", "DELIVERY", "CAB_AUTO"];
const TYPE_LABELS    = { GUEST: "Guest", DELIVERY: "Delivery", CAB_AUTO: "Cab/Auto" };
const TYPE_ICONS     = { GUEST: "user", DELIVERY: "package", CAB_AUTO: "truck" };
const TYPE_COLORS    = { Guest: "#3B82F6", Delivery: "#F59E0B", "Cab/Auto": "#10B981" };

function pad(n) { return String(n).padStart(2, "0"); }
function nowDate() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function nowTime() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export default function Visitors() {
  const theme     = useColorScheme() ?? "light";
  const isDark    = theme === "dark";
  const bg        = useThemeColor({}, "background");
  const text      = useThemeColor({}, "text");
  const tint      = useThemeColor({}, "tint");
  const insets    = useSafeAreaInsets();
  const muted     = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg    = isDark ? "#1A1A1A" : "#FFFFFF";
  const fieldBg   = isDark ? "#111111" : "#F8FAFC";

  const [user, setUserState]     = useState(null);
  const [token, setTokenState]   = useState(null);
  const [visitors, setVisitors]  = useState([]);
  const [loading, setLoading]    = useState(true);
  const [showNew, setShowNew]    = useState(false);
  const [from, setFrom]          = useState(nowDate());
  const [to, setTo]              = useState(nowDate());
  const [name, setName]          = useState("");
  const [email, setEmail]        = useState("");
  const [type, setType]          = useState("GUEST");
  const [expectedDate, setExpectedDate] = useState(nowDate());
  const [expectedTime, setExpectedTime] = useState(nowTime());
  const [vehicle, setVehicle]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [showTimePicker, setShowTimePicker]   = useState(false);
  const [showFromPicker, setShowFromPicker]   = useState(false);
  const [showToPicker, setShowToPicker]       = useState(false);
  const [ticker, setTicker] = useState(0); // forces re-render every minute for live durations

  const { toast, showError, showSuccess, hideToast } = useToast();
  const searchParams = useLocalSearchParams();

  // Re-render every 60s so overstay durations stay live
  useEffect(() => {
    const id = setInterval(() => setTicker((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      const [t, u] = await Promise.all([getToken(), getUser()]);
      setTokenState(t);
      setUserState(u);
    })();
  }, []);

  useEffect(() => {
    if (searchParams.visitorType) { setType(searchParams.visitorType); setShowNew(true); }
  }, [searchParams.visitorType]);

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
        to:   new Date(ty, tm-1, td, 23, 59, 59).toISOString(),
      });
      const res = await axios.get(`${config.backendUrl}/resident/visitors?${params}`, { headers: authHeaders });
      setVisitors(Array.isArray(res.data) ? res.data : []);
    } catch { showError("Failed to load visitors"); }
    finally { setLoading(false); }
  }, [user, authHeaders, from, to]);

  useEffect(() => { if (user) load(); }, [user]);

  const createVisitor = async () => {
    if (!name.trim()) { showError("Visitor name is required"); return; }
    if (type === "GUEST" && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showError("Invalid email address"); return;
    }
    setSubmitting(true);
    try {
      const [yr, mo, dy] = expectedDate.split("-").map(Number);
      const [hr, mn]     = expectedTime.split(":").map(Number);
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

  const fmt      = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtShort = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // ── Computed overstay data ─────────────────────────────────────
  const overstayingVisitors = visitors.filter(isOverstaying);
  const overstayCount = overstayingVisitors.length;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>

      {/* ── Header ── */}
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
            <Feather name="arrow-left" size={18} color={text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Visitors</Text>
            <Text style={{ fontSize: 12, color: muted }}>{visitors.length} record{visitors.length !== 1 ? "s" : ""}</Text>
          </View>

          {/* Overstay alert icon in header — only when overstays exist */}
          {overstayCount > 0 && (
            <Pressable
              onPress={() => router.push("/overstay")}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: isDark ? "#3B0000" : "#FEE2E2", marginRight: 4 }}
            >
              <Feather name="alert-triangle" size={13} color="#EF4444" />
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#EF4444" }}>{overstayCount} Overstay</Text>
            </Pressable>
          )}

          <Pressable onPress={() => setShowNew(true)} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: tint }}>
            <Feather name="user-plus" size={14} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>Invite</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Overstay alert banner ── */}
        {overstayCount > 0 && (
          <Pressable
            onPress={() => router.push("/overstay")}
            style={{
              flexDirection: "row", alignItems: "center", gap: 12,
              backgroundColor: isDark ? "#1C1400" : "#FFFBEB",
              borderRadius: 14, borderWidth: 1,
              borderColor: isDark ? "#92400E" : "#FCD34D",
              padding: 14,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? "#3D2000" : "#FEF3C7", alignItems: "center", justifyContent: "center" }}>
              <Feather name="alert-triangle" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#F59E0B" }}>
                {overstayCount} visitor{overstayCount > 1 ? "s" : ""} overstaying
              </Text>
              <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                Tap to view details and ask them to check out
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#F59E0B" />
          </Pressable>
        )}

        {/* ── Date filter ── */}
        <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14, gap: 10 }}>
          <Text style={{ fontSize: 11, color: muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Date Range</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => { setShowToPicker(false); setShowFromPicker(true); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
              <Feather name="calendar" size={13} color={muted} />
              <Text style={{ fontSize: 13, color: text }}>{fmtShort(from)}</Text>
            </Pressable>
            <Text style={{ alignSelf: "center", color: muted }}>—</Text>
            <Pressable onPress={() => { setShowFromPicker(false); setShowToPicker(true); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
              <Feather name="calendar" size={13} color={muted} />
              <Text style={{ fontSize: 13, color: text }}>{fmtShort(to)}</Text>
            </Pressable>
            <Pressable onPress={load} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>Go</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Visitor list ── */}
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={tint} />
          </View>
        ) : visitors.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#06B6D415", alignItems: "center", justifyContent: "center" }}>
              <Feather name="users" size={24} color="#06B6D4" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>No Visitors</Text>
            <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>No visitor records for this period.</Text>
          </View>
        ) : visitors.map((v) => {
          const key        = (v.status || "pending").toLowerCase();
          const sc         = STATUS_CONF[key] || STATUS_CONF.pending;
          const typeLabel  = TYPE_LABELS[v.visitorType] || v.visitorType || "Guest";
          const tc         = TYPE_COLORS[typeLabel] || tint;
          const iconName   = TYPE_ICONS[v.visitorType] || "user";

          // Overstay detection for this card
          const over       = isOverstaying(v);
          const totalMins  = over ? getOverstayMins(v.checkInAt || v.expectedAt) : 0;
          const limitMins  = getLimit(v.visitorType);
          const ovMins     = over ? totalMins - limitMins : 0;
          const urgency    = over ? getUrgency(ovMins, limitMins) : null;

          return (
            <View
              key={v.id}
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                borderWidth: 1,
                // Red left border + highlighted border when overstaying
                borderColor: over ? urgency.color + "50" : borderCol,
                borderLeftWidth: over ? 4 : 1,
                borderLeftColor: over ? urgency.color : borderCol,
                overflow: "hidden",
              }}
            >
              {/* Overstay strip — shown only when overstaying */}
              {over && (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 8,
                  backgroundColor: isDark ? urgency.darkBg : urgency.bg,
                  paddingHorizontal: 14, paddingVertical: 8,
                }}>
                  <Feather name={urgency.icon} size={13} color={urgency.color} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: urgency.color, flex: 1 }}>
                    {urgency.label} · Inside {formatDuration(totalMins)} · Overstay {formatDuration(ovMins)}
                  </Text>
                  <Pressable
                    onPress={() => router.push("/overstay")}
                    style={{ backgroundColor: urgency.color, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFF" }}>Details</Text>
                  </Pressable>
                </View>
              )}

              {/* Card body */}
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tc + "1A", alignItems: "center", justifyContent: "center" }}>
                    <Feather name={iconName} size={18} color={tc} />
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
                    {(v.expectedAt || v.visitDate) && (
                      <Text style={{ fontSize: 11, color: muted, marginTop: 1 }}>
                        {fmt(v.expectedAt || v.visitDate)}
                      </Text>
                    )}
                    {/* Check-in time if available */}
                    {v.checkInAt && (
                      <Text style={{ fontSize: 11, color: "#10B981", marginTop: 1, fontWeight: "500" }}>
                        ↗ Checked in {new Date(v.checkInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── New visitor modal ── */}
      <Modal visible={showNew} animationType="slide" transparent onRequestClose={() => setShowNew(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <ScrollView
            style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%", paddingHorizontal: 20, paddingTop: 20 }}
            keyboardShouldPersistTaps="handled"
          >
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
              { label: "Name *",                                       value: name,   set: setName,   placeholder: "Visitor name" },
              { label: type === "GUEST" ? "Email" : "Contact",        value: email,  set: setEmail,  placeholder: type === "GUEST" ? "visitor@email.com" : "Phone number", keyboardType: type === "GUEST" ? "email-address" : "phone-pad" },
              { label: "Vehicle No.",                                  value: vehicle, set: setVehicle, placeholder: "Optional" },
            ].map(f => (
              <View key={f.label} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 5 }}>{f.label}</Text>
                <TextInput
                  value={f.value} onChangeText={f.set}
                  placeholder={f.placeholder} placeholderTextColor={muted}
                  keyboardType={f.keyboardType || "default"}
                  style={{ backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: text }}
                />
              </View>
            ))}

            {/* Date / Time */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 5 }}>Expected Date</Text>
                <Pressable onPress={() => setShowDatePicker(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
                  <Feather name="calendar" size={13} color={muted} />
                  <Text style={{ fontSize: 13, color: text }}>{fmtShort(expectedDate)}</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 5 }}>Time</Text>
                <Pressable onPress={() => setShowTimePicker(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 10 }}>
                  <Feather name="clock" size={13} color={muted} />
                  <Text style={{ fontSize: 13, color: text }}>{expectedTime}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={createVisitor}
              disabled={submitting}
              style={({ pressed }) => ({ backgroundColor: pressed || submitting ? tint + "CC" : tint, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: insets.bottom + 20 })}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Send Invite</Text>
              }
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Date pickers */}
      {showFromPicker && (
        <DateTimePicker value={new Date(from + "T00:00:00")} mode="date"
          onChange={(e, d) => { setShowFromPicker(false); if (e.type === "set" && d) setFrom(d.toISOString().split("T")[0]); }} />
      )}
      {showToPicker && (
        <DateTimePicker value={new Date(to + "T00:00:00")} mode="date"
          onChange={(e, d) => { setShowToPicker(false); if (e.type === "set" && d) setTo(d.toISOString().split("T")[0]); }} />
      )}
      {showDatePicker && (
        <DateTimePicker value={new Date(expectedDate + "T00:00:00")} mode="date"
          onChange={(e, d) => { setShowDatePicker(false); if (e.type === "set" && d) setExpectedDate(d.toISOString().split("T")[0]); }} />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={(() => { const [h, m] = expectedTime.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0); return d; })()}
          mode="time" is24Hour
          onChange={(e, d) => { setShowTimePicker(false); if (e.type === "set" && d) { setExpectedTime(`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`); } }}
        />
      )}

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}