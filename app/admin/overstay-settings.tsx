// @ts-nocheck
// app/admin/overstay-settings.tsx
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
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
import {
    DEFAULT_OVERSTAY_LIMITS,
    fetchOvstayLimits,
    formatDuration,
    saveOvstayLimits,
} from "@/lib/overstayLimits";

// ── Visitor type metadata ──────────────────────────────────────
const TYPES = [
  {
    key:   "DELIVERY",
    label: "Delivery",
    sub:   "Couriers, food delivery, parcels",
    icon:  "package",
    color: "#3B82F6",
    bg:    "#DBEAFE",
    darkBg:"#0A1E40",
    unit:  "mins",   // display unit
  },
  {
    key:   "GUEST",
    label: "Guest",
    sub:   "Personal visitors, friends & family",
    icon:  "user",
    color: "#8B5CF6",
    bg:    "#EDE9FE",
    darkBg:"#1E1040",
    unit:  "hrs",
  },
  {
    key:   "STAFF",
    label: "Staff / Worker",
    sub:   "Housekeeping, maintenance workers",
    icon:  "briefcase",
    color: "#F59E0B",
    bg:    "#FEF3C7",
    darkBg:"#2D1A00",
    unit:  "hrs",
  },
  {
    key:   "CAB_AUTO",
    label: "Cab / Auto",
    sub:   "Taxi, auto-rickshaw, ride-hailing",
    icon:  "navigation",
    color: "#06B6D4",
    bg:    "#CFFAFE",
    darkBg:"#002030",
    unit:  "mins",
  },
  {
    key:   "OTHER",
    label: "Other / Default",
    sub:   "Any unclassified visitor type",
    icon:  "users",
    color: "#6B7280",
    bg:    "#F3F4F6",
    darkBg:"#1C1C1E",
    unit:  "hrs",
  },
];

// Quick-select preset buttons per type
const PRESETS = {
  DELIVERY: [5, 10, 15, 20, 30],
  GUEST:    [60, 120, 240, 360, 480],
  STAFF:    [120, 240, 360, 480, 600],
  CAB_AUTO: [5, 10, 15, 20, 30],
  OTHER:    [60, 120, 240, 360, 480],
};

// Step sizes for +/- buttons
const STEPS = {
  DELIVERY: 5,
  GUEST:    30,
  STAFF:    30,
  CAB_AUTO: 5,
  OTHER:    30,
};

// Min / Max (minutes)
const MIN_LIMIT = 5;
const MAX_LIMIT = 1440; // 24hrs

