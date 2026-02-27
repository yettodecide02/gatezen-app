// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput, Modal, Image, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const PKG_STATUS = {
  pending: { color: "#F59E0B", label: "PNDG" }, collected: { color: "#10B981", label: "CLTD" }, cancelled: { color: "#EF4444", label: "CNCL" },
};

export default function GatekeeperPackages() {
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

  const { toast, showError, showSuccess, hideToast } = useToast();
  const [user, setUserState] = useState(null);
  const [token, setTokenState] = useState(null);
  const [packages, setPackages] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showResPicker, setShowResPicker] = useState(false);
  const [newPkg, setNewPkg] = useState({ userId: "", name: "", image: "" });
  const [selectedBlock, setSelectedBlock] = useState("");
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    (async () => { const [t, u] = await Promise.all([getToken(), getUser()]); setTokenState(t); setUserState(u); })();
  }, []);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const loadData = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        axios.get(`${config.backendUrl}/gatekeeper/packages`, { headers: authHeaders, params: { communityId: user.communityId } }),
        axios.get(`${config.backendUrl}/gatekeeper/residents`, { headers: authHeaders, params: { communityId: user.communityId } }),
      ]);
      const pkgs = pRes.data || [];
      setAllPackages(pkgs); setPackages(pkgs);
      const uniqueBlocks = [...new Set(pkgs.map(p => p.user?.unit?.block?.name).filter(Boolean))];
      setBlocks(uniqueBlocks);
      setResidents(rRes.data || []);
    } catch { showError("Failed to load packages"); }
    finally { setLoading(false); }
  }, [token, user]);

  useEffect(() => { if (user) loadData(); }, [user]);

  useEffect(() => {
    if (!selectedBlock) { setPackages(allPackages); return; }
    setPackages(allPackages.filter(p => p.user?.unit?.block?.name === selectedBlock));
  }, [selectedBlock, allPackages]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { showError("Camera roll permission required"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setNewPkg(prev => ({ ...prev, image: base64 }));
    }
  };

  const createPackage = async () => {
    if (!newPkg.userId) { showError("Please select a resident"); return; }
    if (!newPkg.image) { showError("Please upload an image"); return; }
    if (!newPkg.name.trim()) { showError("Please enter a package name"); return; }
    setSubmitting(true);
    try {
      await axios.post(`${config.backendUrl}/gatekeeper/packages`, { userId: newPkg.userId, communityId: user.communityId, image: newPkg.image, name: newPkg.name.trim() }, { headers: authHeaders });
      showSuccess("Package logged!");
      setNewPkg({ userId: "", name: "", image: "" }); setShowCreate(false);
      loadData();
    } catch { showError("Failed to create package"); }
    finally { setSubmitting(false); }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await axios.put(`${config.backendUrl}/gatekeeper/packages/${id}`, { status }, { headers: authHeaders });
      setAllPackages(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      showSuccess(`Marked as ${status}`);
    } catch { showError("Failed to update status"); }
    finally { setUpdating(null); }
  };

  const selectedResName = residents.find(r => r.id === newPkg.userId)?.name || "";

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: text }}>Packages</Text>
            <Text style={{ fontSize: 13, color: muted }}>{packages.length} package{packages.length !== 1 ? "s" : ""}</Text>
          </View>
          <Pressable onPress={() => setShowCreate(true)} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: tint }}>
            <Feather name="plus" size={14} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>Log Package</Text>
          </Pressable>
        </View>
        {/* Block filter chips */}
        {blocks.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 6 }}>
            {["", ...blocks].map(b => (
              <Pressable key={b || "__all"} onPress={() => setSelectedBlock(b)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: selectedBlock === b ? tint : borderCol, backgroundColor: selectedBlock === b ? tint + "18" : "transparent" }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: selectedBlock === b ? tint : muted }}>{b || "All Blocks"}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color={tint} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}>
          {packages.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F59E0B15", alignItems: "center", justifyContent: "center" }}><Feather name="package" size={24} color="#F59E0B" /></View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>No Packages</Text>
              <Text style={{ fontSize: 13, color: muted }}>No package records found.</Text>
            </View>
          ) : packages.map(p => {
            const key = (p.status || "pending").toLowerCase();
            const sc = PKG_STATUS[key] || PKG_STATUS.pending;
            const resident = p.user;
            return (
              <View key={p.id} style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: borderCol, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", padding: 14, gap: 10 }}>
                  {p.image ? (
                    <Image source={{ uri: p.image }} style={{ width: 48, height: 48, borderRadius: 10 }} />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: "#F59E0B18", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="package" size={20} color="#F59E0B" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: text }}>{p.name || "Package"}</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: sc.color + "20" }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: sc.color }}>{sc.label}</Text>
                      </View>
                    </View>
                    {resident && (
                      <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>{resident.name}{resident.unit?.number ? ` · Unit ${resident.unit.number}` : ""}{resident.unit?.block?.name ? ` · ${resident.unit.block.name}` : ""}</Text>
                    )}
                    {p.createdAt && <Text style={{ fontSize: 11, color: muted }}>{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>}
                  </View>
                </View>
                {key === "pending" && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 12, flexDirection: "row", gap: 8 }}>
                    <Pressable onPress={() => updateStatus(p.id, "cancelled")} disabled={updating === p.id}
                      style={{ flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "#EF444430", backgroundColor: "#EF444408", alignItems: "center" }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#EF4444" }}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={() => updateStatus(p.id, "collected")} disabled={updating === p.id}
                      style={{ flex: 2, paddingVertical: 7, borderRadius: 10, backgroundColor: tint, alignItems: "center" }}>
                      {updating === p.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>Mark Collected</Text>}
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <ScrollView style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", paddingHorizontal: 20, paddingTop: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Log Incoming Package</Text>
              <Pressable onPress={() => setShowCreate(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: borderCol, alignItems: "center", justifyContent: "center" }}>
                <Feather name="x" size={16} color={text} />
              </Pressable>
            </View>

            {/* Resident picker */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 6 }}>Resident *</Text>
              <Pressable onPress={() => setShowResPicker(true)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, padding: 12 }}>
                <Text style={{ fontSize: 14, color: selectedResName ? text : muted }}>{selectedResName || "Select resident"}</Text>
                <Feather name="chevron-down" size={16} color={muted} />
              </Pressable>
            </View>

            {/* Package name */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 6 }}>Package Name *</Text>
              <TextInput value={newPkg.name} onChangeText={v => setNewPkg(prev => ({ ...prev, name: v }))} placeholder="e.g. Amazon parcel" placeholderTextColor={muted}
                style={{ backgroundColor: fieldBg, borderRadius: 10, borderWidth: 1, borderColor: borderCol, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: text }} />
            </View>

            {/* Image upload */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 6 }}>Package Photo *</Text>
              {newPkg.image ? (
                <View style={{ position: "relative" }}>
                  <Image source={{ uri: newPkg.image }} style={{ width: "100%", height: 140, borderRadius: 10 }} resizeMode="cover" />
                  <Pressable onPress={() => setNewPkg(prev => ({ ...prev, image: "" }))} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
                    <Feather name="x" size={14} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={pickImage} style={{ height: 100, borderRadius: 10, borderWidth: 2, borderColor: borderCol, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Feather name="camera" size={20} color={muted} />
                  <Text style={{ fontSize: 12, color: muted }}>Tap to upload photo</Text>
                </Pressable>
              )}
            </View>

            <Pressable onPress={createPackage} disabled={submitting}
              style={({ pressed }) => ({ backgroundColor: pressed || submitting ? tint + "CC" : tint, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: insets.bottom + 20 })}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Log Package</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Resident picker modal */}
      <Modal visible={showResPicker} animationType="slide" transparent onRequestClose={() => setShowResPicker(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 20, maxHeight: "65%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Select Resident</Text>
              <Pressable onPress={() => setShowResPicker(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: borderCol, alignItems: "center", justifyContent: "center" }}>
                <Feather name="x" size={16} color={text} />
              </Pressable>
            </View>
            <FlatList data={residents} keyExtractor={r => r.id}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: borderCol }} />}
              ListEmptyComponent={<Text style={{ color: muted, textAlign: "center", paddingVertical: 20 }}>No residents found</Text>}
              renderItem={({ item }) => (
                <Pressable onPress={() => { setNewPkg(prev => ({ ...prev, userId: item.id })); setShowResPicker(false); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: tint + "18", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: tint }}>{(item.name || "?")[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: text, fontWeight: "500" }}>{item.name}</Text>
                    {item.unit?.number && <Text style={{ fontSize: 11, color: muted }}>Unit {item.unit.number}{item.unit.block?.name ? ` · ${item.unit.block.name}` : ""}</Text>}
                  </View>
                  {newPkg.userId === item.id && <Feather name="check" size={15} color={tint} />}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
