// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Linking,
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

// --- Helpers ---
const AVATAR_COLORS = [
  "#6366F1","#3B82F6","#10B981","#F59E0B","#EF4444",
  "#8B5CF6","#EC4899","#14B8A6","#F97316","#06B6D4",
];
function getAvatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function getInitials(name = "") {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

// --- Resident Row ---
function ResidentRow({ resident, theme, textColor, muted, tint, borderCol }) {
  const isDark = theme === "dark";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const color  = getAvatarColor(resident.name || "");
  const phone  = resident.phone || resident.phoneNumber || resident.contact;
  const unit   = resident.unitNumber || resident.unit?.number;
  const block  = resident.blockName  || resident.block?.name;

  return (
    <View style={[styles.resRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
      {/* Avatar */}
      <View style={[styles.resAvatar, { backgroundColor: color + "20" }]}>
        <Text style={[styles.resAvatarText, { color }]}>{getInitials(resident.name)}</Text>
      </View>

      {/* Info */}
      <View style={styles.resInfo}>
        <Text style={[styles.resName, { color: textColor }]} numberOfLines={1}>
          {resident.name || "—"}
        </Text>
        <View style={styles.resMeta}>
          {(block || unit) ? (
            <View style={[styles.metaChip, { backgroundColor: isDark ? "#252525" : "#F1F5F9" }]}>
              <Feather name="home" size={9} color={muted} />
              <Text style={[styles.metaChipText, { color: muted }]}>
                {[block ? `Block ${block}` : null, unit ? `Unit ${unit}` : null].filter(Boolean).join(" · ")}
              </Text>
            </View>
          ) : null}
          {resident.email ? (
            <View style={[styles.metaChip, { backgroundColor: isDark ? "#252525" : "#F1F5F9" }]}>
              <Feather name="mail" size={9} color={muted} />
              <Text style={[styles.metaChipText, { color: muted }]} numberOfLines={1}>{resident.email}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Call button */}
      {phone ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(`tel:${phone}`)}
          style={[styles.callBtn, { backgroundColor: "#10B98115", borderColor: "#10B98140" }]}
        >
          <Feather name="phone" size={14} color="#10B981" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// --- Main Component ---
export default function Directory() {
  const theme     = useColorScheme() ?? "light";
  const isDark    = theme === "dark";
  const bg        = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint      = useThemeColor({}, "tint");
  const muted     = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg    = isDark ? "#1A1A1A" : "#FFFFFF";
  const fieldBg   = isDark ? "#1A1A1A" : "#FFFFFF";
  const insets    = useSafeAreaInsets();

  const [residents,   setResidents]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [query,       setQuery]       = useState("");
  const [blockFilter, setBlockFilter] = useState("ALL");

  const { toast, showError, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => { fetchDirectory(); }, []);

  const fetchDirectory = async () => {
    try {
      const token       = await getToken();
      const communityId = await getCommunityId();
      if (!communityId) { showError("Community not found."); return; }
      const res = await axios.get(`${url}/resident/directory`, {
        headers: { Authorization: `Bearer ${token}` },
        params:  { communityId },
      });
      const raw = res.data?.residents ?? res.data?.data ?? res.data ?? [];
      setResidents(Array.isArray(raw) ? raw : []);
    } catch (e) {
      showError("Failed to load directory.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchDirectory(); };

  // Unique block names for filter
  const blocks = useMemo(() => {
    const s = new Set(residents.map((r) => r.blockName || r.block?.name).filter(Boolean));
    return ["ALL", ...Array.from(s).sort()];
  }, [residents]);

  // Filtered + searched
  const filtered = useMemo(() => {
    let list = residents;
    if (blockFilter !== "ALL") {
      list = list.filter((r) => (r.blockName || r.block?.name) === blockFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) =>
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        String(r.unitNumber || r.unit?.number || "").includes(q)
      );
    }
    return list;
  }, [residents, query, blockFilter]);

  // Alphabetical groups
  const groups = useMemo(() => {
    const map: Record<string, typeof residents> = {};
    filtered.forEach((r) => {
      const l = (r.name || "#")[0].toUpperCase();
      if (!map[l]) map[l] = [];
      map[l].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
        <Feather name="users" size={32} color={tint} style={{ opacity: 0.5, marginBottom: 12 }} />
        <Text style={{ fontSize: 14, color: muted }}>Loading directory...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 20), borderBottomColor: borderCol, backgroundColor: bg }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: borderCol }]}>
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>Directory</Text>
            <Text style={[styles.headerSub, { color: muted }]}>
              {residents.length} resident{residents.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: bg, borderBottomColor: borderCol }]}>
        <View style={[styles.searchBar, { backgroundColor: fieldBg, borderColor: query ? tint : borderCol }]}>
          <Feather name="search" size={15} color={muted} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, email or unit..."
            placeholderTextColor={muted}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x-circle" size={15} color={muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Block filter tabs */}
      {blocks.length > 1 && (
        <View style={[styles.filterWrap, { borderBottomColor: borderCol }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {blocks.map((b) => {
              const active = blockFilter === b;
              return (
                <TouchableOpacity
                  key={b}
                  onPress={() => setBlockFilter(b)}
                  style={[styles.filterTab, {
                    backgroundColor: active ? tint : "transparent",
                    borderColor:     active ? tint : borderCol,
                  }]}
                >
                  <Text style={[styles.filterTabText, { color: active ? "#fff" : muted }]}>
                    {b === "ALL" ? "All Blocks" : `Block ${b}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tint} />}
      >
        <View style={styles.content}>
          {groups.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Feather name="users" size={36} color={muted} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No residents found</Text>
              <Text style={[styles.emptyDesc, { color: muted }]}>
                {query ? `No results for "${query}"` : "The directory is currently empty."}
              </Text>
            </View>
          ) : (
            groups.map(([letter, list]) => (
              <View key={letter} style={{ marginBottom: 8 }}>
                {/* Section header */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLetter, { color: tint }]}>{letter}</Text>
                  <View style={[styles.sectionLine, { backgroundColor: borderCol }]} />
                  <Text style={[styles.sectionCount, { color: muted }]}>{list.length}</Text>
                </View>
                <View style={{ gap: 8 }}>
                  {list.map((r) => (
                    <ResidentRow
                      key={r.id || r.email}
                      resident={r}
                      theme={theme}
                      textColor={textColor}
                      muted={muted}
                      tint={tint}
                      borderCol={borderCol}
                    />
                  ))}
                </View>
              </View>
            ))
          )}

          {groups.length > 0 && (
            <Text style={[styles.footerNote, { color: muted }]}>
              Showing {filtered.length} of {residents.length} residents
            </Text>
          )}
        </View>
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  headerBar:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerLeft:     { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle:    { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  headerSub:      { fontSize: 12, marginTop: 1 },
  searchWrap:     { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBar:      { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput:    { flex: 1, fontSize: 14 },
  filterWrap:     { borderBottomWidth: 1 },
  filterScroll:   { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterTabText:  { fontSize: 13, fontWeight: "600" },
  scroll:         { flex: 1 },
  content:        { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  emptyCard:      { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10, marginTop: 8 },
  emptyTitle:     { fontSize: 16, fontWeight: "600", marginTop: 4 },
  emptyDesc:      { fontSize: 13, textAlign: "center" },
  sectionHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 12 },
  sectionLetter:  { fontSize: 13, fontWeight: "800", minWidth: 16 },
  sectionLine:    { flex: 1, height: 1 },
  sectionCount:   { fontSize: 11, fontWeight: "600" },
  resRow:         { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  resAvatar:      { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  resAvatarText:  { fontSize: 14, fontWeight: "700" },
  resInfo:        { flex: 1, gap: 4 },
  resName:        { fontSize: 14, fontWeight: "600" },
  resMeta:        { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  metaChip:       { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  metaChipText:   { fontSize: 10, fontWeight: "500" },
  callBtn:        { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  footerNote:     { fontSize: 11, textAlign: "center", paddingTop: 20 },
});