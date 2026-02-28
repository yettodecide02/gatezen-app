// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

// Overstay limits — must match admin-overstay.tsx
const OVERSTAY_LIMITS = {
  DELIVERY: 10,
  GUEST:    240,
  STAFF:    600,
  CAB_AUTO: 15,
  OTHER:    120,
};

function getOverstayCount(visitors) {
  return visitors.filter((v) => {
    if (!v.checkInAt || v.checkOutAt) return false;
    const mins = Math.floor((Date.now() - new Date(v.checkInAt).getTime()) / 60000);
    const limit = OVERSTAY_LIMITS[v.visitorType?.toUpperCase()] ?? OVERSTAY_LIMITS.OTHER;
    return mins > limit;
  }).length;
}

function getVisitorTypeConfig(type) {
  switch (type) {
    case "DELIVERY": return { bg: "#DBEAFE", text: "#1E40AF", icon: "truck" };
    case "GUEST":    return { bg: "#D1FAE5", text: "#065F46", icon: "user" };
    case "CAB_AUTO": return { bg: "#FEF3C7", text: "#92400E", icon: "navigation" };
    default:         return { bg: "#F3F4F6", text: "#374151", icon: "user" };
  }
}

function getStatusConfig(checkIn, checkOut) {
  if (!checkIn)             return { bg: "#F3F4F6", text: "#374151", label: "Pending",     icon: "clock" };
  if (checkIn && !checkOut) return { bg: "#D1FAE5", text: "#065F46", label: "Checked In",  icon: "log-in" };
  return                           { bg: "#F3F4F6", text: "#374151", label: "Checked Out", icon: "log-out" };
}

