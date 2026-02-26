// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";

import { isAuthed, setToken, setUser } from "@/lib/auth";
import GoogleSignin from "@/components/GoogleSignin";
import Toast from "@/components/Toast";
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
  const [err, setErr] = useState("");
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const { toast, showError, showSuccess, hideToast } = useToast();

  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const fieldBg = theme === "dark" ? "#181818" : "#f3f4f6";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const muted = iconColor;
  const placeholder = iconColor;
  const buttonBg = tint;
  const buttonText = theme === "dark" ? "#11181C" : "#ffffff";

  useEffect(() => {
    (async () => {
      if (await isAuthed()) router.replace("/(tabs)/home");
    })();
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    setLoadingCommunities(true);

    try {
      const response = await axios.get(`${config.backendUrl}/auth/communities`);

      if (response.data.success) {
        setCommunities(response.data.data);
        if (response.data.data.length === 0) {
          showError("No communities available. Please contact administrator.");
        }
      } else {
        showError("Failed to load communities");
      }
    } catch (error) {
      console.error("Error fetching communities:", error);
      showError("Failed to load communities. Please try again.");
    } finally {
      setLoadingCommunities(false);
    }
  };

  const fetchBlocks = async (communityId) => {
    if (!communityId) return;

    setLoadingBlocks(true);
    setBlocks([]);
    setUnits([]);
    setSelectedBlock("");
    setSelectedUnit("");

    try {
      const response = await axios.get(
        `${config.backendUrl}/auth/communities/${communityId}/blocks`,
      );

      if (response.data.success) {
        setBlocks(response.data.data);
      } else {
        showError("Failed to load blocks");
      }
    } catch (error) {
      console.error("Error fetching blocks:", error);
      showError("Failed to load blocks. Please try again.");
    } finally {
      setLoadingBlocks(false);
    }
  };

  const fetchUnits = async (blockId) => {
    if (!blockId) return;

    setLoadingUnits(true);
    setUnits([]);
    setSelectedUnit("");

    try {
      const response = await axios.get(
        `${config.backendUrl}/auth/blocks/${blockId}/units`,
      );

      if (response.data.success) {
        setUnits(response.data.data);
      } else {
        showError("Failed to load units");
      }
    } catch (error) {
      console.error("Error fetching units:", error);
      showError("Failed to load units. Please try again.");
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleCommunityChange = (communityId, communityName) => {
    setSelectedCommunity(communityId);
    setSelectedCommunityName(communityName);
    setShowCommunityModal(false);
    if (communityId) {
      fetchBlocks(communityId);
    } else {
      setBlocks([]);
      setUnits([]);
      setSelectedBlock("");
      setSelectedBlockName("");
      setSelectedUnit("");
      setSelectedUnitName("");
    }
  };

  const handleBlockChange = (blockId, blockName) => {
    setSelectedBlock(blockId);
    setSelectedBlockName(blockName);
    setShowBlockModal(false);
    if (blockId) {
      fetchUnits(blockId);
    } else {
      setUnits([]);
      setSelectedUnit("");
      setSelectedUnitName("");
    }
  };

  const handleUnitChange = (unitId, unitName) => {
    setSelectedUnit(unitId);
    setSelectedUnitName(unitName);
    setShowUnitModal(false);
  };

  const submit = useCallback(async () => {
    if (!name || !email || !password) {
      showError("Please fill in all required fields");
      return;
    }

    // Validate community selection
    if (!selectedCommunity) {
      showError("Please select a community to continue");
      return;
    }

    if (communities.length === 0) {
      showError("No communities available. Please contact administrator.");
      return;
    }

    if(password.length < 8) {
      showError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      // Check existing user
      try {
        const existingUser = await axios.get(
          `${config.backendUrl}/auth/existing-user`,
          {
            params: { email },
          },
        );

        if (existingUser.data.exists) {
          showError("User with this email already exists. Please login.");
          return;
        }
      } catch (existingCheckError) {
        // If the check fails for network reasons, continue with registration
        console.log(
          "Could not check existing user, proceeding with registration",
        );
      }

      const requestData = {
        name,
        email,
        password,
        communityId: selectedCommunity,
        blockId: selectedBlock || null,
        unitId: selectedUnit || null,
      };

      const res = await axios.post(
        `${config.backendUrl}/auth/signup`,
        requestData,
      );

      if (res.status !== 201) {
        showError("User registration failed");
        return;
      }

      await setToken(res.data.jwttoken);
      if (res.data.user) await setUser(res.data.user);

      // Show success message
      showSuccess("Registration successful! Welcome to CGate.");

      // Check user status after registration
      if (res.data.user.status === "PENDING") {
        router.replace("/pending");
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (e) {
      showError(
        e?.response?.data?.error || e?.message || "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  }, [
    name,
    email,
    password,
    selectedCommunity,
    selectedBlock,
    selectedUnit,
    communities,
    showError,
    showSuccess,
  ]);
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <View style={styles.brandRow}>
            <View style={[styles.logoBadge, { backgroundColor: tint }]}>
              <Text style={[styles.logoText, { color: buttonText }]}>GZ</Text>
            </View>
            <View>
              <Text style={[styles.brandName, { color: textColor }]}>
                CGate
              </Text>
              <Text style={[styles.brandSub, { color: muted }]}>
                Community Portal
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <View
              style={[
                styles.field,
                { backgroundColor: fieldBg, borderColor: borderCol },
              ]}
            >
              <Feather
                name="user"
                size={18}
                color={iconColor}
                style={styles.icon}
              />
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={name}
                onChangeText={setName}
                placeholder="Name"
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="next"
                placeholderTextColor={placeholder}
                selectionColor={tint}
              />
            </View>

            <View
              style={[
                styles.field,
                { backgroundColor: fieldBg, borderColor: borderCol },
              ]}
            >
              <Feather
                name="mail"
                size={18}
                color={iconColor}
                style={styles.icon}
              />
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="next"
                placeholderTextColor={placeholder}
                selectionColor={tint}
              />
            </View>

            {/* Community Selection */}
            <TouchableOpacity
              style={[
                styles.field,
                { backgroundColor: fieldBg, borderColor: borderCol },
              ]}
              onPress={() => setShowCommunityModal(true)}
              disabled={loadingCommunities || communities.length === 0}
            >
              {loadingCommunities ? (
                <ActivityIndicator
                  size="small"
                  color={iconColor}
                  style={styles.icon}
                />
              ) : (
                <Feather
                  name="map-pin"
                  size={18}
                  color={iconColor}
                  style={styles.icon}
                />
              )}
              <Text
                style={[
                  styles.dropdownText,
                  {
                    color: selectedCommunityName ? textColor : placeholder,
                  },
                ]}
              >
                {loadingCommunities
                  ? "Loading communities..."
                  : communities.length === 0
                    ? "No communities available"
                    : selectedCommunityName || "Select your community"}
              </Text>
              <Feather name="chevron-down" size={18} color={iconColor} />
            </TouchableOpacity>

            {/* Block Selection */}
            {selectedCommunity && (
              <TouchableOpacity
                style={[
                  styles.field,
                  { backgroundColor: fieldBg, borderColor: borderCol },
                ]}
                onPress={() => setShowBlockModal(true)}
                disabled={loadingBlocks}
              >
                {loadingBlocks ? (
                  <ActivityIndicator
                    size="small"
                    color={iconColor}
                    style={styles.icon}
                  />
                ) : (
                  <Feather
                    name="home"
                    size={18}
                    color={iconColor}
                    style={styles.icon}
                  />
                )}
                <Text
                  style={[
                    styles.dropdownText,
                    {
                      color: selectedBlockName ? textColor : placeholder,
                    },
                  ]}
                >
                  {loadingBlocks
                    ? "Loading blocks..."
                    : blocks.length === 0
                      ? "No blocks available"
                      : selectedBlockName || "Select your block "}
                </Text>
                <Feather name="chevron-down" size={18} color={iconColor} />
              </TouchableOpacity>
            )}

            {/* Unit Selection */}
            {selectedBlock && (
              <TouchableOpacity
                style={[
                  styles.field,
                  { backgroundColor: fieldBg, borderColor: borderCol },
                ]}
                onPress={() => setShowUnitModal(true)}
                disabled={loadingUnits}
              >
                {loadingUnits ? (
                  <ActivityIndicator
                    size="small"
                    color={iconColor}
                    style={styles.icon}
                  />
                ) : (
                  <Feather
                    name="grid"
                    size={18}
                    color={iconColor}
                    style={styles.icon}
                  />
                )}
                <Text
                  style={[
                    styles.dropdownText,
                    {
                      color: selectedUnitName ? textColor : placeholder,
                    },
                  ]}
                >
                  {loadingUnits
                    ? "Loading units..."
                    : units.length === 0
                      ? "No units available"
                      : selectedUnitName || "Select your unit"}
                </Text>
                <Feather name="chevron-down" size={18} color={iconColor} />
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.field,
                { backgroundColor: fieldBg, borderColor: borderCol },
              ]}
            >
              <Feather
                name="lock"
                size={18}
                color={iconColor}
                style={styles.icon}
              />
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="done"
                onSubmitEditing={submit}
                placeholderTextColor={placeholder}
                selectionColor={tint}
              />
              <TouchableOpacity
                style={styles.pwToggle}
                onPress={() => setShowPw((s) => !s)}
              >
                <Feather
                  name={showPw ? "eye-off" : "eye"}
                  size={18}
                  color={iconColor}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.authBtn,
                { backgroundColor: buttonBg },
                loading && styles.authBtnDisabled,
              ]}
              onPress={submit}
              disabled={loading}
            >
              <Feather name="log-in" size={18} color={buttonText} />
              <Text style={[styles.authBtnText, { color: buttonText }]}>
                {loading ? "Signing in…" : "Sign Up"}
              </Text>
            </TouchableOpacity>

            <GoogleSignin />

            <View style={styles.foot}>
              <Text style={[styles.muted, { color: muted }]}>
                Already have an account?{" "}
                <Text
                  style={[styles.link, { color: tint }]}
                  onPress={() => router.push("/login")}
                >
                  Log in
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Community Selection Modal */}
        <Modal
          visible={showCommunityModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCommunityModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Select Community
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCommunityModal(false)}
                  style={styles.modalClose}
                >
                  <Feather name="x" size={24} color={iconColor} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={communities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderColor: borderCol }]}
                    onPress={() =>
                      handleCommunityChange(
                        item.id,
                        `${item.name}${
                          item.address ? ` - ${item.address}` : ""
                        }`,
                      )
                    }
                  >
                    <Text style={[styles.modalItemText, { color: textColor }]}>
                      {item.name}
                      {item.address && (
                        <Text
                          style={[styles.modalItemSubtext, { color: muted }]}
                        >
                          {"\n"}
                          {item.address}
                        </Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.modalList}
              />
            </View>
          </View>
        </Modal>

        {/* Block Selection Modal */}
        <Modal
          visible={showBlockModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBlockModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Select Block
                </Text>
                <TouchableOpacity
                  onPress={() => setShowBlockModal(false)}
                  style={styles.modalClose}
                >
                  <Feather name="x" size={24} color={iconColor} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={blocks}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderColor: borderCol }]}
                    onPress={() =>
                      handleBlockChange(item.id, `Block ${item.name}`)
                    }
                  >
                    <Text style={[styles.modalItemText, { color: textColor }]}>
                      Block {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.modalList}
              />
            </View>
          </View>
        </Modal>

        {/* Unit Selection Modal */}
        <Modal
          visible={showUnitModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowUnitModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Select Unit
                </Text>
                <TouchableOpacity
                  onPress={() => setShowUnitModal(false)}
                  style={styles.modalClose}
                >
                  <Feather name="x" size={24} color={iconColor} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={units}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderColor: borderCol }]}
                    onPress={() =>
                      handleUnitChange(item.id, `Unit ${item.number}`)
                    }
                  >
                    <Text style={[styles.modalItemText, { color: textColor }]}>
                      Unit {item.number}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.modalList}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  logoBadge: {
    height: 44,
    width: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontWeight: "800" },
  brandName: { fontSize: 20, fontWeight: "700" },
  brandSub: { fontSize: 12 },
  form: { marginTop: 8 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    minHeight: 48,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12 },
  dropdownText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  pwToggle: { padding: 8 },
  authBtn: {
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  authBtnDisabled: { opacity: 0.7 },
  authBtnText: { fontWeight: "700" },
  error: { color: "#f87171", marginTop: 10, textAlign: "center" },
  foot: { marginTop: 12, alignItems: "center" },
  muted: {},
  link: { textDecorationLine: "underline", fontWeight: "600" },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: "70%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalClose: {
    padding: 5,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
  modalItemSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
});