export default function OverstaySettings() {
  const theme     = useColorScheme() ?? "light";
  const isDark    = theme === "dark";
  const bg        = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint      = useThemeColor({}, "tint");
  const muted     = isDark ? "#8E8E93" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const cardBg    = isDark ? "#1C1C1E" : "#FFFFFF";
  const pageBg    = isDark ? "#111111" : "#F2F2F7";
  const insets    = useSafeAreaInsets();

  const [limits, setLimits]       = useState({ ...DEFAULT_OVERSTAY_LIMITS });
  const [original, setOriginal]   = useState({ ...DEFAULT_OVERSTAY_LIMITS });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [inputVals, setInputVals] = useState<Record<string, string>>({});

  const { toast, showSuccess, showError, hideToast } = useToast();

  // Load current limits on mount
  useEffect(() => {
    (async () => {
      const data = await fetchOvstayLimits();
      setLimits(data);
      setOriginal(data);
      // Initialise text input values
      const iv: Record<string, string> = {};
      Object.entries(data).forEach(([k, v]) => { iv[k] = String(v); });
      setInputVals(iv);
      setLoading(false);
    })();
  }, []);

  // ── Helpers ────────────────────────────────────────────────
  const setLimit = (key: string, val: number) => {
    const clamped = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, val));
    setLimits((p) => ({ ...p, [key]: clamped }));
    setInputVals((p) => ({ ...p, [key]: String(clamped) }));
  };

  const handleInputChange = (key: string, text: string) => {
    setInputVals((p) => ({ ...p, [key]: text }));
  };

  const handleInputBlur = (key: string) => {
    const num = parseInt(inputVals[key], 10);
    if (!isNaN(num)) setLimit(key, num);
    else setInputVals((p) => ({ ...p, [key]: String(limits[key]) }));
  };

  const hasChanges = JSON.stringify(limits) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveOvstayLimits(limits);
    setSaving(false);
    if (ok) {
      setOriginal({ ...limits });
      showSuccess("Overstay limits saved successfully!");
    } else {
      showError("Failed to save. Please try again.");
    }
  };

  const handleReset = () => {
    setLimits({ ...DEFAULT_OVERSTAY_LIMITS });
    const iv: Record<string, string> = {};
    Object.entries(DEFAULT_OVERSTAY_LIMITS).forEach(([k, v]) => { iv[k] = String(v); });
    setInputVals(iv);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: pageBg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={tint} />
        <Text style={{ color: muted, marginTop: 12, fontSize: 14 }}>Loading settings...</Text>
      </View>
    );
  }

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
            <Text style={[styles.headerTitle, { color: textColor }]}>Overstay Limits</Text>
            <Text style={[styles.headerSub, { color: muted }]}>Set allowed time per visitor type</Text>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !hasChanges}
          style={[styles.saveBtn, {
            backgroundColor: hasChanges ? tint : (isDark ? "#2C2C2E" : "#E2E8F0"),
            opacity: saving ? 0.7 : 1,
          }]}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
                <Feather name="save" size={14} color={hasChanges ? "#fff" : muted} />
                <Text style={[styles.saveBtnText, { color: hasChanges ? "#fff" : muted }]}>Save</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Info banner */}
        <View style={[styles.infoBanner, {
          backgroundColor: isDark ? "#0A1E40" : "#EFF6FF",
          borderColor: isDark ? "#1E40AF" : "#BFDBFE",
        }]}>
          <Feather name="info" size={16} color="#3B82F6" />
          <Text style={[styles.infoBannerText, { color: isDark ? "#93C5FD" : "#1E40AF" }]}>
            Changes apply immediately to all new overstay checks. Existing alerts are not affected.
          </Text>
        </View>

        {/* Unsaved changes banner */}
        {hasChanges && (
          <View style={[styles.changesBanner, {
            backgroundColor: isDark ? "#1C1400" : "#FFFBEB",
            borderColor: isDark ? "#92400E" : "#FCD34D",
          }]}>
            <Feather name="alert-triangle" size={14} color="#F59E0B" />
            <Text style={[styles.changesBannerText, { color: isDark ? "#FCD34D" : "#92400E" }]}>
              You have unsaved changes
            </Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#F59E0B" }}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Type cards */}
        {TYPES.map((t) => {
          const val     = limits[t.key] ?? DEFAULT_OVERSTAY_LIMITS[t.key];
          const step    = STEPS[t.key];
          const presets = PRESETS[t.key];
          const changed = val !== original[t.key];

          return (
            <View
              key={t.key}
              style={[styles.card, {
                backgroundColor: cardBg,
                borderColor: changed ? t.color + "60" : borderCol,
                borderLeftWidth: changed ? 4 : 1,
                borderLeftColor: changed ? t.color : borderCol,
              }]}
            >
              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: isDark ? t.darkBg : t.bg }]}>
                  <Feather name={t.icon} size={20} color={t.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.typeLabel, { color: textColor }]}>{t.label}</Text>
                    {changed && (
                      <View style={[styles.changedBadge, { backgroundColor: isDark ? t.darkBg : t.bg }]}>
                        <Text style={[styles.changedBadgeText, { color: t.color }]}>Edited</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.typeSub, { color: muted }]}>{t.sub}</Text>
                </View>
                {/* Current value display */}
                <View style={[styles.currentVal, { backgroundColor: isDark ? t.darkBg : t.bg }]}>
                  <Text style={[styles.currentValText, { color: t.color }]}>{formatDuration(val)}</Text>
                </View>
              </View>

              {/* +/- stepper with text input */}
              <View style={[styles.stepperRow, { backgroundColor: isDark ? "#2C2C2E" : "#F8FAFC", borderColor: borderCol }]}>
                {/* Minus */}
                <TouchableOpacity
                  onPress={() => setLimit(t.key, val - step)}
                  disabled={val <= MIN_LIMIT}
                  style={[styles.stepBtn, {
                    backgroundColor: val <= MIN_LIMIT ? "transparent" : (isDark ? t.darkBg : t.bg),
                    borderColor: val <= MIN_LIMIT ? borderCol : t.color + "40",
                  }]}
                >
                  <Feather name="minus" size={18} color={val <= MIN_LIMIT ? muted : t.color} />
                </TouchableOpacity>

                {/* Manual input */}
                <View style={styles.stepInputWrap}>
                  <TextInput
                    style={[styles.stepInput, { color: textColor }]}
                    value={inputVals[t.key] ?? String(val)}
                    onChangeText={(text) => handleInputChange(t.key, text)}
                    onBlur={() => handleInputBlur(t.key)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={[styles.stepUnit, { color: muted }]}>minutes</Text>
                </View>

                {/* Plus */}
                <TouchableOpacity
                  onPress={() => setLimit(t.key, val + step)}
                  disabled={val >= MAX_LIMIT}
                  style={[styles.stepBtn, {
                    backgroundColor: val >= MAX_LIMIT ? "transparent" : (isDark ? t.darkBg : t.bg),
                    borderColor: val >= MAX_LIMIT ? borderCol : t.color + "40",
                  }]}
                >
                  <Feather name="plus" size={18} color={val >= MAX_LIMIT ? muted : t.color} />
                </TouchableOpacity>
              </View>

              {/* Quick-select preset chips */}
              <View style={styles.presetsRow}>
                <Text style={[styles.presetsLabel, { color: muted }]}>Quick:</Text>
                {presets.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setLimit(t.key, p)}
                    style={[styles.presetChip, {
                      backgroundColor: val === p ? t.color : (isDark ? t.darkBg : t.bg),
                      borderColor: val === p ? t.color : (isDark ? t.darkBg : t.bg),
                    }]}
                  >
                    <Text style={[styles.presetChipText, { color: val === p ? "#fff" : t.color }]}>
                      {formatDuration(p)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Original value hint */}
              {changed && (
                <View style={[styles.originalHint, { borderTopColor: borderCol }]}>
                  <Feather name="rotate-ccw" size={11} color={muted} />
                  <Text style={[styles.originalHintText, { color: muted }]}>
                    Original: {formatDuration(original[t.key])}
                  </Text>
                  <TouchableOpacity onPress={() => setLimit(t.key, original[t.key])}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: t.color }}>Undo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Reset to defaults card */}
        <TouchableOpacity
          onPress={handleReset}
          style={[styles.resetCard, {
            backgroundColor: isDark ? "#1C1C1E" : "#FFF",
            borderColor: borderCol,
          }]}
        >
          <View style={[styles.resetIcon, { backgroundColor: isDark ? "#2C2C2E" : "#F1F5F9" }]}>
            <Feather name="rotate-ccw" size={18} color={muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.resetLabel, { color: textColor }]}>Reset to Defaults</Text>
            <Text style={[styles.resetSub, { color: muted }]}>
              Delivery 10m · Guest 4h · Staff 10h · Cab 15m
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={muted} />
        </TouchableOpacity>

        {/* Bottom save button */}
        {hasChanges && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.bottomSaveBtn, { backgroundColor: tint, opacity: saving ? 0.7 : 1 }]}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={styles.bottomSaveBtnText}>Save All Changes</Text>
                </>
            }
          </TouchableOpacity>
        )}

      </ScrollView>

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  header:             { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerLeft:         { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:            { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle:        { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  headerSub:          { fontSize: 12, marginTop: 1 },
  saveBtn:            { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  saveBtnText:        { fontSize: 13, fontWeight: "700" },
  infoBanner:         { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoBannerText:     { fontSize: 13, flex: 1, lineHeight: 20 },
  changesBanner:      { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  changesBannerText:  { fontSize: 13, fontWeight: "600", flex: 1 },
  card:               { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14, overflow: "hidden" },
  cardHeader:         { flexDirection: "row", alignItems: "center", gap: 12 },
  typeIcon:           { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  typeLabel:          { fontSize: 15, fontWeight: "700" },
  typeSub:            { fontSize: 12, marginTop: 2 },
  changedBadge:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  changedBadgeText:   { fontSize: 10, fontWeight: "700" },
  currentVal:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  currentValText:     { fontSize: 14, fontWeight: "800" },
  stepperRow:         { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 6, gap: 6 },
  stepBtn:            { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepInputWrap:      { flex: 1, alignItems: "center" },
  stepInput:          { fontSize: 26, fontWeight: "800", textAlign: "center", minWidth: 80 },
  stepUnit:           { fontSize: 11, fontWeight: "500", marginTop: 2 },
  presetsRow:         { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  presetsLabel:       { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  presetChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  presetChipText:     { fontSize: 12, fontWeight: "700" },
  originalHint:       { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 10, borderTopWidth: 1 },
  originalHintText:   { fontSize: 11, color: "#6B7280", flex: 1 },
  resetCard:          { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  resetIcon:          { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  resetLabel:         { fontSize: 14, fontWeight: "600" },
  resetSub:           { fontSize: 12, marginTop: 2 },
  bottomSaveBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 16 },
  bottomSaveBtnText:  { fontSize: 16, fontWeight: "800", color: "#fff" },
});