// @ts-nocheck
// app/vehicle-search.tsx
// Works for Admin, Resident and Gatekeeper roles
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Keyboard,
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
import { getCommunityId, getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";

// ── Vehicle type config ────────────────────────────────────────
function getVehicleIcon(type) {
  const t = type?.toUpperCase();
  if (t === "CAR")        return { icon: "truck",      color: "#3B82F6", bg: "#DBEAFE", darkBg: "#0A1E40" };
  if (t === "BIKE")       return { icon: "wind",        color: "#10B981", bg: "#D1FAE5", darkBg: "#002A1A" };
  if (t === "SCOOTER")    return { icon: "zap",         color: "#F59E0B", bg: "#FEF3C7", darkBg: "#2D1A00" };
  if (t === "AUTO")       return { icon: "navigation",  color: "#8B5CF6", bg: "#EDE9FE", darkBg: "#1E1040" };
  if (t === "TRUCK")      return { icon: "truck",       color: "#EF4444", bg: "#FEE2E2", darkBg: "#3B0000" };
  return                         { icon: "info",        color: "#6B7280", bg: "#F3F4F6", darkBg: "#1C1C1E" };
}

// ── Helpers ────────────────────────────────────────────────────
function formatPhone(p) {
  if (!p) return null;
  const clean = p.replace(/\D/g, "");
  if (clean.length === 10) return `+91 ${clean.slice(0,5)} ${clean.slice(5)}`;
  return p;
}

// Highlight matching chars in a string
function HighlightText({ text, query, style, isDark }) {
  if (!query || !text) return <Text style={style}>{text}</Text>;
  const idx = text.toUpperCase().indexOf(query.toUpperCase());
  if (idx === -1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {text.slice(0, idx)}
      <Text style={{ backgroundColor: isDark ? "#854D0E" : "#FEF3C7", color: isDark ? "#FCD34D" : "#92400E", fontWeight: "800" }}>
        {text.slice(idx, idx + query.length)}
      </Text>
      {text.slice(idx + query.length)}
    </Text>
  );
}

// ── Result Card ────────────────────────────────────────────────
function ResultCard({ result, query, isDark, textColor, muted, borderCol, cardBg }) {
  const vc = getVehicleIcon(result.vehicleType);

  return (
    <View style={[styles.resultCard, {
      backgroundColor: cardBg,
      borderColor: borderCol,
      borderLeftWidth: 4,
      borderLeftColor: vc.color,
    }]}>

      {/* Vehicle number + type */}
      <View style={styles.resultTop}>
        <View style={[styles.vehicleIconWrap, { backgroundColor: isDark ? vc.darkBg : vc.bg }]}>
          <Feather name={vc.icon} size={22} color={vc.color} />
        </View>
        <View style={{ flex: 1 }}>
          <HighlightText
            text={result.vehicleNo?.toUpperCase()}
            query={query}
            style={[styles.vehicleNo, { color: textColor }]}
            isDark={isDark}
          />
          <View style={styles.vehicleTypeRow}>
            {result.vehicleType && (
              <View style={[styles.typePill, { backgroundColor: isDark ? vc.darkBg : vc.bg }]}>
                <Text style={[styles.typePillText, { color: vc.color }]}>
                  {result.vehicleType}
                </Text>
              </View>
            )}
            {result.vehicleColor && (
              <View style={[styles.colorPill, { backgroundColor: isDark ? "#2C2C2E" : "#F1F5F9" }]}>
                <View style={[styles.colorDot, { backgroundColor: result.vehicleColor }]} />
                <Text style={[styles.colorPillText, { color: muted }]}>{result.vehicleColor}</Text>
              </View>
            )}
          </View>
        </View>
        {/* Ownership badge */}
        <View style={[styles.ownerBadge, {
          backgroundColor: result.ownerType === "RESIDENT"
            ? (isDark ? "#0A1E40" : "#DBEAFE")
            : (isDark ? "#1E1040" : "#EDE9FE"),
        }]}>
          <Feather
            name={result.ownerType === "RESIDENT" ? "home" : "user"}
            size={10}
            color={result.ownerType === "RESIDENT" ? "#3B82F6" : "#8B5CF6"}
          />
          <Text style={[styles.ownerBadgeText, {
            color: result.ownerType === "RESIDENT" ? "#3B82F6" : "#8B5CF6",
          }]}>
            {result.ownerType === "RESIDENT" ? "Resident" : "Visitor"}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: borderCol }]} />

      {/* Owner details grid */}
      <View style={styles.detailsGrid}>

        {/* Name */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: isDark ? "#1C2A1A" : "#D1FAE5" }]}>
            <Feather name="user" size={13} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailLabel, { color: muted }]}>OWNER</Text>
            <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={1}>
              {result.ownerName || "—"}
            </Text>
          </View>
        </View>

        {/* Flat / Unit */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: isDark ? "#0A1E40" : "#DBEAFE" }]}>
            <Feather name="home" size={13} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailLabel, { color: muted }]}>FLAT / UNIT</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>
              {result.unitNumber ? `Unit ${result.unitNumber}` : "—"}
            </Text>
          </View>
        </View>

        {/* Block */}
        {result.blockName && (
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: isDark ? "#1E1040" : "#EDE9FE" }]}>
              <Feather name="layers" size={13} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: muted }]}>BLOCK</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                Block {result.blockName}
              </Text>
            </View>
          </View>
        )}

        {/* Contact */}
        {result.contact && (
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: isDark ? "#2D1A00" : "#FEF3C7" }]}>
              <Feather name="phone" size={13} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: muted }]}>CONTACT</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {formatPhone(result.contact)}
              </Text>
            </View>
          </View>
        )}

        {/* Email */}
        {result.email && (
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: isDark ? "#1C2A1A" : "#D1FAE5" }]}>
              <Feather name="mail" size={13} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: muted }]}>EMAIL</Text>
              <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={1}>
                {result.email}
              </Text>
            </View>
          </View>
        )}

        {/* Model */}
        {result.vehicleModel && (
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: isDark ? "#002030" : "#CFFAFE" }]}>
              <Feather name="settings" size={13} color="#06B6D4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: muted }]}>MODEL</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {result.vehicleModel}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Footer — registered on */}
      {result.registeredAt && (
        <View style={[styles.resultFooter, { borderTopColor: borderCol }]}>
          <Feather name="calendar" size={11} color={muted} />
          <Text style={[styles.resultFooterText, { color: muted }]}>
            Registered {new Date(result.registeredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function VehicleSearch() {
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
  const inputBg   = isDark ? "#1C1C1E" : "#FFFFFF";

  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [recent, setRecent]     = useState([]); // recent searches stored in memory

  const inputRef = useRef(null);
  const { toast, showError, hideToast } = useToast();

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // ── Search ────────────────────────────────────────────────────
  const handleSearch = useCallback(async (searchQuery = query) => {
    const q = searchQuery.trim().toUpperCase().replace(/\s/g, "");
    if (!q || q.length < 2) {
      showError("Enter at least 2 characters");
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);
    setResults([]);

    try {
      const [token, user, communityId] = await Promise.all([
        getToken(),
        getUser(),
        getCommunityId(),
      ]);

      const res = await axios.get(`${config.backendUrl}/vehicle/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params:  {
          vehicleNo:   q,
          communityId: communityId || user?.communityId,
        },
      });

      const data = res.data?.vehicles || res.data?.results || res.data?.data || [];
      setResults(Array.isArray(data) ? data : []);

      // Save to recent (max 5, no duplicates)
      if (data.length > 0) {
        setRecent((prev) => {
          const filtered = prev.filter((r) => r !== q);
          return [q, ...filtered].slice(0, 5);
        });
      }
    } catch (e) {
      showError(e?.response?.data?.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  const handleRecentTap = (r) => {
    setQuery(r);
    handleSearch(r);
  };

  // ── Format query as vehicle plate (uppercase, trim spaces) ──
  const handleChangeText = (text) => {
    setQuery(text.toUpperCase().replace(/[^A-Z0-9\s-]/g, ""));
  };

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>

      {/* ── Header ── */}
      <View style={[styles.header, {
        paddingTop: Math.max(insets.top, 16),
        backgroundColor: pageBg,
        borderBottomColor: borderCol,
      }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: borderCol, backgroundColor: cardBg }]}
        >
          <Feather name="arrow-left" size={18} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Vehicle Search</Text>
          <Text style={[styles.headerSub, { color: muted }]}>Find owner by vehicle number</Text>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={[styles.searchBarWrap, { backgroundColor: pageBg, borderBottomColor: borderCol }]}>
        <View style={[styles.searchBar, {
          backgroundColor: inputBg,
          borderColor: query.length > 0 ? tint : borderCol,
          shadowColor: query.length > 0 ? tint : "transparent",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: query.length > 0 ? 3 : 0,
        }]}>
          {/* Vehicle plate icon */}
          <View style={[styles.plateIconWrap, { backgroundColor: isDark ? "#2C2C2E" : "#F1F5F9" }]}>
            <Feather name="truck" size={16} color={muted} />
          </View>

          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: textColor }]}
            value={query}
            onChangeText={handleChangeText}
            placeholder="e.g. MH12AB1234"
            placeholderTextColor={muted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
            maxLength={15}
          />

          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Feather name="x-circle" size={18} color={muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search button */}
        <TouchableOpacity
          onPress={() => handleSearch()}
          disabled={loading || query.trim().length < 2}
          style={[styles.searchBtn, {
            backgroundColor: query.trim().length >= 2 ? tint : (isDark ? "#2C2C2E" : "#E2E8F0"),
            opacity: loading ? 0.7 : 1,
          }]}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Feather name="search" size={18} color={query.trim().length >= 2 ? "#fff" : muted} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Initial state — tips + recent searches ── */}
        {!searched && !loading && (
          <>
            {/* Recent searches */}
            {recent.length > 0 && (
              <View style={[styles.recentCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.recentHeader}>
                  <Feather name="clock" size={14} color={muted} />
                  <Text style={[styles.recentTitle, { color: muted }]}>RECENT SEARCHES</Text>
                </View>
                <View style={styles.recentChips}>
                  {recent.map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => handleRecentTap(r)}
                      style={[styles.recentChip, { backgroundColor: isDark ? "#2C2C2E" : "#F1F5F9" }]}
                    >
                      <Feather name="truck" size={11} color={muted} />
                      <Text style={[styles.recentChipText, { color: textColor }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Tips */}
            <View style={[styles.tipsCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={styles.tipsHeader}>
                <View style={[styles.tipsIcon, { backgroundColor: isDark ? "#0A1E40" : "#DBEAFE" }]}>
                  <Feather name="info" size={16} color="#3B82F6" />
                </View>
                <Text style={[styles.tipsTitle, { color: textColor }]}>How to search</Text>
              </View>
              {[
                { icon: "type",       tip: "Enter full or partial vehicle number" },
                { icon: "zap",        tip: "Use uppercase — MH12AB1234" },
                { icon: "search",     tip: "Partial search works — try 'MH12' or 'AB12'" },
                { icon: "user",       tip: "Results show owner name, flat, block & contact" },
              ].map(({ icon, tip }) => (
                <View key={tip} style={styles.tipRow}>
                  <View style={[styles.tipDot, { backgroundColor: tint }]} />
                  <Text style={[styles.tipText, { color: muted }]}>{tip}</Text>
                </View>
              ))}
            </View>

            {/* Vehicle format examples */}
            <View style={[styles.examplesCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.examplesTitle, { color: muted }]}>EXAMPLE FORMATS</Text>
              <View style={styles.examplesRow}>
                {["MH12AB1234", "KA05CD5678", "DL3CAF9999", "TN22EF0011"].map((ex) => (
                  <TouchableOpacity
                    key={ex}
                    onPress={() => { setQuery(ex); }}
                    style={[styles.exampleChip, {
                      backgroundColor: isDark ? "#2C2C2E" : "#F8FAFC",
                      borderColor: borderCol,
                    }]}
                  >
                    <Text style={[styles.exampleChipText, { color: textColor }]}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── Loading ── */}
        {loading && (
          <View style={styles.loadingWrap}>
            <View style={[styles.loadingCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <ActivityIndicator size="large" color={tint} />
              <Text style={[styles.loadingText, { color: textColor }]}>Searching vehicles...</Text>
              <Text style={[styles.loadingSubText, { color: muted }]}>Looking for "{query}"</Text>
            </View>
          </View>
        )}

        {/* ── No results ── */}
        {searched && !loading && results.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? "#2C2C2E" : "#F1F5F9" }]}>
              <Feather name="truck" size={32} color={muted} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No Vehicle Found</Text>
            <Text style={[styles.emptyDesc, { color: muted }]}>
              No vehicle matching "{query}" is registered in this community.
            </Text>
            <TouchableOpacity
              onPress={handleClear}
              style={[styles.tryAgainBtn, { backgroundColor: isDark ? "#2C2C2E" : "#F1F5F9" }]}
            >
              <Feather name="search" size={14} color={tint} />
              <Text style={[styles.tryAgainText, { color: tint }]}>Try another number</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Results ── */}
        {!loading && results.length > 0 && (
          <>
            {/* Results header */}
            <View style={styles.resultsHeader}>
              <View style={[styles.resultsBadge, { backgroundColor: isDark ? "#0A1E40" : "#DBEAFE" }]}>
                <Text style={[styles.resultsBadgeText, { color: "#3B82F6" }]}>
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <Text style={[styles.resultsForText, { color: muted }]}>for "{query}"</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={handleClear}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: tint }}>Clear</Text>
              </TouchableOpacity>
            </View>

            {results.map((result, idx) => (
              <ResultCard
                key={result.id || idx}
                result={result}
                query={query}
                isDark={isDark}
                textColor={textColor}
                muted={muted}
                borderCol={borderCol}
                cardBg={cardBg}
              />
            ))}
          </>
        )}

      </ScrollView>

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header:            { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn:           { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle:       { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  headerSub:         { fontSize: 12, marginTop: 1 },
  // Search bar
  searchBarWrap:     { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar:         { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  plateIconWrap:     { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  searchInput:       { flex: 1, fontSize: 18, fontWeight: "700", letterSpacing: 1.5 },
  clearBtn:          { padding: 4 },
  searchBtn:         { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  // Recent
  recentCard:        { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  recentHeader:      { flexDirection: "row", alignItems: "center", gap: 6 },
  recentTitle:       { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  recentChips:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recentChip:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  recentChipText:    { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  // Tips
  tipsCard:          { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  tipsHeader:        { flexDirection: "row", alignItems: "center", gap: 10 },
  tipsIcon:          { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tipsTitle:         { fontSize: 15, fontWeight: "700" },
  tipRow:            { flexDirection: "row", alignItems: "center", gap: 10 },
  tipDot:            { width: 6, height: 6, borderRadius: 3 },
  tipText:           { fontSize: 13, lineHeight: 20 },
  // Examples
  examplesCard:      { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  examplesTitle:     { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  examplesRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  exampleChip:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  exampleChipText:   { fontSize: 13, fontWeight: "700", letterSpacing: 0.8 },
  // Loading
  loadingWrap:       { paddingVertical: 20 },
  loadingCard:       { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", gap: 14 },
  loadingText:       { fontSize: 16, fontWeight: "700" },
  loadingSubText:    { fontSize: 13 },
  // Empty
  emptyCard:         { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", gap: 12 },
  emptyIcon:         { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle:        { fontSize: 18, fontWeight: "800" },
  emptyDesc:         { fontSize: 13, textAlign: "center", lineHeight: 20 },
  tryAgainBtn:       { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  tryAgainText:      { fontSize: 14, fontWeight: "700" },
  // Results header
  resultsHeader:     { flexDirection: "row", alignItems: "center", gap: 8 },
  resultsBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  resultsBadgeText:  { fontSize: 12, fontWeight: "700" },
  resultsForText:    { fontSize: 13, fontWeight: "500" },
  // Result card
  resultCard:        { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  resultTop:         { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  vehicleIconWrap:   { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  vehicleNo:         { fontSize: 20, fontWeight: "900", letterSpacing: 1.5 },
  vehicleTypeRow:    { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  typePill:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typePillText:      { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  colorPill:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  colorDot:          { width: 8, height: 8, borderRadius: 4 },
  colorPillText:     { fontSize: 11, fontWeight: "600" },
  ownerBadge:        { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ownerBadgeText:    { fontSize: 10, fontWeight: "700" },
  divider:           { height: 1, marginHorizontal: 14 },
  detailsGrid:       { padding: 14, gap: 12 },
  detailItem:        { flexDirection: "row", alignItems: "center", gap: 12 },
  detailIcon:        { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  detailLabel:       { fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  detailValue:       { fontSize: 14, fontWeight: "600", marginTop: 1 },
  resultFooter:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  resultFooterText:  { fontSize: 11 },
});