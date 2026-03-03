// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";

// ── Must match visitors.tsx exactly ───────────────────────────
const OVERSTAY_LIMITS = {
  DELIVERY: 10,
  GUEST:    240,
  STAFF:    600,
  CAB_AUTO: 15,
  OTHER:    120,
};

const TYPE_CONFIG = {
  DELIVERY: { label: "Delivery",  icon: "package",   color: "#3B82F6", bg: "#DBEAFE", darkBg: "#0A1E40" },
  GUEST:    { label: "Guest",     icon: "user",       color: "#8B5CF6", bg: "#EDE9FE", darkBg: "#1E1040" },
  STAFF:    { label: "Staff",     icon: "briefcase",  color: "#F59E0B", bg: "#FEF3C7", darkBg: "#2D1A00" },
  CAB_AUTO: { label: "Cab/Auto",  icon: "navigation", color: "#06B6D4", bg: "#CFFAFE", darkBg: "#002030" },
  OTHER:    { label: "Visitor",   icon: "users",      color: "#6B7280", bg: "#F3F4F6", darkBg: "#1C1C1E" },
};

function pad(n) { return String(n).padStart(2, "0"); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function getLimit(type) {
  return OVERSTAY_LIMITS[type?.toUpperCase()] ?? OVERSTAY_LIMITS.OTHER;
}

function getOverstayMins(checkInAt) {
  if (!checkInAt) return 0;
  return Math.floor((Date.now() - new Date(checkInAt).getTime()) / 60000);
}

// Identical to visitors.tsx isOverstaying()
function isOverstay(v) {
  const checkedIn  = v.checkInAt  || (v.status?.toLowerCase() === "checked_in");
  const checkedOut = v.checkOutAt || (v.status?.toLowerCase() === "checked_out");
  if (!checkedIn || checkedOut) return false;
  const mins  = getOverstayMins(v.checkInAt || v.expectedAt);
  const limit = getLimit(v.visitorType);
  return mins > limit;
}

function isCheckedIn(v) {
  const checkedIn  = v.checkInAt  || (v.status?.toLowerCase() === "checked_in");
  const checkedOut = v.checkOutAt || (v.status?.toLowerCase() === "checked_out");
  return !!(checkedIn && !checkedOut);
}

function formatDuration(mins) {
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hr${h !== 1 ? "s" : ""}`;
}

function formatTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getSeverity(ovMins, limitMins) {
  const ratio = ovMins / limitMins;
  if (ratio >= 3)   return { color: "#EF4444", bg: "#FEE2E2", darkBg: "#3B0000", label: "Critical", icon: "alert-octagon" };
  if (ratio >= 1.5) return { color: "#F59E0B", bg: "#FEF3C7", darkBg: "#2D1A00", label: "Warning",  icon: "alert-triangle" };
  return               { color: "#F97316", bg: "#FFEDD5", darkBg: "#2D1000", label: "Alert",    icon: "alert-circle" };
}

// ── Overstay Card ──────────────────────────────────────────────
function OverstayCard({ visitor, isDark, textColor, muted, borderCol }) {
  const type      = TYPE_CONFIG[visitor.visitorType?.toUpperCase()] || TYPE_CONFIG.OTHER;
  const totalMins = getOverstayMins(visitor.checkInAt || visitor.expectedAt);
  const limitMins = getLimit(visitor.visitorType);
  const ovMins    = totalMins - limitMins;
  const severity  = getSeverity(ovMins, limitMins);
  const cardBg    = isDark ? "#1C1C1E" : "#FFFFFF";

  return (
    <View style={[styles.card, {
      backgroundColor: cardBg,
      borderColor: severity.color + "50",
      borderLeftWidth: 4,
      borderLeftColor: severity.color,
    }]}>
      {/* Header */}
      <View style={styles.cardTop}>
        <View style={[styles.typeIcon, { backgroundColor: isDark ? type.darkBg : type.bg }]}>
          <Feather name={type.icon} size={20} color={type.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.visitorName, { color: textColor }]}>
            {visitor.name || visitor.visitorName || "Visitor"}
          </Text>
          <Text style={[styles.typeLine, { color: muted }]}>{type.label}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: isDark ? severity.darkBg : severity.bg }]}>
          <Feather name={severity.icon} size={11} color={severity.color} />
          <Text style={[styles.severityText, { color: severity.color }]}>{severity.label}</Text>
        </View>
      </View>

      {/* 3-column duration box */}
      <View style={[styles.durationBox, { backgroundColor: isDark ? severity.darkBg : severity.bg }]}>
        <View style={styles.durationRow}>
          <View style={styles.durationItem}>
            <Text style={[styles.durationLabel, { color: severity.color + "99" }]}>INSIDE FOR</Text>
            <Text style={[styles.durationValue, { color: severity.color }]}>{formatDuration(totalMins)}</Text>
          </View>
          <View style={[styles.durationDivider, { backgroundColor: severity.color + "30" }]} />
          <View style={styles.durationItem}>
            <Text style={[styles.durationLabel, { color: severity.color + "99" }]}>OVERSTAY</Text>
            <Text style={[styles.durationValue, { color: severity.color }]}>{formatDuration(ovMins)}</Text>
          </View>
          <View style={[styles.durationDivider, { backgroundColor: severity.color + "30" }]} />
          <View style={styles.durationItem}>
            <Text style={[styles.durationLabel, { color: severity.color + "99" }]}>ALLOWED</Text>
            <Text style={[styles.durationValue, { color: severity.color }]}>{formatDuration(limitMins)}</Text>
          </View>
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {(visitor.checkInAt || visitor.expectedAt) && (
          <View style={styles.metaItem}>
            <Feather name="log-in" size={12} color={muted} />
            <Text style={[styles.metaText, { color: muted }]}>
              Checked in {formatTime(visitor.checkInAt || visitor.expectedAt)}
            </Text>
          </View>
        )}
        {(visitor.contact || visitor.phone) && (
          <View style={styles.metaItem}>
            <Feather name="phone" size={12} color={muted} />
            <Text style={[styles.metaText, { color: muted }]}>{visitor.contact || visitor.phone}</Text>
          </View>
        )}
      </View>

      {/* Action hint */}
      <View style={[styles.actionHint, { backgroundColor: isDark ? "#2C2C2E" : "#F8FAFC", borderColor: borderCol }]}>
        <Feather name="info" size={13} color={muted} />
        <Text style={[styles.actionHintText, { color: muted }]}>
          Please ask your visitor to check out at the gate.
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function ResidentOverstayAlert() {
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
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ticker, setTicker]         = useState(0);

  const { toast, showError, hideToast } = useToast();

  // Re-render every 60s for live durations
  useEffect(() => {
    const id = setInterval(() => setTicker((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const fetchVisitors = useCallback(async () => {
    try {
      const [token, user] = await Promise.all([getToken(), getUser()]);
      if (!user?.id || !user?.communityId) return;

      const today = todayStr();
      const [fy, fm, fd] = today.split("-").map(Number);

      const params = new URLSearchParams({
        communityId: user.communityId,
        userId:      user.id,
        from: new Date(fy, fm-1, fd, 0,  0,  0).toISOString(),
        to:   new Date(fy, fm-1, fd, 23, 59, 59).toISOString(),
      });

      const res = await axios.get(
        `${config.backendUrl}/resident/visitors?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVisitors(Array.isArray(res.data) ? res.data : res.data?.visitors || []);
    } catch { showError("Failed to load visitor data"); }
    finally   { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchVisitors(); }, []);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    fetchVisitors();
  }, [refreshing, fetchVisitors]);

  const checkedInVisitors = useMemo(() => visitors.filter(isCheckedIn),  [visitors, ticker]);
  const overstays = useMemo(() =>
    visitors
      .filter(isOverstay)
      .sort((a, b) =>
        getOverstayMins(b.checkInAt || b.expectedAt) -
        getOverstayMins(a.checkInAt || a.expectedAt)
      ),
    [visitors, ticker]
  );

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>

      {/* ── Header ── */}
      <View style={[styles.header, {
        paddingTop: Math.max(insets.top, 16),
        backgroundColor: pageBg,
        borderBottomColor: borderCol,
      }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: borderCol, backgroundColor: cardBg }]}
          >
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>Overstay Alerts</Text>
            <Text style={[styles.headerSub, { color: muted }]}>Your visitors currently inside</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          style={[styles.refreshBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
        >
          <Feather name="refresh-cw" size={16} color={tint} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={{ color: muted, marginTop: 12, fontSize: 14 }}>Checking your visitors...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, paddingTop: 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#EF4444" />}
        >

          {/* ── Summary cards ── */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.summaryIcon, { backgroundColor: isDark ? "#0A1E40" : "#DBEAFE" }]}>
                <Feather name="users" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.summaryValue, { color: textColor }]}>{checkedInVisitors.length}</Text>
              <Text style={[styles.summaryLabel, { color: muted }]}>Currently Inside</Text>
            </View>

            <View style={[styles.summaryCard, {
              backgroundColor: overstays.length > 0 ? (isDark ? "#1C1400" : "#FFFBEB") : cardBg,
              borderColor:     overstays.length > 0 ? (isDark ? "#92400E" : "#FCD34D") : borderCol,
            }]}>
              <View style={[styles.summaryIcon, { backgroundColor: isDark ? "#3B0000" : "#FEE2E2" }]}>
                <Feather name="alert-triangle" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.summaryValue, { color: overstays.length > 0 ? "#EF4444" : textColor }]}>
                {overstays.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: muted }]}>Overstaying</Text>
            </View>
          </View>

          {/* ── Alert banner ── */}
          {overstays.length > 0 && (
            <View style={[styles.alertBanner, {
              backgroundColor: isDark ? "#1C1400" : "#FEF3C7",
              borderColor:     isDark ? "#92400E" : "#F59E0B",
            }]}>
              <Feather name="bell" size={16} color="#F59E0B" />
              <Text style={[styles.alertBannerText, { color: isDark ? "#FCD34D" : "#92400E" }]}>
                {overstays.length} of your visitor{overstays.length > 1 ? "s have" : " has"} exceeded
                the allowed time. Please ask them to check out.
              </Text>
            </View>
          )}

          {/* ── Overstay list or All Clear ── */}
          {overstays.length === 0 ? (
            <View style={[styles.allClearCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.allClearIcon, { backgroundColor: isDark ? "#002A1A" : "#D1FAE5" }]}>
                <Feather name="check-circle" size={36} color="#10B981" />
              </View>
              <Text style={[styles.allClearTitle, { color: textColor }]}>All Clear!</Text>
              <Text style={[styles.allClearDesc, { color: muted }]}>
                {checkedInVisitors.length > 0
                  ? `You have ${checkedInVisitors.length} visitor${checkedInVisitors.length > 1 ? "s" : ""} inside, all within allowed time.`
                  : "No visitors currently inside your premises."}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Overstaying Visitors</Text>
              <View style={{ gap: 12 }}>
                {overstays.map((visitor) => (
                  <OverstayCard
                    key={visitor.id}
                    visitor={visitor}
                    isDark={isDark}
                    textColor={textColor}
                    muted={muted}
                    borderCol={borderCol}
                  />
                ))}
              </View>
            </>
          )}

          {/* ── Allowed time limits reference ── */}
          <View style={[styles.limitsCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Feather name="clock" size={14} color={tint} />
              <Text style={[styles.limitsTitle, { color: textColor }]}>Allowed Time Limits</Text>
            </View>
            {Object.entries(OVERSTAY_LIMITS).map(([type, mins], i, arr) => {
              const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.OTHER;
              return (
                <View key={type} style={[styles.limitRow, {
                  borderBottomColor: borderCol,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                }]}>
                  <View style={[styles.limitIcon, { backgroundColor: isDark ? cfg.darkBg : cfg.bg }]}>
                    <Feather name={cfg.icon} size={13} color={cfg.color} />
                  </View>
                  <Text style={[styles.limitLabel, { color: textColor }]}>{cfg.label}</Text>
                  <Text style={[styles.limitValue, { color: cfg.color }]}>{formatDuration(mins)}</Text>
                </View>
              );
            })}
          </View>

        </ScrollView>
      )}

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  header:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerLeft:      { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:         { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle:     { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  headerSub:       { fontSize: 12, marginTop: 1 },
  refreshBtn:      { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  summaryCard:     { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, alignItems: "center", gap: 8 },
  summaryIcon:     { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  summaryValue:    { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  summaryLabel:    { fontSize: 12, fontWeight: "500" },
  alertBanner:     { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  alertBannerText: { fontSize: 13, fontWeight: "500", flex: 1, lineHeight: 20 },
  sectionTitle:    { fontSize: 16, fontWeight: "700" },
  card:            { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  cardTop:         { flexDirection: "row", alignItems: "center", gap: 12 },
  typeIcon:        { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  visitorName:     { fontSize: 15, fontWeight: "700" },
  typeLine:        { fontSize: 12, marginTop: 2 },
  severityBadge:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  severityText:    { fontSize: 11, fontWeight: "700" },
  durationBox:     { borderRadius: 12, padding: 14 },
  durationRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  durationItem:    { alignItems: "center", gap: 4 },
  durationLabel:   { fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  durationValue:   { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  durationDivider: { width: 1, height: 36 },
  metaRow:         { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem:        { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText:        { fontSize: 12 },
  actionHint:      { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  actionHintText:  { fontSize: 12, flex: 1, lineHeight: 18 },
  allClearCard:    { borderRadius: 18, borderWidth: 1, padding: 40, alignItems: "center", gap: 12 },
  allClearIcon:    { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  allClearTitle:   { fontSize: 20, fontWeight: "800" },
  allClearDesc:    { fontSize: 13, textAlign: "center", lineHeight: 20 },
  limitsCard:      { borderRadius: 16, borderWidth: 1, padding: 16 },
  limitsTitle:     { fontSize: 14, fontWeight: "700" },
  limitRow:        { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  limitIcon:       { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  limitLabel:      { flex: 1, fontSize: 14, fontWeight: "500" },
  limitValue:      { fontSize: 14, fontWeight: "700" },
});