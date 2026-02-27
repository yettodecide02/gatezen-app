// @ts-nocheck
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getUser, getToken } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

export default function Documents() {
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

  const [loading, setLoading] = useState(true);
  const [pdfs, setPdfs] = useState([]);
  const [filteredPdfs, setFilteredPdfs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const { toast, showError, showSuccess, showInfo, hideToast } = useToast();

  useEffect(() => {
    (async () => {
      const user = await getUser();
      if (!user?.communityId) { setLoading(false); return; }
      await fetchPdfs(user.communityId);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredPdfs(pdfs); return; }
    setFilteredPdfs(pdfs.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())));
  }, [searchQuery, pdfs]);

  const fetchPdfs = async (cid) => {
    try {
      const token = await getToken();
      const res = await axios.get(`${config.backendUrl}/resident/pdfs?communityId=${cid}`, { headers: { Authorization: `Bearer ${token}` } });
      const list = res.data?.data ?? res.data ?? [];
      setPdfs(Array.isArray(list) ? list : []);
    } catch { showError("Failed to load documents"); }
  };

  const downloadPdf = async (pdf) => {
    try {
      setDownloadingId(pdf.id);
      const token = await getToken();
      const url = `${config.backendUrl}/resident/pdfs/${pdf.id}/download`;
      const dest = `${FileSystem.documentDirectory}${pdf.name.replace(/[^a-zA-Z0-9._-]/g,"_")}.pdf`;
      const res = await FileSystem.downloadAsync(url, dest, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 200) {
        if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(res.uri); }
        else { showSuccess("Downloaded to documents."); }
      } else { showError("Download failed."); }
    } catch { showError("Download failed."); }
    finally { setDownloadingId(null); }
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
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Documents</Text>
            <Text style={{ fontSize: 12, color: muted }}>Community policies & forms</Text>
          </View>
        </View>
        {/* Search */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 }}>
          <Feather name="search" size={15} color={muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search documents…"
            placeholderTextColor={muted}
            style={{ flex: 1, fontSize: 14, color: text }}
          />
          {!!searchQuery && <Pressable onPress={() => setSearchQuery("")}><Feather name="x" size={14} color={muted} /></Pressable>}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color={tint} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {filteredPdfs.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 50, gap: 8 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#6366F115", alignItems: "center", justifyContent: "center" }}>
                <Feather name="file-text" size={24} color="#6366F1" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>{searchQuery ? "No Results" : "No Documents"}</Text>
              <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>{searchQuery ? `No documents match "${searchQuery}"` : "No community documents available yet."}</Text>
            </View>
          ) : filteredPdfs.map((pdf) => (
            <View key={pdf.id} style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: "#6366F115", alignItems: "center", justifyContent: "center" }}>
                <Feather name="file-text" size={20} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: text }} numberOfLines={1}>{pdf.name}</Text>
                <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>PDF Document</Text>
              </View>
              <Pressable onPress={() => downloadPdf(pdf)}
                style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 10, backgroundColor: pressed ? tint + "30" : tint + "18", alignItems: "center", justifyContent: "center" })}>
                {downloadingId === pdf.id ? <ActivityIndicator size="small" color={tint} /> : <Feather name="download" size={16} color={tint} />}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
