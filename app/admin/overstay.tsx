// @ts-nocheck
// app/admin/overstay.tsx
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { getCommunityId, getToken } from "@/lib/auth";
import { config } from "@/lib/config";
import {
    DEFAULT_OVERSTAY_LIMITS,
    fetchOvstayLimits,
    formatDuration,
} from "@/lib/overstayLimits";

// ── Visitor type UI config ─────────────────────────────────────
const TYPE_CONFIG = {
  DELIVERY: { label: "Delivery",  icon: "package",   color: "#3B82F6", bg: "#DBEAFE", darkBg: "#0A1E40" },
  GUEST:    { label: "Guest",     icon: "user",       color: "#8B5CF6", bg: "#EDE9FE", darkBg: "#1E1040" },
  STAFF:    { label: "Staff",     icon: "briefcase",  color: "#F59E0B", bg: "#FEF3C7", darkBg: "#2D1A00" },
  CAB_AUTO: { label: "Cab/Auto",  icon: "navigation", color: "#06B6D4", bg: "#CFFAFE", darkBg: "#002030" },
  OTHER:    { label: "Visitor",   icon: "users",      color: "#6B7280", bg: "#F3F4F6", darkBg: "#1C1C1E" },
};

// ── Helpers ────────────────────────────────────────────────────
function getOverstayMins(checkInAt) {
  if (!checkInAt) return 0;
  return Math.floor((Date.now() - new Date(checkInAt).getTime()) / 60000);
}

function getLimit(limits, type) {
  return limits[type?.toUpperCase()] ?? limits.OTHER ?? DEFAULT_OVERSTAY_LIMITS.OTHER;
}

function isOverstay(visitor, limits) {
  if (!visitor.checkInAt || visitor.checkOutAt) return false;
  return getOverstayMins(visitor.checkInAt) > getLimit(limits, visitor.visitorType);
}

function formatTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getUrgency(ovMins, limitMins) {
  const ratio = ovMins / limitMins;
  if (ratio >= 3)   return { color: "#EF4444", bg: "#FEE2E2", darkBg: "#3B0000", label: "Critical" };
  if (ratio >= 1.5) return { color: "#F59E0B", bg: "#FEF3C7", darkBg: "#2D1A00", label: "High" };
  return               { color: "#F97316", bg: "#FFEDD5", darkBg: "#2D1000", label: "Alert" };
}