export default function VisitorLog() {
  const theme    = useColorScheme() ?? "light";
  const isDark   = theme === "dark";
  const bg       = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint     = useThemeColor({}, "tint");
  const muted    = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg   = isDark ? "#1A1A1A" : "#FFFFFF";
  const insets   = useSafeAreaInsets();

  const [visitors, setVisitors]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [searchTerm, setSearchTerm]     = useState("");
  const [typeFilter, setTypeFilter]     = useState("ALL");
  const [unitFilter, setUnitFilter]     = useState("ALL");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate]         = useState(today);
  const [toDate, setToDate]             = useState(today);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState("from");

  const { toast, showError, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => { fetchVisitors(); }, [fromDate, toDate]);

  const fetchVisitors = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      const res = await axios.get(`${url}/admin/visitor`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId, from: fromDate, to: toDate },
      });
      setVisitors(res.data.visitors || []);
    } catch (e) { showError("Failed to load visitor log"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleRefresh = () => { setRefreshing(true); fetchVisitors(); };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      const ds = selectedDate.toISOString().split("T")[0];
      if (datePickerMode === "from") setFromDate(ds);
      else setToDate(ds);
    }
  };

  const openDatePicker = (mode) => { setDatePickerMode(mode); setShowDatePicker(true); };

  const formatDate = (d) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };
  const formatTime = (d) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const uniqueUnits = [...new Set(visitors.map((v) => v.user?.unit?.number).filter(Boolean))];

  const filteredVisitors = visitors.filter((v) => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || v.name.toLowerCase().includes(s) || v.contact?.includes(s) || v.vehicleNo?.toLowerCase().includes(s) || v.user?.name?.toLowerCase().includes(s) || v.user?.unit?.number?.toLowerCase().includes(s);
    const matchType = typeFilter === "ALL" || v.visitorType === typeFilter;
    const matchUnit = unitFilter === "ALL" || v.user?.unit?.number === unitFilter;
    return matchSearch && matchType && matchUnit;
  });

  const stats = {
    total:      filteredVisitors.length,
    checkedIn:  filteredVisitors.filter((v) => v.checkInAt && !v.checkOutAt).length,
    checkedOut: filteredVisitors.filter((v) => v.checkOutAt).length,
    pending:    filteredVisitors.filter((v) => !v.checkInAt).length,
  };

  // Live overstay count badge for header button
  const overstayCount = getOverstayCount(visitors);

  const inputBg     = isDark ? "#252525" : "#F8FAFC";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={tint} />
        <Text style={{ fontSize: 14, color: muted, marginTop: 12 }}>Loading visitor log...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>

      {/* ── Header ── */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 20), borderBottomColor: borderCol, backgroundColor: bg }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: borderCol }]}>
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>Visitor Log</Text>
            <Text style={[styles.headerSub, { color: muted }]}>Track all visitors</Text>
          </View>
        </View>

        {/* Overstay Alert button — shows badge if any overstays */}
        <TouchableOpacity
          onPress={() => router.push("/admin/overstay")}
          style={[styles.overstayBtn, {
            backgroundColor: overstayCount > 0 ? "#EF4444" : (isDark ? "#2C2C2E" : "#F1F5F9"),
            borderColor: overstayCount > 0 ? "#EF4444" : borderCol,
          }]}
        >
          <Feather
            name="alert-triangle"
            size={15}
            color={overstayCount > 0 ? "#FFFFFF" : muted}
          />
          <Text style={[styles.overstayBtnText, {
            color: overstayCount > 0 ? "#FFFFFF" : muted,
          }]}>
            {overstayCount > 0 ? `${overstayCount} Overstay` : "Overstay"}
          </Text>
          {overstayCount > 0 && (
            <View style={styles.overstayDot} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tint} />}
      >
        <View style={styles.content}>

          {/* Overstay alert banner — only shown when there are active overstays */}
          {overstayCount > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/admin/overstay")}
              style={[styles.overstayBanner, {
                backgroundColor: isDark ? "#1C1400" : "#FFFBEB",
                borderColor: isDark ? "#92400E" : "#FCD34D",
              }]}
            >
              <View style={[styles.overstayBannerIcon, { backgroundColor: isDark ? "#3D2000" : "#FEF3C7" }]}>
                <Feather name="alert-triangle" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.overstayBannerTitle, { color: "#F59E0B" }]}>
                  {overstayCount} visitor{overstayCount > 1 ? "s" : ""} overstaying
                </Text>
                <Text style={[styles.overstayBannerSub, { color: muted }]}>
                  Tap to review and take action
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color="#F59E0B" />
            </TouchableOpacity>
          )}

          {/* Stats */}
          <View style={styles.statsGrid}>
            {[
              { label: "Total",       value: stats.total,      icon: "users",    color: "#6366F1" },
              { label: "Checked In",  value: stats.checkedIn,  icon: "log-in",   color: "#10B981" },
              { label: "Checked Out", value: stats.checkedOut, icon: "log-out",  color: "#64748B" },
              { label: "Pending",     value: stats.pending,    icon: "clock",    color: "#F59E0B" },
            ].map((item) => (
              <View key={item.label} style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.statIconWrap, { backgroundColor: item.color + "1A" }]}>
                  <Feather name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={[styles.statValue, { color: textColor }]}>{item.value}</Text>
                <Text style={[styles.statLabel, { color: muted }]}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Filter Card */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <TouchableOpacity style={styles.filterToggle} onPress={() => setFiltersExpanded((v) => !v)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Feather name="filter" size={16} color={tint} />
                <Text style={[styles.filterTitle, { color: textColor }]}>Filters</Text>
                {(searchTerm || typeFilter !== "ALL" || unitFilter !== "ALL") && (
                  <View style={[styles.filterActiveDot, { backgroundColor: tint }]} />
                )}
              </View>
              <Feather name={filtersExpanded ? "chevron-up" : "chevron-down"} size={16} color={muted} />
            </TouchableOpacity>

            {filtersExpanded && (
              <View style={{ gap: 14, marginTop: 4 }}>
                <View>
                  <Text style={[styles.inputLabel, { color: muted }]}>SEARCH</Text>
                  <View style={styles.searchWrap}>
                    <Feather name="search" size={15} color={muted} style={{ position: "absolute", left: 12, zIndex: 1 }} />
                    <TextInput
                      style={[styles.searchInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                      value={searchTerm} onChangeText={setSearchTerm}
                      placeholder="Name, contact, vehicle..." placeholderTextColor={muted}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: muted }]}>FROM DATE</Text>
                    <TouchableOpacity style={[styles.dateBtn, { backgroundColor: inputBg, borderColor: inputBorder }]} onPress={() => openDatePicker("from")}>
                      <Feather name="calendar" size={14} color={muted} />
                      <Text style={{ color: textColor, fontSize: 13 }}>{fromDate}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: muted }]}>TO DATE</Text>
                    <TouchableOpacity style={[styles.dateBtn, { backgroundColor: inputBg, borderColor: inputBorder }]} onPress={() => openDatePicker("to")}>
                      <Feather name="calendar" size={14} color={muted} />
                      <Text style={{ color: textColor, fontSize: 13 }}>{toDate}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={datePickerMode === "from" ? new Date(fromDate) : new Date(toDate)}
                    mode="date" display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange} maximumDate={new Date()}
                  />
                )}
                {Platform.OS === "ios" && showDatePicker && (
                  <TouchableOpacity style={[styles.iosDoneBtn, { backgroundColor: tint }]} onPress={() => setShowDatePicker(false)}>
                    <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Done</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: muted }]}>VISITOR TYPE</Text>
                    <View style={[styles.pickerWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                      <Picker selectedValue={typeFilter} onValueChange={setTypeFilter} style={{ color: textColor }}>
                        <Picker.Item label="All Types" value="ALL" />
                        <Picker.Item label="Guest" value="GUEST" />
                        <Picker.Item label="Delivery" value="DELIVERY" />
                        <Picker.Item label="Cab / Auto" value="CAB_AUTO" />
                      </Picker>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: muted }]}>UNIT</Text>
                    <View style={[styles.pickerWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                      <Picker selectedValue={unitFilter} onValueChange={setUnitFilter} style={{ color: textColor }}>
                        <Picker.Item label="All Units" value="ALL" />
                        {uniqueUnits.map((u) => <Picker.Item key={u} label={`Unit ${u}`} value={u} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: tint }]} onPress={handleRefresh}>
                  <Feather name="refresh-cw" size={14} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Apply & Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Visitors List */}
          {filteredVisitors.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Feather name="users" size={36} color={muted} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No visitors found</Text>
              <Text style={[styles.emptyDesc, { color: muted }]}>Try adjusting your date range or filters</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredVisitors.map((visitor) => {
                const typeConfig   = getVisitorTypeConfig(visitor.visitorType);
                const statusConfig = getStatusConfig(visitor.checkInAt, visitor.checkOutAt);

                // Highlight card if this visitor is overstaying
                const visitorMins  = visitor.checkInAt && !visitor.checkOutAt
                  ? Math.floor((Date.now() - new Date(visitor.checkInAt).getTime()) / 60000)
                  : 0;
                const visitorLimit = OVERSTAY_LIMITS[visitor.visitorType?.toUpperCase()] ?? OVERSTAY_LIMITS.OTHER;
                const isOver       = visitorMins > visitorLimit;

                return (
                  <View
                    key={visitor.id}
                    style={[
                      styles.vCard,
                      {
                        backgroundColor: cardBg,
                        borderColor: isOver ? "#EF444460" : borderCol,
                        borderLeftWidth: isOver ? 4 : 1,
                        borderLeftColor: isOver ? "#EF4444" : borderCol,
                      },
                    ]}
                  >
                    {/* Overstay indicator row */}
                    {isOver && (
                      <View style={[styles.overstayRow, { backgroundColor: isDark ? "#3B0000" : "#FEE2E2" }]}>
                        <Feather name="alert-triangle" size={12} color="#EF4444" />
                        <Text style={styles.overstayRowText}>
                          Overstaying by {Math.floor(visitorMins - visitorLimit)} min
                          {visitorMins - visitorLimit > 1 ? "s" : ""}
                        </Text>
                      </View>
                    )}

                    {/* Header row */}
                    <View style={styles.vCardTop}>
                      <View style={[styles.vIconWrap, { backgroundColor: typeConfig.bg }]}>
                        <Feather name={typeConfig.icon} size={18} color={typeConfig.text} />
                      </View>
                      <View style={styles.vCardInfo}>
                        <Text style={[styles.vName, { color: textColor }]}>{visitor.name}</Text>
                        <View style={[styles.typePill, { backgroundColor: typeConfig.bg }]}>
                          <Text style={[styles.typePillText, { color: typeConfig.text }]}>{visitor.visitorType?.replace("_", " ")}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
                        <Feather name={statusConfig.icon} size={11} color={statusConfig.text} />
                        <Text style={[styles.statusPillText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
                      </View>
                    </View>

                    {/* Visiting info */}
                    <View style={[styles.visitingBanner, { backgroundColor: isDark ? "#1a2332" : "#EEF2FF", borderColor: isDark ? "#2d3748" : "#C7D2FE" }]}>
                      <Feather name="home" size={12} color={muted} />
                      <Text style={[styles.visitingText, { color: muted }]}>
                        Visiting <Text style={{ fontWeight: "700", color: textColor }}>{visitor.user?.name ?? "Unknown"}</Text>
                        {visitor.user?.unit ? ` • Unit ${visitor.user.unit.number}` : ""}
                      </Text>
                    </View>

                    {/* Details row */}
                    <View style={styles.vDetails}>
                      <View style={styles.vDetailItem}>
                        <Feather name="calendar" size={12} color={muted} />
                        <Text style={[styles.vDetailText, { color: muted }]}>{formatDate(visitor.visitDate)}</Text>
                      </View>
                      {visitor.contact && (
                        <View style={styles.vDetailItem}>
                          <Feather name="phone" size={12} color={muted} />
                          <Text style={[styles.vDetailText, { color: muted }]}>{visitor.contact}</Text>
                        </View>
                      )}
                      {visitor.vehicleNo && (
                        <View style={styles.vDetailItem}>
                          <Feather name="truck" size={12} color={muted} />
                          <Text style={[styles.vDetailText, { color: muted }]}>{visitor.vehicleNo}</Text>
                        </View>
                      )}
                    </View>

                    {/* Check-in/out times */}
                    <View style={[styles.vTimes, { borderTopColor: borderCol }]}>
                      <View style={styles.vTimeItem}>
                        <View style={[styles.vTimeIcon, { backgroundColor: visitor.checkInAt ? "#D1FAE5" : borderCol }]}>
                          <Feather name="log-in" size={13} color={visitor.checkInAt ? "#065F46" : muted} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 10, color: muted }}>Check In</Text>
                          <Text style={{ fontSize: 13, fontWeight: "500", color: visitor.checkInAt ? textColor : muted }}>
                            {visitor.checkInAt ? formatTime(visitor.checkInAt) : "Not yet"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.vTimeItem}>
                        <View style={[styles.vTimeIcon, { backgroundColor: visitor.checkOutAt ? "#E5E7EB" : borderCol }]}>
                          <Feather name="log-out" size={13} color={visitor.checkOutAt ? "#374151" : muted} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 10, color: muted }}>Check Out</Text>
                          <Text style={{ fontSize: 13, fontWeight: "500", color: visitor.checkOutAt ? textColor : muted }}>
                            {visitor.checkOutAt ? formatTime(visitor.checkOutAt) : "Not yet"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  headerBar:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerLeft:         { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:            { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle:        { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  headerSub:          { fontSize: 12, marginTop: 1 },
  // Overstay button in header
  overstayBtn:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  overstayBtnText:    { fontSize: 12, fontWeight: "700" },
  overstayDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  // Overstay banner inside list
  overstayBanner:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  overstayBannerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  overstayBannerTitle:{ fontSize: 14, fontWeight: "700", color: "#F59E0B" },
  overstayBannerSub:  { fontSize: 12, marginTop: 2 },
  // Overstay row on card
  overstayRow:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 10 },
  overstayRowText:    { fontSize: 12, fontWeight: "600", color: "#EF4444" },
  scroll:             { flex: 1 },
  content:            { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 12 },
  statsGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard:           { width: "48%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  statIconWrap:       { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue:          { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel:          { fontSize: 12, fontWeight: "500" },
  card:               { borderRadius: 16, borderWidth: 1, padding: 16 },
  filterToggle:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  filterTitle:        { fontSize: 15, fontWeight: "600" },
  filterActiveDot:    { width: 7, height: 7, borderRadius: 4 },
  inputLabel:         { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 7, textTransform: "uppercase" },
  searchWrap:         { position: "relative" },
  searchInput:        { borderWidth: 1, borderRadius: 10, paddingLeft: 38, paddingRight: 14, paddingVertical: 11, fontSize: 14 },
  row:                { flexDirection: "row", gap: 12 },
  dateBtn:            { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  iosDoneBtn:         { alignSelf: "flex-end", paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10 },
  pickerWrap:         { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  refreshBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  emptyCard:          { borderRadius: 16, borderWidth: 1, padding: 40, alignItems: "center", gap: 10 },
  emptyTitle:         { fontSize: 16, fontWeight: "600" },
  emptyDesc:          { fontSize: 13, textAlign: "center" },
  vCard:              { borderRadius: 14, borderWidth: 1, padding: 14 },
  vCardTop:           { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  vIconWrap:          { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  vCardInfo:          { flex: 1 },
  vName:              { fontSize: 15, fontWeight: "600", marginBottom: 5 },
  typePill:           { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typePillText:       { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  statusPill:         { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  statusPillText:     { fontSize: 11, fontWeight: "600" },
  visitingBanner:     { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  visitingText:       { fontSize: 12, flex: 1 },
  vDetails:           { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  vDetailItem:        { flexDirection: "row", alignItems: "center", gap: 4 },
  vDetailText:        { fontSize: 12 },
  vTimes:             { flexDirection: "row", gap: 16, paddingTop: 10, borderTopWidth: 1 },
  vTimeItem:          { flexDirection: "row", alignItems: "center", gap: 10 },
  vTimeIcon:          { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});