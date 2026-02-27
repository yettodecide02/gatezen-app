// @ts-nocheck
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import supabase from "@/lib/supabase";
import { setToken, setUser } from "@/lib/auth";
import { config } from "@/lib/config";

export default function ResidentForm() {
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [communities, setCommunities] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setName(data.user.user_metadata.full_name || "");
          setEmail(data.user.email || "");
          setPassword(config.googleSignupPassword || "");
          setStep(2);
        }
      } catch (err) { console.error(err); }
    })();
  }, []);

  useEffect(() => { if (step === 2 && communities.length === 0) fetchCommunities(); }, [step]);

  const fetchCommunities = async () => {
    setLoadingCommunities(true);
    try {
      const res = await axios.get(`${config.backendUrl}/auth/communities`);
      if (res.data.success) setCommunities(res.data.data); else showError("Failed to load communities");
    } catch { showError("Error fetching communities"); }
    finally { setLoadingCommunities(false); }
  };

  const fetchBlocks = async (cId) => {
    if (!cId) return;
    setLoadingBlocks(true);
    try {
      const res = await axios.get(`${config.backendUrl}/auth/communities/${cId}/blocks`);
      if (res.data.success) setBlocks(res.data.data); else showError("Failed to load blocks");
    } catch { showError("Failed to load blocks"); }
    finally { setLoadingBlocks(false); }
  };

  const fetchUnits = async (bId) => {
    if (!bId) return;
    setLoadingUnits(true);
    try {
      const res = await axios.get(`${config.backendUrl}/auth/blocks/${bId}/units`);
      if (res.data.success) setUnits(res.data.data); else showError("Failed to load units");
    } catch { showError("Failed to load units"); }
    finally { setLoadingUnits(false); }
  };

  const handleSelectCommunity = (id) => { setSelectedCommunity(id); setSelectedBlock(""); setSelectedUnit(""); setBlocks([]); setUnits([]); setShowCommunityModal(false); fetchBlocks(id); };
  const handleSelectBlock = (id) => { setSelectedBlock(id); setSelectedUnit(""); setUnits([]); setShowBlockModal(false); fetchUnits(id); };
  const handleSelectUnit = (id) => { setSelectedUnit(id); setShowUnitModal(false); };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { showError("Enter a valid 6-digit OTP"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${config.backendUrl}/auth/check-otp`, { email, otp });
      if (res.data.success) { setStep(2); showSuccess("OTP verified!"); } else showError("Invalid OTP");
    } catch { showError("Failed to verify OTP"); }
    finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${config.backendUrl}/auth/send-otp`, { email, operation: "Sign-up" });
      if (res.data.success) showSuccess("OTP resent"); else showError("Failed to resend OTP");
    } catch { showError("Error resending OTP"); }
    finally { setLoading(false); }
  };

  const handleComplete = async () => {
    if (!selectedCommunity) { showError("Please select a community"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${config.backendUrl}/auth/signup`, { name, email, password, communityId: selectedCommunity, blockId: selectedBlock || null, unitId: selectedUnit || null });
      if (res.status === 201) {
        await setToken(res.data.jwttoken);
        await setUser(res.data.user);
        showSuccess("Registration successful!");
        if (res.data.user.status === "PENDING") router.replace("/pending"); else router.replace("/(tabs)/home");
      } else showError("Registration failed");
    } catch (e) { showError(e?.response?.data?.error || "Registration failed"); }
    finally { setLoading(false); }
  };

  const communityName = communities.find(c => c.id === selectedCommunity)?.name || "";
  const blockName = blocks.find(b => b.id === selectedBlock)?.name || blocks.find(b => b.id === selectedBlock)?.number || "";
  const unitName = units.find(u => u.id === selectedUnit)?.number || units.find(u => u.id === selectedUnit)?.name || "";

  const PickerModal = ({ visible, onClose, items, onSelect, labelKey, title, loading: lLoad }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 20, maxHeight: "70%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>{title}</Text>
            <Pressable onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: borderCol, alignItems: "center", justifyContent: "center" }}>
              <Feather name="x" size={16} color={text} />
            </Pressable>
          </View>
          {lLoad ? <ActivityIndicator color={tint} style={{ paddingVertical: 24 }} /> : (
            <FlatList data={items} keyExtractor={i => i.id} ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: borderCol }} />}
              ListEmptyComponent={<Text style={{ fontSize: 13, color: muted, textAlign: "center", paddingVertical: 20 }}>No options available</Text>}
              renderItem={({ item }) => (
                <Pressable onPress={() => onSelect(item.id)} style={{ paddingVertical: 13 }}>
                  <Text style={{ fontSize: 14, color: text }}>{item[labelKey] || item.number || item.name}</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
            <Feather name="arrow-left" size={18} color={text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Complete Registration</Text>
            <Text style={{ fontSize: 12, color: muted }}>Step {step} of 2</Text>
          </View>
        </View>
        {/* Step indicator dots */}
        <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
          {[1, 2].map(s => (
            <View key={s} style={{ height: 4, flex: s === step ? 2 : 1, borderRadius: 2, backgroundColor: s <= step ? tint : borderCol }} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }}>
        {step === 1 ? (
          <>
            <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: tint + "18", alignItems: "center", justifyContent: "center" }}>
                <Feather name="mail" size={24} color={tint} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "700", color: text }}>Verify Your Email</Text>
              <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>Enter the 6-digit code sent to {email}</Text>
            </View>

            <View>
              <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 6 }}>Verification Code</Text>
              <TextInput value={otp} onChangeText={setOtp} placeholder="000000" placeholderTextColor={muted} keyboardType="number-pad" maxLength={6}
                style={{ backgroundColor: fieldBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, paddingHorizontal: 16, paddingVertical: 14, fontSize: 22, fontWeight: "700", color: text, textAlign: "center", letterSpacing: 8 }} />
            </View>

            <Pressable onPress={handleVerifyOTP} disabled={loading}
              style={({ pressed }) => ({ backgroundColor: pressed || loading ? tint + "CC" : tint, borderRadius: 12, padding: 14, alignItems: "center" })}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Verify OTP</Text>}
            </Pressable>

            <Pressable onPress={handleResendOTP} disabled={loading} style={{ alignItems: "center", paddingVertical: 4 }}>
              <Text style={{ fontSize: 13, color: tint, fontWeight: "600" }}>Resend Code</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: text }}>Select Your Unit</Text>
              <Text style={{ fontSize: 13, color: muted }}>Choose your community, block, and unit</Text>
            </View>

            {/* Community */}
            <View>
              <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 6 }}>Community *</Text>
              <Pressable onPress={() => setShowCommunityModal(true)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: fieldBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: tint + "18", alignItems: "center", justifyContent: "center" }}>
                    <Feather name="home" size={14} color={tint} />
                  </View>
                  <Text style={{ fontSize: 14, color: communityName ? text : muted }}>{communityName || "Select community"}</Text>
                </View>
                {loadingCommunities ? <ActivityIndicator size="small" color={tint} /> : <Feather name="chevron-down" size={16} color={muted} />}
              </Pressable>
            </View>

            {/* Block */}
            {selectedCommunity !== "" && (
              <View>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 6 }}>Block</Text>
                <Pressable onPress={() => blocks.length > 0 && setShowBlockModal(true)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: fieldBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#8B5CF618", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="grid" size={14} color="#8B5CF6" />
                    </View>
                    <Text style={{ fontSize: 14, color: blockName ? text : muted }}>{blockName || "Select block (optional)"}</Text>
                  </View>
                  {loadingBlocks ? <ActivityIndicator size="small" color={tint} /> : <Feather name="chevron-down" size={16} color={muted} />}
                </Pressable>
              </View>
            )}

            {/* Unit */}
            {selectedBlock !== "" && (
              <View>
                <Text style={{ fontSize: 12, color: muted, fontWeight: "600", marginBottom: 6 }}>Unit</Text>
                <Pressable onPress={() => units.length > 0 && setShowUnitModal(true)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: fieldBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#10B98118", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="hash" size={14} color="#10B981" />
                    </View>
                    <Text style={{ fontSize: 14, color: unitName ? text : muted }}>{unitName || "Select unit (optional)"}</Text>
                  </View>
                  {loadingUnits ? <ActivityIndicator size="small" color={tint} /> : <Feather name="chevron-down" size={16} color={muted} />}
                </Pressable>
              </View>
            )}

            <Pressable onPress={handleComplete} disabled={loading || !selectedCommunity}
              style={({ pressed }) => ({ backgroundColor: pressed || loading || !selectedCommunity ? tint + "80" : tint, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 4 })}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Complete Registration</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>

      <PickerModal visible={showCommunityModal} onClose={() => setShowCommunityModal(false)} items={communities} onSelect={handleSelectCommunity} labelKey="name" title="Select Community" loading={loadingCommunities} />
      <PickerModal visible={showBlockModal} onClose={() => setShowBlockModal(false)} items={blocks} onSelect={handleSelectBlock} labelKey="name" title="Select Block" loading={loadingBlocks} />
      <PickerModal visible={showUnitModal} onClose={() => setShowUnitModal(false)} items={units} onSelect={handleSelectUnit} labelKey="number" title="Select Unit" loading={loadingUnits} />
      <Toast {...toast} onHide={hideToast} />
    </KeyboardAvoidingView>
  );
}