// ── Overstay Card ──────────────────────────────────────────────
function OverstayCard({ visitor, limits, isDark, textColor, muted, borderCol, onDismiss }) {
  const type       = TYPE_CONFIG[visitor.visitorType?.toUpperCase()] || TYPE_CONFIG.OTHER;
  const totalMins  = getOverstayMins(visitor.checkInAt);
  const limitMins  = getLimit(limits, visitor.visitorType);
  const ovMins     = totalMins - limitMins;
  const urgency    = getUrgency(ovMins, limitMins);
  const cardBg     = isDark ? "#1C1C1E" : "#FFFFFF";

  return (
    <View style={[styles.card, {
      backgroundColor: cardBg,
      borderColor: urgency.color + "50",
      borderLeftWidth: 4,
      borderLeftColor: urgency.color,
    }]}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.typeIcon, { backgroundColor: isDark ? type.darkBg : type.bg }]}>
          <Feather name={type.icon} size={18} color={type.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.visitorName, { color: textColor }]} numberOfLines={1}>
              {visitor.name}
            </Text>
            <View style={[styles.urgencyBadge, { backgroundColor: isDark ? urgency.darkBg : urgency.bg }]}>
              <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
            </View>
          </View>
          <Text style={[styles.typeLine, { color: muted }]}>
            {type.label}
            {visitor.user?.name ? ` · Visiting ${visitor.user.name}` : ""}
            {visitor.user?.unit?.number ? ` · Unit ${visitor.user.unit.number}` : ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onDismiss(visitor.id)}
          style={[styles.dismissBtn, { borderColor: borderCol }]}
        >
          <Feather name="x" size={14} color={muted} />
        </TouchableOpacity>
      </View>

      {/* Duration strip */}
      <View style={[styles.durationStrip, { backgroundColor: isDark ? urgency.darkBg : urgency.bg }]}>
        <Feather name="clock" size={13} color={urgency.color} />
        <Text style={[styles.durationText, { color: urgency.color }]}>
          Inside for <Text style={{ fontWeight: "800" }}>{formatDuration(totalMins)}</Text>
          {"  ·  "}Overstay: <Text style={{ fontWeight: "800" }}>{formatDuration(ovMins)}</Text>
          {"  ·  "}Limit: {formatDuration(limitMins)}
        </Text>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Feather name="log-in" size={12} color={muted} />
          <Text style={[styles.metaText, { color: muted }]}>Checked in {formatTime(visitor.checkInAt)}</Text>
        </View>
        {visitor.contact && (
          <View style={styles.metaItem}>
            <Feather name="phone" size={12} color={muted} />
            <Text style={[styles.metaText, { color: muted }]}>{visitor.contact}</Text>
          </View>
        )}
        {visitor.vehicleNo && (
          <View style={styles.metaItem}>
            <Feather name="truck" size={12} color={muted} />
            <Text style={[styles.metaText, { color: muted }]}>{visitor.vehicleNo}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Tab Button ─────────────────────────────────────────────────
function TabBtn({ label, count, active, onPress, isDark, muted }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabBtn, {
        backgroundColor: active ? "#EF4444" : (isDark ? "#2C2C2E" : "#F1F5F9"),
      }]}
    >
      <Text style={[styles.tabBtnText, { color: active ? "#FFF" : muted }]}>{label}</Text>
      {count > 0 && (
        <View style={[styles.tabCount, {
          backgroundColor: active ? "rgba(255,255,255,0.25)" : "#EF444420",
        }]}>
          <Text style={[styles.tabCountText, { color: active ? "#FFF" : "#EF4444" }]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function AdminOverstayAlert() {
  const theme     = useColorScheme() ?? "light";
  const isDark    = theme === "dark";
  const bg        = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint      = useThemeColor({}, "tint");
  const muted     = isDark ? "#8E8E93" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const insets    = useSafeAreaInsets();
  const pageBg    = isDark ? "#111111" : "#F2F2F7";
  const cardBg    = isDark ? "#1C1C1E" : "#FFFFFF";

  const [visitors, setVisitors]     = useState([]);
  const [limits, setLimits]         = useState({ ...DEFAULT_OVERSTAY_LIMITS });
  const [dismissed, setDismissed]   = useState(new Set());
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState("ALL");
  const [ticker, setTicker]         = useState(0);

  const { toast, showSuccess, showError, hideToast } = useToast();
  const url = config.backendUrl;

  // Refresh durations every 60s
  useEffect(() => {
    const id = setInterval(() => setTicker((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Reload limits when screen comes back into focus (after editing settings)
  const loadLimits = useCallback(async () => {
    const data = await fetchOvstayLimits();
    setLimits(data);
  }, []);

  const fetchVisitors = useCallback(async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      const today = new Date().toISOString().split("T")[0];
      const res = await axios.get(`${url}/admin/visitor`, {
        headers: { Authorization: `Bearer ${token}` },
        params:  { communityId, from: today, to: today },
      });
      setVisitors(res.data.visitors || []);
    } catch { showError("Failed to load visitor data"); }
    finally   { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    Promise.all([loadLimits(), fetchVisitors()]);
  }, []);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    // Reload limits too on pull-to-refresh
    Promise.all([loadLimits(), fetchVisitors()]);
  }, [refreshing]);

  const handleDismiss = (id) => {
    setDismissed((prev) => new Set([...prev, id]));
    showSuccess("Alert dismissed");
  };

  // ── Computed ────────────────────────────────────────────────
  const allOverstays = visitors.filter(
    (v) => isOverstay(v, limits) && !dismissed.has(v.id)
  );

  const byType = {
    ALL:      allOverstays,
    DELIVERY: allOverstays.filter((v) => v.visitorType === "DELIVERY"),
    GUEST:    allOverstays.filter((v) => v.visitorType === "GUEST"),
    STAFF:    allOverstays.filter((v) => v.visitorType === "STAFF"),
    CAB_AUTO: allOverstays.filter((v) => v.visitorType === "CAB_AUTO"),
  };

  const displayed = byType[activeTab] || allOverstays;
  const sorted = [...displayed].sort(
    (a, b) => getOverstayMins(b.checkInAt) - getOverstayMins(a.checkInAt)
  );

  const TABS = [
    { key: "ALL",      label: "All" },
    { key: "DELIVERY", label: "Delivery" },
    { key: "GUEST",    label: "Guests" },
    { key: "STAFF",    label: "Staff" },
    { key: "CAB_AUTO", label: "Cab/Auto" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>

      {/* ── Header ── */}
      <View style={[styles.header, {
        paddingTop: Math.max(insets.top, 16),
        backgroundColor: pageBg,
        borderBottomColor: borderCol,
      }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: borderCol, backgroundColor: cardBg }]}>
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>Overstay Alerts</Text>
            <Text style={[styles.headerSub, { color: muted }]}>
              {loading ? "Loading..." : `${allOverstays.length} active alert${allOverstays.length !== 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>

        {/* Header right: settings + refresh */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push("/admin/overstay-settings")}
            style={[styles.iconBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
          >
            <Feather name="sliders" size={16} color={tint} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRefresh}
            style={[styles.iconBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
          >
            <Feather name="refresh-cw" size={16} color={tint} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingHorizontal: 16, paddingVertical: 10 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {TABS.map((tab) => (
          <TabBtn
            key={tab.key}
            label={tab.label}
            count={byType[tab.key]?.length || 0}
            active={activeTab === tab.key}
            onPress={() => setActiveTab(tab.key)}
            isDark={isDark}
            muted={muted}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={{ color: muted, marginTop: 12, fontSize: 14 }}>Checking for overstays...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#EF4444" />}
        >

          {/* Summary strip */}
          {allOverstays.length > 0 && (
            <View style={[styles.summaryStrip, {
              backgroundColor: isDark ? "#1C1400" : "#FFFBEB",
              borderColor: isDark ? "#92400E" : "#FCD34D",
            }]}>
              <Feather name="alert-triangle" size={18} color="#F59E0B" />
              <Text style={[styles.summaryText, { color: isDark ? "#FCD34D" : "#92400E" }]}>
                {[
                  byType.DELIVERY.length > 0 ? `${byType.DELIVERY.length} delivery` : "",
                  byType.GUEST.length > 0    ? `${byType.GUEST.length} guest`    : "",
                  byType.STAFF.length > 0    ? `${byType.STAFF.length} staff`    : "",
                  byType.CAB_AUTO.length > 0 ? `${byType.CAB_AUTO.length} cab`   : "",
                ].filter(Boolean).join(" · ")} overstaying right now
              </Text>
            </View>
          )}

          {/* Stat cards — 2x2 grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[
              { label: "Total Overstays", value: allOverstays.length,    color: "#EF4444", darkBg: "#3B0000", lightBg: "#FEE2E2", icon: "alert-circle" },
              { label: "Delivery",        value: byType.DELIVERY.length, color: "#3B82F6", darkBg: "#0A1E40", lightBg: "#DBEAFE", icon: "package" },
              { label: "Guests",          value: byType.GUEST.length,    color: "#8B5CF6", darkBg: "#1E1040", lightBg: "#EDE9FE", icon: "user" },
              { label: "Staff",           value: byType.STAFF.length,    color: "#F59E0B", darkBg: "#2D1A00", lightBg: "#FEF3C7", icon: "briefcase" },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol, width: "48%" }]}>
                <View style={[styles.statIcon, { backgroundColor: isDark ? s.darkBg : s.lightBg }]}>
                  <Feather name={s.icon} size={14} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: muted }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Overstay limits — tappable to edit */}
          <TouchableOpacity
            onPress={() => router.push("/admin/overstay-settings")}
            style={[styles.limitsCard, { backgroundColor: cardBg, borderColor: borderCol }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Feather name="sliders" size={14} color={tint} />
              <Text style={[styles.limitsTitle, { color: textColor }]}>Overstay Limits</Text>
              <View style={{ flex: 1 }} />
              <View style={[styles.editChip, { backgroundColor: isDark ? "#2C2C2E" : "#F1F5F9" }]}>
                <Feather name="edit-2" size={11} color={muted} />
                <Text style={[styles.editChipText, { color: muted }]}>Edit Limits</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(limits).map(([type, mins]) => {
                const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.OTHER;
                return (
                  <View key={type} style={[styles.limitChip, { backgroundColor: isDark ? cfg.darkBg : cfg.bg }]}>
                    <Feather name={cfg.icon} size={11} color={cfg.color} />
                    <Text style={[styles.limitChipText, { color: cfg.color }]}>
                      {cfg.label}: {formatDuration(mins)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>

          {/* List */}
          {sorted.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? "#1A2A1A" : "#D1FAE5" }]}>
                <Feather name="check-circle" size={32} color="#10B981" />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>All Clear!</Text>
              <Text style={[styles.emptyDesc, { color: muted }]}>
                {activeTab === "ALL"
                  ? "No visitors have exceeded their allowed time."
                  : `No ${activeTab.toLowerCase()} overstays right now.`}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {sorted.map((visitor) => (
                <OverstayCard
                  key={visitor.id}
                  visitor={visitor}
                  limits={limits}
                  isDark={isDark}
                  textColor={textColor}
                  muted={muted}
                  borderCol={borderCol}
                  onDismiss={handleDismiss}
                />
              ))}
            </View>
          )}

        </ScrollView>
      )}

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:       { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle:   { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  headerSub:     { fontSize: 12, marginTop: 1 },
  iconBtn:       { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  tabBtn:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, gap: 6 },
  tabBtnText:    { fontSize: 13, fontWeight: "600" },
  tabCount:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  tabCountText:  { fontSize: 10, fontWeight: "700" },
  summaryStrip:  { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  summaryText:   { fontSize: 13, fontWeight: "600", flex: 1 },
  statCard:      { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4, alignItems: "center" },
  statIcon:      { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue:     { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  statLabel:     { fontSize: 11, fontWeight: "500", textAlign: "center", marginTop: 2 },
  limitsCard:    { borderRadius: 14, borderWidth: 1, padding: 14 },
  limitsTitle:   { fontSize: 14, fontWeight: "600" },
  editChip:      { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  editChipText:  { fontSize: 11, fontWeight: "600" },
  limitChip:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  limitChipText: { fontSize: 11, fontWeight: "600" },
  card:          { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardTop:       { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  typeIcon:      { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  visitorName:   { fontSize: 15, fontWeight: "700" },
  typeLine:      { fontSize: 12, marginTop: 2 },
  urgencyBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgencyText:   { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  dismissBtn:    { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  durationStrip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  durationText:  { fontSize: 12, fontWeight: "600", flex: 1 },
  metaRow:       { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem:      { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText:      { fontSize: 12 },
  emptyCard:     { borderRadius: 16, borderWidth: 1, padding: 40, alignItems: "center", gap: 12 },
  emptyIcon:     { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle:    { fontSize: 18, fontWeight: "700" },
  emptyDesc:     { fontSize: 13, textAlign: "center", lineHeight: 20 },
});