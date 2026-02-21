// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import axios from "axios";
import { router } from "expo-router";
import { useToast } from "@/hooks/useToast";
import supabase from "@/lib/supabase";
import { isAuthed, setToken, setUser } from "@/lib/auth";
import { config } from "@/lib/config";

export default function RegisterScreen() {
  const { showError, showSuccess } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Goo");
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

  // Modal states
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  useEffect(() => {
    (async () => {
      console.log("in residentform");

      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setName(data.user.user_metadata.full_name);
          setEmail(data.user.email);
          setPassword(config.googleSignupPassword);
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Fetch communities when step 2 is reached
  useEffect(() => {
    if (currentStep === 2 && communities.length === 0) {
      fetchCommunities();
    }
  }, [currentStep]);

  const fetchCommunities = async () => {
    setLoadingCommunities(true);
    try {
      const res = await axios.get(config.backendUrl + "/auth/communities");
      if (res.data.success) {
        setCommunities(res.data.data);
        showSuccess("Communities loaded");
      } else {
        showError("Failed to load communities");
      }
    } catch (err) {
      console.error(err);
      showError("Error fetching communities");
    } finally {
      setLoadingCommunities(false);
    }
  };

  const fetchBlocks = async (communityId: string) => {
    if (!communityId) return;
    setLoadingBlocks(true);
    try {
      const res = await axios.get(
        `${config.backendUrl}/auth/communities/${communityId}/blocks`,
      );
      if (res.data.success) {
        setBlocks(res.data.data);
      } else {
        showError("Failed to load blocks");
      }
    } catch (err) {
      console.error(err);
      showError("Failed to load blocks");
    } finally {
      setLoadingBlocks(false);
    }
  };

  const fetchUnits = async (blockId: string) => {
    if (!blockId) return;
    setLoadingUnits(true);
    try {
      const res = await axios.get(
        `${config.backendUrl}/auth/blocks/${blockId}/units`,
      );
      if (res.data.success) {
        setUnits(res.data.data);
      } else {
        showError("Failed to load units");
      }
    } catch (err) {
      console.error(err);
      showError("Failed to load units");
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleSelectCommunity = (communityId: string) => {
    setSelectedCommunity(communityId);
    setSelectedBlock(""); // Reset block
    setSelectedUnit(""); // Reset unit
    setBlocks([]);
    setUnits([]);
    setShowCommunityModal(false);
    fetchBlocks(communityId); // Auto-fetch blocks
  };

  const handleSelectBlock = (blockId: string) => {
    setSelectedBlock(blockId);
    setSelectedUnit(""); // Reset unit
    setUnits([]);
    setShowBlockModal(false);
    fetchUnits(blockId); // Auto-fetch units
  };

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnit(unitId);
    setShowUnitModal(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return showError("Enter valid 6-digit OTP");

    setLoading(true);
    try {
      const res = await axios.post(config.backendUrl + "/auth/check-otp", {
        email,
        otp,
      });
      if (res.data.success) {
        setCurrentStep(2);
        showSuccess("OTP verified successfully");
      } else {
        showError("Invalid OTP");
      }
    } catch (err) {
      console.error(err);
      showError("Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const res = await axios.post(config.backendUrl + "/auth/send-otp", {
        email,
        operation: "Sign-up",
      });
      if (res.data.success) showSuccess("OTP resent successfully");
      else showError("Failed to resend OTP");
    } catch (err) {
      console.error(err);
      showError("Error resending OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!selectedCommunity)
      return showError("Please select a community to continue");

    setLoading(true);
    try {
      const req = {
        name,
        email,
        password,
        communityId: selectedCommunity,
        blockId: selectedBlock || null,
        unitId: selectedUnit || null,
      };

      const res = await axios.post(config.backendUrl + "/auth/signup", req);

      if (res.status === 201) {
        setToken(res.data.jwttoken);
        setUser(res.data.user);
        showSuccess("Registration successful");

        if (res.data.user.status === "PENDING") router.replace("/pending");
        else router.replace("/(drawer)/dashboard");
      } else {
        showError("Registration failed");
      }
    } catch (e) {
      console.error(e);
      showError(e.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    items: any[],
    onSelect: (id: string) => void,
    labelKey: string,
    title: string,
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => onSelect(item.id)}
              >
                <Text style={styles.modalItemText}>
                  {item[labelKey] || item.number}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No items available</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>GZ</Text>
          </View>
          <View>
            <Text style={styles.title}>CGate</Text>
            <Text style={styles.subtitle}>Community Portal</Text>
          </View>
        </View>

        {currentStep === 1 ? (
          <View style={styles.card}>
            <Text style={styles.heading}>Verify Email</Text>
            <Text style={styles.text}>
              Enter the 6-digit OTP sent to your email
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />

            <TouchableOpacity onPress={handleResendOTP}>
              <Text style={styles.link}>Resend OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.heading}>Property Details</Text>
            <Text style={styles.text}>Select your community and unit</Text>

            {/* COMMUNITY DROPDOWN */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowCommunityModal(true)}
              disabled={loadingCommunities}
            >
              <Text style={styles.dropdownText}>
                {loadingCommunities
                  ? "Loading communities..."
                  : selectedCommunity
                    ? communities.find((c) => c.id === selectedCommunity)?.name
                    : "Select Community"}
              </Text>
            </TouchableOpacity>

            {/* BLOCK DROPDOWN */}
            {selectedCommunity && (
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowBlockModal(true)}
                disabled={loadingBlocks || blocks.length === 0}
              >
                <Text style={styles.dropdownText}>
                  {loadingBlocks
                    ? "Loading blocks..."
                    : selectedBlock
                      ? "Block " +
                        blocks.find((b) => b.id === selectedBlock)?.name
                      : blocks.length === 0
                        ? "No blocks available"
                        : "Select Block (optional)"}
                </Text>
              </TouchableOpacity>
            )}

            {/* UNIT DROPDOWN */}
            {selectedBlock && (
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowUnitModal(true)}
                disabled={loadingUnits || units.length === 0}
              >
                <Text style={styles.dropdownText}>
                  {loadingUnits
                    ? "Loading units..."
                    : selectedUnit
                      ? "Unit " +
                        units.find((u) => u.id === selectedUnit)?.number
                      : units.length === 0
                        ? "No units available"
                        : "Select Unit (optional)"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={handleCompleteRegistration}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Complete Registration</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* MODALS */}
      {renderPickerModal(
        showCommunityModal,
        () => setShowCommunityModal(false),
        communities,
        handleSelectCommunity,
        "name",
        "Select Community",
      )}
      {renderPickerModal(
        showBlockModal,
        () => setShowBlockModal(false),
        blocks,
        handleSelectBlock,
        "name",
        "Select Block",
      )}
      {renderPickerModal(
        showUnitModal,
        () => setShowUnitModal(false),
        units,
        handleSelectUnit,
        "number",
        "Select Unit",
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  logoBox: {
    width: 60,
    height: 60,
    backgroundColor: "#2563eb",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  logoText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6b7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  text: { color: "#6b7280", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 6,
    marginBottom: 10,
  },
  link: {
    textAlign: "center",
    color: "#2563eb",
    fontWeight: "600",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  dropdownText: { color: "#374151", fontWeight: "500" },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  modalClose: {
    fontSize: 24,
    color: "#6b7280",
    fontWeight: "300",
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalItemText: {
    fontSize: 16,
    color: "#374151",
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    color: "#9ca3af",
    fontSize: 14,
  },
});
