// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, View, ScrollView, ActivityIndicator, Modal, FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { isAuthed, setToken, setUser } from "@/lib/auth";
import GoogleSignin from "@/components/GoogleSignin";
import Toast from "@/components/Toast";
import FormField from "@/components/FormField";
import LoadingButton from "@/components/LoadingButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useToast } from "@/hooks/useToast";
import { config } from "@/lib/config";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [selectedCommunityName, setSelectedCommunityName] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedBlockName, setSelectedBlockName] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedUnitName, setSelectedUnitName] = useState("");
  const [communities, setCommunities] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [units, setUnits] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [nameErr, setNameErr] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [communityErr, setCommunityErr] = useState("");
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const { toast, showError, showSuccess, hideToast } = useToast();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const isDark = theme === "dark";
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const fieldBg = isDark ? "#111111" : "#F8FAFC";
  const btnTextColor = isDark ? "#11181C" : "#ffffff";

  useEffect(() => {
    (async () => { if (await isAuthed()) router.replace("/(tabs)/home"); })();
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    setLoadingCommunities(true);
    try {
      const res = await axios.get(`${config.backendUrl}/auth/communities`);
      if (res.data.success) {
        setCommunities(res.data.data);
        if (res.data.data.length === 0) showError("No communities available. Contact administrator.");
      } else showError("Failed to load communities");
    } catch { showError("Failed to load communities."); }
    finally { setLoadingCommunities(false); }
  };

  const fetchBlocks = async (communityId) => {
    if (!communityId) return;
    setLoadingBlocks(true); setBlocks([]); setUnits([]);
    setSelectedBlock(""); setSelectedUnit("");
    try {
      const res = await axios.get(`${config.backendUrl}/auth/communities/${communityId}/blocks`);
      if (res.data.success) setBlocks(res.data.data);
      else showError("Failed to load blocks");
    } catch { showError("Failed to load blocks."); }
    finally { setLoadingBlocks(false); }
  };

  const fetchUnits = async (blockId) => {
    if (!blockId) return;
    setLoadingUnits(true); setUnits([]); setSelectedUnit("");
    try {
      const res = await axios.get(`${config.backendUrl}/auth/blocks/${blockId}/units`);
      if (res.data.success) setUnits(res.data.data);
      else showError("Failed to load units");
    } catch { showError("Failed to load units."); }
    finally { setLoadingUnits(false); }
  };

  const handleCommunityChange = (communityId, communityName) => {
    setSelectedCommunity(communityId); setSelectedCommunityName(communityName);
    setShowCommunityModal(false);
    if (communityId) { fetchBlocks(communityId); }
    else { setBlocks([]); setUnits([]); setSelectedBlock(""); setSelectedBlockName(""); setSelectedUnit(""); setSelectedUnitName(""); }
  };

  const validate = () => {
    let ok = true;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name.trim()) { setNameErr("Full name is required"); ok = false; } else setNameErr("");
    if (!email.trim()) { setEmailErr("Email address is required"); ok = false; }
    else if (!emailRe.test(email.trim())) { setEmailErr("Enter a valid email address"); ok = false; }
    else setEmailErr("");
    if (!selectedCommunity) { setCommunityErr("Please select your community"); ok = false; } else setCommunityErr("");
    if (!password) { setPasswordErr("Password is required"); ok = false; }
    else if (password.length < 8) { setPasswordErr("Password must be at least 8 characters"); ok = false; }
    else setPasswordErr("");
    return ok;
  };

  const submit = useCallback(async () => {
    if (!validate()) return;
    if (communities.length === 0) { showError("No communities available. Contact administrator."); return; }
    setLoading(true);
    try {
      try {
        const existing = await axios.get(`${config.backendUrl}/auth/existing-user`, { params: { email } });
        if (existing.data.exists) { showError("User with this email already exists. Please login."); return; }
      } catch {}
      const res = await axios.post(`${config.backendUrl}/auth/signup`, {
        name, email, password, communityId: selectedCommunity,
        blockId: selectedBlock || null, unitId: selectedUnit || null,
      });
      if (res.status !== 201) { showError("Registration failed"); return; }
      await setToken(res.data.jwttoken);
      if (res.data.user) await setUser(res.data.user);
      showSuccess("Registration successful! Welcome to CGate.");
      if (res.data.user.status === "PENDING") router.replace("/pending");
      else router.replace("/(tabs)/home");
    } catch (e) { showError(e?.response?.data?.error || e?.message || "Registration failed"); }
    finally { setLoading(false); }
  }, [name, email, password, selectedCommunity, selectedBlock, selectedUnit, communities]);

  const DropdownField = ({ label, icon, value, placeholder, onPress, loading: l, disabled, error }) => (
    <View style={styles.fieldGroup}>
      {label && <Text style={[styles.fieldLabel, { color: muted }]}>{label} <Text style={{ color: "#EF4444" }}>*</Text></Text>}
      <TouchableOpacity
        style={[styles.field, { backgroundColor: fieldBg, borderColor: error ? "#EF4444" : borderCol }]}
        onPress={onPress} disabled={l || disabled}
      >
        {l ? <ActivityIndicator size="small" color={iconColor} /> : <Feather name={icon} size={16} color={error ? "#EF4444" : iconColor} />}
        <Text style={[styles.dropdownText, { color: value ? textColor : muted }]} numberOfLines={1}>
          {l ? "Loading..." : (value || placeholder)}
        </Text>
        <Feather name="chevron-down" size={16} color={muted} />
      </TouchableOpacity>
      {!!error && (
        <View style={styles.errRow}>
          <Feather name="alert-circle" size={12} color="#EF4444" />
          <Text style={styles.errText}>{error}</Text>
        </View>
      )}
    </View>
  );

  const SelectModal = ({ visible, title, data, onClose, onSelect, keyField = "id", labelField = "name" }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { borderColor: borderCol }]}>
              <Feather name="x" size={16} color={textColor} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item[keyField]}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.modalItem, { borderBottomColor: borderCol }]} onPress={() => onSelect(item)}>
                <Text style={[styles.modalItemText, { color: textColor }]}>{item[labelField]}</Text>
                <Feather name="chevron-right" size={16} color={muted} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={styles.modalEmpty}>
                <Text style={[styles.modalEmptyText, { color: muted }]}>No options available</Text>
              </View>
            )}
            style={{ maxHeight: 400 }}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bg }]} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.brandRow}>
            <View style={[styles.logoBadge, { backgroundColor: tint }]}>
              <Text style={[styles.logoText, { color: btnTextColor }]}>GZ</Text>
            </View>
            <View>
              <Text style={[styles.brandName, { color: textColor }]}>CGate</Text>
              <Text style={[styles.brandSub, { color: muted }]}>Community Portal</Text>
            </View>
          </View>

          <Text style={[styles.heading, { color: textColor }]}>Create your account</Text>
          <Text style={[styles.subheading, { color: muted }]}>Join your community today</Text>

          <View style={styles.form}>
            <FormField label="Full Name" icon="user" required value={name}
              onChangeText={(v) => { setName(v); if (nameErr) setNameErr(""); }}
              placeholder="Your full name" autoCapitalize="words" autoCorrect={false}
              autoComplete="off" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()}
              error={nameErr} fieldBg={fieldBg} borderCol={borderCol} textColor={textColor} iconColor={iconColor} tint={tint} />

            <FormField label="Email Address" icon="mail" required ref={emailRef} value={email}
              onChangeText={(v) => { setEmail(v); if (emailErr) setEmailErr(""); }}
              placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
              autoCorrect={false} autoComplete="off" returnKeyType="next"
              onSubmitEditing={() => setShowCommunityModal(true)} error={emailErr}
              fieldBg={fieldBg} borderCol={borderCol} textColor={textColor} iconColor={iconColor} tint={tint} />

            <DropdownField label="Community" icon="map-pin" value={selectedCommunityName}
              placeholder={loadingCommunities ? "Loading…" : communities.length === 0 ? "No communities available" : "Select your community"}
              onPress={() => { setShowCommunityModal(true); if (communityErr) setCommunityErr(""); }}
              loading={loadingCommunities} disabled={communities.length === 0} error={communityErr} />

            {selectedCommunity && (
              <DropdownField icon="home" value={selectedBlockName}
                placeholder={loadingBlocks ? "Loading…" : blocks.length === 0 ? "No blocks" : "Select your block (optional)"}
                onPress={() => setShowBlockModal(true)} loading={loadingBlocks}
                disabled={blocks.length === 0} />
            )}

            {selectedBlock && (
              <DropdownField icon="grid" value={selectedUnitName}
                placeholder={loadingUnits ? "Loading…" : units.length === 0 ? "No units" : "Select your unit (optional)"}
                onPress={() => setShowUnitModal(true)} loading={loadingUnits}
                disabled={units.length === 0} />
            )}

            <FormField label="Password" icon="lock" required ref={passwordRef} value={password}
              onChangeText={(v) => { setPassword(v); if (passwordErr) setPasswordErr(""); }}
              placeholder="Min. 8 characters" secureTextEntry={!showPw} autoCapitalize="none"
              autoCorrect={false} autoComplete="off" returnKeyType="done" onSubmitEditing={submit}
              rightIcon={showPw ? "eye-off" : "eye"} onRightIconPress={() => setShowPw(s => !s)}
              error={passwordErr} fieldBg={fieldBg} borderCol={borderCol} textColor={textColor} iconColor={iconColor} tint={tint} />

            <LoadingButton label="Create Account" loadingLabel="Creating account…" loading={loading}
              icon="user-plus" bgColor={tint} textColor={btnTextColor} fullWidth onPress={submit} style={{ marginTop: 4 }} />
            <GoogleSignin />
            <View style={styles.foot}>
              <Text style={[styles.footText, { color: muted }]}>
                Already have an account?{" "}
                <Text style={[styles.link, { color: tint }]} onPress={() => router.push("/login")}>Log in</Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <SelectModal visible={showCommunityModal} title="Select Community" data={communities}
        onClose={() => setShowCommunityModal(false)}
        onSelect={(item) => handleCommunityChange(item.id, item.name)} />

      <SelectModal visible={showBlockModal} title="Select Block" data={blocks}
        onClose={() => setShowBlockModal(false)}
        onSelect={(item) => { setSelectedBlock(item.id); setSelectedBlockName(item.name); setShowBlockModal(false); fetchUnits(item.id); }} />

      <SelectModal visible={showUnitModal} title="Select Unit" data={units}
        onClose={() => setShowUnitModal(false)} labelField="number"
        onSelect={(item) => { setSelectedUnit(item.id); setSelectedUnitName(item.number); setShowUnitModal(false); }} />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 440, padding: 28, borderRadius: 24, borderWidth: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  logoBadge: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  logoText: { fontWeight: "800", fontSize: 18 },
  brandName: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  brandSub: { fontSize: 12, marginTop: 2 },
  heading: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  subheading: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  form: { gap: 0 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  dropdownText: { flex: 1, fontSize: 15 },
  errRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  errText: { color: "#EF4444", fontSize: 12 },
  foot: { marginTop: 16, alignItems: "center" },
  footText: { fontSize: 14 },
  link: { fontWeight: "600", textDecorationLine: "underline" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, maxHeight: "70%", paddingBottom: 32 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalItemText: { fontSize: 15 },
  modalEmpty: { padding: 32, alignItems: "center" },
  modalEmptyText: { fontSize: 14 },
});
