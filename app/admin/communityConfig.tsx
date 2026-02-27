// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const FACILITY_TYPES = [
  { id: "swimming_pool", name: "Swimming Pool", icon: "droplet" },
  { id: "gymnasium", name: "Gymnasium", icon: "activity" },
  { id: "tennis_court", name: "Tennis Court", icon: "target" },
  { id: "basketball_court", name: "Basketball Court", icon: "circle" },
  { id: "playground", name: "Playground", icon: "smile" },
  { id: "clubhouse", name: "Clubhouse", icon: "home" },
  { id: "party_hall", name: "Party Hall", icon: "star" },
  { id: "conference_room", name: "Conference Room", icon: "briefcase" },
  { id: "library", name: "Library", icon: "book" },
  { id: "garden", name: "Garden", icon: "feather" },
  { id: "jogging_track", name: "Jogging Track", icon: "wind" },
];

const PRICE_TYPES = [
  { id: "per_hour", name: "Per Hour" },
  { id: "per_day", name: "Per Day" },
  { id: "per_week", name: "Per Week" },
  { id: "per_month", name: "Per Month" },
  { id: "one_time", name: "One Time" },
];

const TIME_OPTIONS_START = [
  { value: "06:00", label: "06:00 AM" },
  { value: "08:00", label: "08:00 AM" },
  { value: "09:00", label: "09:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
];
const TIME_OPTIONS_END = [
  { value: "17:00", label: "05:00 PM" },
  { value: "18:00", label: "06:00 PM" },
  { value: "19:00", label: "07:00 PM" },
  { value: "20:00", label: "08:00 PM" },
  { value: "21:00", label: "09:00 PM" },
];

const FACILITY_COLORS = [
  "#6366F1", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#06B6D4",
  "#84CC16",
];

export default function CommunityConfig() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const [communityData, setCommunityData] = useState({ name: "", description: "", address: "" });
  const [facilities, setFacilities] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState(null);

  const { toast, showError, showSuccess, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => {
    const init = {};
    FACILITY_TYPES.forEach(t => {
      init[t.id] = { enabled: false, quantity: 1, maxCapacity: 10, isPaid: false, price: 0, priceType: "per_hour", operatingHours: "09:00-21:00", rules: "" };
    });
    setFacilities(init);
    loadCommunityData();
  }, []);

  const loadCommunityData = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      if (!communityId) { showError("Community not found"); return; }
      const res = await axios.get(`${url}/admin/community`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId },
      });
      if (res.data.success && res.data.data) {
        const c = res.data.data;
        setCommunityData({ name: c.name || "", description: c.description || "", address: c.address || "" });
        if (c.facilities?.length > 0) {
          const map = {};
          FACILITY_TYPES.forEach(t => {
            map[t.id] = { enabled: false, quantity: 1, maxCapacity: 10, isPaid: false, price: 0, priceType: "per_hour", operatingHours: "09:00-21:00", rules: "" };
          });
          c.facilities.forEach(f => {
            map[f.facilityType] = { enabled: f.enabled, quantity: f.quantity, maxCapacity: f.maxCapacity, isPaid: f.isPaid, price: f.price || 0, priceType: f.priceType || "per_hour", operatingHours: f.operatingHours || "09:00-21:00", rules: f.rules || "" };
          });
          setFacilities(map);
        }
      }
    } catch {
      showError("Failed to load community data");
    } finally {
      setInitialLoad(false);
    }
  };

  const updateFacility = (id, field, value) => {
    setFacilities(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = async () => {
    if (!communityData.name.trim()) { showError("Community name is required"); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const communityId = await getCommunityId();
      const enabledFacilities = Object.entries(facilities).filter(([_, f]) => f.enabled).map(([id, f]) => ({ facilityType: id, ...f }));
      const res = await axios.post(`${url}/admin/community`, { ...communityData, facilities: enabledFacilities, communityId }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        showSuccess(res.data.message || "Saved successfully!");
        await loadCommunityData();
      } else {
        showError(res.data.message || "Failed to save");
      }
    } catch (e) {
      showError(e.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const enabledCount = Object.values(facilities).filter(f => f.enabled).length;

  if (initialLoad) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={tint} />
        <Text style={[styles.loadingText, { color: muted }]}>Loading configuration...</Text>
      </View>
    );
  }

  const selFac = selectedFacility;
  const selConfig = selFac ? (facilities[selFac.id] || {}) : {};
  const selColor = selFac ? FACILITY_COLORS[FACILITY_TYPES.findIndex(f => f.id === selFac.id) % FACILITY_COLORS.length] : tint;
  const [startTime, endTime] = (selConfig.operatingHours || "09:00-21:00").split("-");

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Toast {...toast} onHide={hideToast} />

      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 20), borderBottomColor: borderCol, backgroundColor: bg }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: borderCol }]}>
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: textColor }]}>Community Config</Text>
            <Text style={[styles.screenSub, { color: muted }]}>{enabledCount} facilities enabled</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSave} disabled={loading || !communityData.name.trim()} style={[styles.saveBtn, { backgroundColor: tint, opacity: (loading || !communityData.name.trim()) ? 0.5 : 1 }]}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="save" size={14} color="#fff" /><Text style={styles.saveBtnText}>Save</Text></>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Community Details */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: tint + "1A" }]}>
              <Feather name="map-pin" size={16} color={tint} />
            </View>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Community Details</Text>
          </View>

          {[
            { label: "Community Name", field: "name", placeholder: "Enter community name", multiline: false, icon: "home" },
            { label: "Description", field: "description", placeholder: "Brief description", multiline: true, icon: "file-text" },
            { label: "Address", field: "address", placeholder: "Community address", multiline: true, icon: "map-pin" },
          ].map(({ label, field, placeholder, multiline, icon }) => (
            <View key={field} style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: muted }]}>{label}{field === "name" ? " *" : ""}</Text>
              <View style={[styles.fieldRow, { borderColor: borderCol, backgroundColor: isDark ? "#111111" : "#F8FAFC", alignItems: multiline ? "flex-start" : "center" }]}>
                <Feather name={icon} size={16} color={muted} style={multiline ? { marginTop: 2 } : {}} />
                <TextInput
                  style={[styles.fieldInput, { color: textColor }, multiline && { height: 72, textAlignVertical: "top" }]}
                  placeholder={placeholder}
                  placeholderTextColor={muted}
                  value={communityData[field]}
                  onChangeText={v => setCommunityData(p => ({ ...p, [field]: v }))}
                  multiline={multiline}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Facilities */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: "#10B9811A" }]}>
              <Feather name="settings" size={16} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Facilities & Amenities</Text>
              <Text style={[styles.sectionSub, { color: muted }]}>Tap to configure · {enabledCount} enabled</Text>
            </View>
          </View>

          <View style={styles.facilityGrid}>
            {FACILITY_TYPES.map((ft, i) => {
              const fc = facilities[ft.id] || {};
              const isOn = fc.enabled;
              const color = FACILITY_COLORS[i % FACILITY_COLORS.length];
              return (
                <TouchableOpacity key={ft.id} onPress={() => setSelectedFacility(ft)}
                  style={[styles.facilityCard, {
                    backgroundColor: isOn ? (color + "15") : (isDark ? "#111" : "#F8FAFC"),
                    borderColor: isOn ? color + "50" : borderCol,
                  }]}
                >
                  {isOn && (
                    <View style={[styles.facilityCheck, { backgroundColor: color }]}>
                      <Feather name="check" size={8} color="#fff" />
                    </View>
                  )}
                  <View style={[styles.facilityIconWrap, { backgroundColor: isOn ? color + "20" : (isDark ? "#1A1A1A" : "#EEEEEE") }]}>
                    <Feather name={ft.icon} size={18} color={isOn ? color : muted} />
                  </View>
                  <Text style={[styles.facilityName, { color: isOn ? color : textColor }]} numberOfLines={2}>{ft.name}</Text>
                  <Text style={[styles.facilityStatus, { color: isOn ? color : muted }]}>{isOn ? "On" : "Off"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Facility Config Modal */}
      <Modal visible={!!selectedFacility} animationType="slide" transparent onRequestClose={() => setSelectedFacility(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            {selFac && (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={[styles.modalFacIcon, { backgroundColor: selColor + "1A" }]}>
                      <Feather name={selFac.icon} size={20} color={selColor} />
                    </View>
                    <View>
                      <Text style={[styles.modalTitle, { color: textColor }]}>{selFac.name}</Text>
                      <TouchableOpacity onPress={() => updateFacility(selFac.id, "enabled", !selConfig.enabled)} style={[styles.togglePill, { backgroundColor: selConfig.enabled ? "#10B98120" : "#EF444420" }]}>
                        <Feather name={selConfig.enabled ? "toggle-right" : "toggle-left"} size={14} color={selConfig.enabled ? "#10B981" : "#EF4444"} />
                        <Text style={[styles.toggleText, { color: selConfig.enabled ? "#10B981" : "#EF4444" }]}>{selConfig.enabled ? "Enabled" : "Disabled"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedFacility(null)} style={[styles.modalClose, { borderColor: borderCol }]}>
                    <Feather name="x" size={16} color={textColor} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Quantity */}
                  <View style={styles.modalRow}>
                    <Text style={[styles.modalRowLabel, { color: textColor }]}>Quantity</Text>
                    <View style={styles.counterRow}>
                      <TouchableOpacity onPress={() => updateFacility(selFac.id, "quantity", Math.max(1, (selConfig.quantity || 1) - 1))} style={[styles.counterBtn, { borderColor: borderCol }]}>
                        <Feather name="minus" size={14} color={textColor} />
                      </TouchableOpacity>
                      <Text style={[styles.counterVal, { color: textColor }]}>{selConfig.quantity || 1}</Text>
                      <TouchableOpacity onPress={() => updateFacility(selFac.id, "quantity", Math.min(50, (selConfig.quantity || 1) + 1))} style={[styles.counterBtn, { borderColor: borderCol }]}>
                        <Feather name="plus" size={14} color={textColor} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Max Capacity */}
                  <View style={styles.modalRow}>
                    <Text style={[styles.modalRowLabel, { color: textColor }]}>Max Capacity</Text>
                    <View style={styles.counterRow}>
                      <TouchableOpacity onPress={() => updateFacility(selFac.id, "maxCapacity", Math.max(1, (selConfig.maxCapacity || 10) - 1))} style={[styles.counterBtn, { borderColor: borderCol }]}>
                        <Feather name="minus" size={14} color={textColor} />
                      </TouchableOpacity>
                      <Text style={[styles.counterVal, { color: textColor }]}>{selConfig.maxCapacity || 10}</Text>
                      <TouchableOpacity onPress={() => updateFacility(selFac.id, "maxCapacity", Math.min(1000, (selConfig.maxCapacity || 10) + 1))} style={[styles.counterBtn, { borderColor: borderCol }]}>
                        <Feather name="plus" size={14} color={textColor} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Operating Hours */}
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: muted }]}>Operating Hours</Text>
                    <View style={styles.hoursRow}>
                      <View style={[styles.pickerWrap, { borderColor: borderCol, backgroundColor: isDark ? "#111" : "#F8FAFC" }]}>
                        <Picker selectedValue={startTime} onValueChange={v => updateFacility(selFac.id, "operatingHours", `${v}-${endTime}`)} style={{ color: textColor }} dropdownIconColor={muted}>
                          {TIME_OPTIONS_START.map(o => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
                        </Picker>
                      </View>
                      <Text style={[styles.hoursSep, { color: muted }]}>to</Text>
                      <View style={[styles.pickerWrap, { borderColor: borderCol, backgroundColor: isDark ? "#111" : "#F8FAFC" }]}>
                        <Picker selectedValue={endTime} onValueChange={v => updateFacility(selFac.id, "operatingHours", `${startTime}-${v}`)} style={{ color: textColor }} dropdownIconColor={muted}>
                          {TIME_OPTIONS_END.map(o => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
                        </Picker>
                      </View>
                    </View>
                  </View>

                  {/* Paid toggle */}
                  <View style={styles.modalRow}>
                    <View>
                      <Text style={[styles.modalRowLabel, { color: textColor }]}>Paid Facility</Text>
                      <Text style={[styles.modalRowSub, { color: muted }]}>Charge residents for booking</Text>
                    </View>
                    <Switch value={selConfig.isPaid || false} onValueChange={v => updateFacility(selFac.id, "isPaid", v)} trackColor={{ false: borderCol, true: selColor + "80" }} thumbColor={selConfig.isPaid ? selColor : muted} />
                  </View>

                  {selConfig.isPaid && (
                    <View style={styles.modalSection}>
                      <Text style={[styles.modalSectionTitle, { color: muted }]}>Pricing</Text>
                      <View style={[styles.fieldRow, { borderColor: borderCol, backgroundColor: isDark ? "#111" : "#F8FAFC", marginBottom: 10 }]}>
                        <Text style={[styles.currencyLabel, { color: muted }]}>₹</Text>
                        <TextInput style={[styles.fieldInput, { color: textColor }]} placeholder="0" placeholderTextColor={muted} value={String(selConfig.price || "")} onChangeText={v => updateFacility(selFac.id, "price", parseFloat(v) || 0)} keyboardType="decimal-pad" />
                      </View>
                      <View style={[styles.pickerWrap, { borderColor: borderCol, backgroundColor: isDark ? "#111" : "#F8FAFC" }]}>
                        <Picker selectedValue={selConfig.priceType || "per_hour"} onValueChange={v => updateFacility(selFac.id, "priceType", v)} style={{ color: textColor }} dropdownIconColor={muted}>
                          {PRICE_TYPES.map(p => <Picker.Item key={p.id} label={p.name} value={p.id} />)}
                        </Picker>
                      </View>
                    </View>
                  )}

                  {/* Rules */}
                  <View style={styles.fieldWrap}>
                    <Text style={[styles.fieldLabel, { color: muted }]}>Rules & Guidelines</Text>
                    <View style={[styles.fieldRow, { borderColor: borderCol, backgroundColor: isDark ? "#111" : "#F8FAFC", alignItems: "flex-start", paddingVertical: 10 }]}>
                      <Feather name="list" size={16} color={muted} style={{ marginTop: 2 }} />
                      <TextInput style={[styles.fieldInput, { color: textColor, height: 80, textAlignVertical: "top" }]} placeholder="Any rules for this facility..." placeholderTextColor={muted} value={selConfig.rules || ""} onChangeText={v => updateFacility(selFac.id, "rules", v)} multiline />
                    </View>
                  </View>
                </ScrollView>

                <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
                  <TouchableOpacity onPress={() => setSelectedFacility(null)} style={[styles.cancelBtn, { borderColor: borderCol }]}>
                    <Text style={[styles.cancelBtnText, { color: muted }]}>Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  screenSub: { fontSize: 12, fontWeight: "500", marginTop: 1 },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  section: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  sectionSub: { fontSize: 12, marginTop: 1 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  fieldInput: { flex: 1, fontSize: 15 },
  facilityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  facilityCard: { width: "30%", borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 6, position: "relative" },
  facilityCheck: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  facilityIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  facilityName: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  facilityStatus: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", paddingBottom: 32 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1 },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalFacIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  togglePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  toggleText: { fontSize: 12, fontWeight: "700" },
  modalClose: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  modalFooter: { padding: 20, borderTopWidth: 1 },
  modalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  modalRowLabel: { fontSize: 14, fontWeight: "600" },
  modalRowSub: { fontSize: 12, marginTop: 2 },
  modalSection: { marginBottom: 18 },
  modalSectionTitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  counterBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  counterVal: { fontSize: 18, fontWeight: "700", minWidth: 32, textAlign: "center" },
  hoursRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hoursSep: { fontSize: 13, fontWeight: "500" },
  pickerWrap: { flex: 1, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  currencyLabel: { fontSize: 16, fontWeight: "700" },
  cancelBtn: { borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  cancelBtnText: { fontSize: 14, fontWeight: "600" },
});
