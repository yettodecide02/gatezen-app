// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";

export default function GatekeeperPackagesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  const backendUrl =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    process.env.EXPO_BACKEND_URL ||
    "http://localhost:3000";

  const [packages, setPackages] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [newPackage, setNewPackage] = useState({
    userId: "",
    image: "",
    name: "",
  });
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // Filter states
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    (async () => {
      const [t, u] = await Promise.all([getToken(), getUser()]);
      setToken(t);
      setUser(u);
    })();
  }, []);

  useEffect(() => {
    if (token && user) {
      loadPackages();
      loadResidents();
    }
  }, [token, user]);

  const loadResidents = async () => {
    try {
      const res = await axios.get(`${backendUrl}/gatekeeper/residents`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId: user.communityId },
      });
      setResidents(res.data || []);
    } catch (err) {
      console.error("Error loading residents:", err);
    }
  };

  const loadPackages = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${backendUrl}/gatekeeper/packages`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId: user.communityId },
      });
      const pkgs = res.data || [];
      setAllPackages(pkgs);
      setPackages(pkgs);

      // Extract unique blocks
      const uniqueBlocks = [
        ...new Set(pkgs.map((p) => p.user?.unit?.block?.name).filter(Boolean)),
      ];
      setBlocks(uniqueBlocks.map((name) => ({ name })));
    } catch (err) {
      console.error("Error loading packages:", err);
      setError("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permissions");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const base64 = `data:image/jpeg;base64,${asset.base64}`;
      setNewPackage({ ...newPackage, image: base64 });
    }
  };

  const createPackage = async () => {
    if (!newPackage.userId) {
      Alert.alert("Error", "Please select a user");
      return;
    }
    if (!newPackage.image) {
      Alert.alert("Error", "Please upload an image");
      return;
    }
    if (!newPackage.name) {
      Alert.alert("Error", "Please enter a package name");
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${backendUrl}/gatekeeper/packages`,
        {
          userId: newPackage.userId,
          communityId: user.communityId,
          image: newPackage.image,
          name: newPackage.name,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowCreateModal(false);
      setNewPackage({ userId: "", image: "", name: "" });
      await loadPackages();
    } catch (err) {
      console.error(err);
      setError("Failed to create package");
    } finally {
      setLoading(false);
    }
  };

  const updatePackageStatus = async (pkgId, newStatus) => {
    try {
      await axios.put(
        `${backendUrl}/gatekeeper/packages/${pkgId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadPackages();
    } catch (err) {
      console.error("Error updating package:", err);
      setError("Failed to update package status");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter logic
  useEffect(() => {
    if (selectedBlock) {
      const blockPackages = allPackages.filter(
        (p) => p.user?.unit?.block?.name === selectedBlock
      );
      const uniqueUnits = [
        ...new Set(
          blockPackages.map((p) => p.user?.unit?.number).filter(Boolean)
        ),
      ];
      setUnits(uniqueUnits.map((number) => ({ number })));
    } else {
      setUnits([]);
      setSelectedUnit("");
    }
  }, [selectedBlock, allPackages]);

  useEffect(() => {
    let filtered = allPackages;

    if (selectedBlock) {
      filtered = filtered.filter(
        (p) => p.user?.unit?.block?.name === selectedBlock
      );
    }

    if (selectedUnit) {
      filtered = filtered.filter((p) => p.user?.unit?.number === selectedUnit);
    }

    setPackages(filtered);
  }, [selectedBlock, selectedUnit, allPackages]);

  const clearFilters = () => {
    setSelectedBlock("");
    setSelectedUnit("");
    setPackages(allPackages);
  };

  const activeFilterCount = (selectedBlock ? 1 : 0) + (selectedUnit ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top + 16 }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View>
              <Text style={{ color: text, fontSize: 24, fontWeight: "800" }}>
                Package Management
              </Text>
              <Text style={{ color: icon as any, fontSize: 14, marginTop: 2 }}>
                Track and manage resident packages
              </Text>
            </View>
            <TouchableOpacity
              onPress={loadPackages}
              style={[
                styles.refreshBtn,
                {
                  borderColor: border,
                  backgroundColor: theme === "dark" ? "#1F1F1F" : "#F9FAFB",
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={icon as any} />
              ) : (
                <Feather name="refresh-cw" size={20} color={icon as any} />
              )}
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              style={[
                styles.button,
                {
                  backgroundColor: activeFilterCount > 0 ? "#2563EB" : card,
                  borderColor: activeFilterCount > 0 ? "#2563EB" : border,
                  flex: 1,
                  position: "relative",
                },
              ]}
            >
              <Feather
                name="filter"
                size={16}
                color={activeFilterCount > 0 ? "#fff" : (icon as any)}
              />
              <Text
                style={{
                  color: activeFilterCount > 0 ? "#fff" : text,
                  fontWeight: "600",
                }}
              >
                Filter
              </Text>
              {activeFilterCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    backgroundColor: "#EF4444",
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}
                  >
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={[styles.button, { backgroundColor: "#2563EB", flex: 1 }]}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                New Package
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: icon as any, fontSize: 14, fontWeight: "600" }}
            >
              Active Filters:
            </Text>
            {selectedBlock && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "#EEF2FF",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#C7D2FE",
                }}
              >
                <Text
                  style={{ color: "#2563EB", fontSize: 12, fontWeight: "600" }}
                >
                  Block: {selectedBlock}
                </Text>
                <TouchableOpacity onPress={() => setSelectedBlock("")}>
                  <Feather name="x" size={14} color="#2563EB" />
                </TouchableOpacity>
              </View>
            )}
            {selectedUnit && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "#EEF2FF",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#C7D2FE",
                }}
              >
                <Text
                  style={{ color: "#2563EB", fontSize: 12, fontWeight: "600" }}
                >
                  Unit: {selectedUnit}
                </Text>
                <TouchableOpacity onPress={() => setSelectedUnit("")}>
                  <Feather name="x" size={14} color="#2563EB" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={clearFilters}>
              <Text
                style={{ color: "#EF4444", fontSize: 12, fontWeight: "600" }}
              >
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View
            style={{
              backgroundColor: "#FEE2E2",
              borderColor: "#FECACA",
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ color: "#B91C1C" }}>{error}</Text>
          </View>
        )}

        {/* Packages List */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <Text style={{ color: text, fontSize: 18, fontWeight: "800" }}>
              Pending Packages ({packages.length})
            </Text>
          </View>

          {loading && packages.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={{ color: icon as any, marginTop: 12 }}>
                Loading packages...
              </Text>
            </View>
          ) : packages.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Feather name="package" size={32} color="#9CA3AF" />
              </View>
              <Text
                style={{
                  color: text,
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                No pending packages
              </Text>
              <Text style={{ color: icon as any, fontSize: 14 }}>
                Packages will appear here when they arrive
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {packages.map((pkg) => (
                <View
                  key={pkg.id}
                  style={{
                    backgroundColor: card,
                    borderColor: border,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  {/* Header */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          backgroundColor: "#EEF2FF",
                          borderRadius: 28,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="user" size={22} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: text,
                            fontSize: 16,
                            fontWeight: "700",
                            marginBottom: 4,
                          }}
                        >
                          {pkg.user?.name || "Unknown User"}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          <Feather name="home" size={14} color={icon as any} />
                          <Text style={{ color: icon as any, fontSize: 12 }}>
                            {pkg.user?.unit?.block?.name
                              ? `Block ${pkg.user.unit.block.name}`
                              : "No Block"}{" "}
                            •{" "}
                            {pkg.user?.unit?.number
                              ? `Unit ${pkg.user.unit.number}`
                              : "No Unit"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor:
                          pkg.status === "PENDING"
                            ? "#FEF3C7"
                            : pkg.status === "PICKED"
                            ? "#D1FAE5"
                            : "#F3F4F6",
                        borderWidth: 1,
                        borderColor:
                          pkg.status === "PENDING"
                            ? "#FCD34D"
                            : pkg.status === "PICKED"
                            ? "#6EE7B7"
                            : "#E5E7EB",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Feather
                        name={
                          pkg.status === "PENDING" ? "clock" : "check-circle"
                        }
                        size={12}
                        color={
                          pkg.status === "PENDING"
                            ? "#B45309"
                            : pkg.status === "PICKED"
                            ? "#059669"
                            : "#6B7280"
                        }
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color:
                            pkg.status === "PENDING"
                              ? "#B45309"
                              : pkg.status === "PICKED"
                              ? "#059669"
                              : "#6B7280",
                        }}
                      >
                        {pkg.status}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    {pkg.image && (
                      <TouchableOpacity
                        onPress={() => setSelectedImage(pkg.image)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          backgroundColor: "#EEF2FF",
                          borderColor: "#C7D2FE",
                          borderWidth: 1,
                          borderRadius: 8,
                        }}
                      >
                        <Feather name="image" size={14} color="#2563EB" />
                        <Text
                          style={{
                            color: "#2563EB",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          View Image
                        </Text>
                      </TouchableOpacity>
                    )}

                    {pkg.status === "PENDING" && (
                      <TouchableOpacity
                        onPress={() => updatePackageStatus(pkg.id, "PICKED")}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          backgroundColor: "#10B981",
                          borderRadius: 8,
                        }}
                      >
                        <Feather name="check-circle" size={14} color="#fff" />
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          Mark Collected
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              maxWidth: "100%",
              maxHeight: "90%",
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 10,
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 8,
              }}
              onPress={() => setSelectedImage(null)}
            >
              <Feather name="x" size={20} color="#374151" />
            </TouchableOpacity>
            <Image
              source={{ uri: selectedImage }}
              style={{
                width: 400,
                height: 400,
                resizeMode: "contain",
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              maxHeight: "90%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#111827",
                marginBottom: 20,
              }}
            >
              Create New Package
            </Text>

            <ScrollView
              style={{ maxHeight: 500 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: 16 }}>
                {/* Resident Picker */}
                <View>
                  <Text style={styles.label}>
                    Select Resident <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 8,
                      backgroundColor: "#fff",
                    }}
                  >
                    <TouchableOpacity
                      style={{ padding: 12 }}
                      onPress={() => {
                        Alert.alert(
                          "Select Resident",
                          "",
                          residents.map((r) => ({
                            text: `${r.name} - Block ${
                              r.unit?.block?.name || "N/A"
                            }, Unit ${r.unit?.number || "N/A"}`,
                            onPress: () =>
                              setNewPackage({ ...newPackage, userId: r.id }),
                          })),
                          { cancelable: true }
                        );
                      }}
                    >
                      <Text
                        style={{
                          color: newPackage.userId ? "#111827" : "#9CA3AF",
                        }}
                      >
                        {newPackage.userId
                          ? residents.find((r) => r.id === newPackage.userId)
                              ?.name
                          : "Select a resident..."}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Package Name */}
                <View>
                  <Text style={styles.label}>
                    Package Name <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <TextInput
                    value={newPackage.name}
                    onChangeText={(text) =>
                      setNewPackage({ ...newPackage, name: text })
                    }
                    placeholder="Enter package name"
                    style={{
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 8,
                      padding: 12,
                      color: "#111827",
                    }}
                  />
                </View>

                {/* Image Upload */}
                <View>
                  <Text style={styles.label}>
                    Package Image <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={handleImageUpload}
                    style={{
                      borderWidth: 2,
                      borderColor: "#D1D5DB",
                      borderStyle: "dashed",
                      borderRadius: 8,
                      padding: 16,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="upload" size={18} color="#6B7280" />
                    <Text
                      style={{ color: "#6B7280", fontSize: 14, marginTop: 8 }}
                    >
                      {newPackage.image
                        ? "Image uploaded - Tap to change"
                        : "Tap to upload image"}
                    </Text>
                  </TouchableOpacity>
                  {newPackage.image && (
                    <Image
                      source={{ uri: newPackage.image }}
                      style={{
                        width: "100%",
                        height: 128,
                        borderRadius: 8,
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: "#D1D5DB",
                      }}
                      resizeMode="cover"
                    />
                  )}
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCreateModal(false);
                      setNewPackage({ userId: "", image: "", name: "" });
                    }}
                    disabled={loading}
                    style={{
                      flex: 1,
                      backgroundColor: "#F3F4F6",
                      padding: 12,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#6B7280", fontWeight: "600" }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={createPackage}
                    disabled={
                      loading ||
                      !newPackage.userId ||
                      !newPackage.image ||
                      !newPackage.name
                    }
                    style={{
                      flex: 1,
                      backgroundColor:
                        loading ||
                        !newPackage.userId ||
                        !newPackage.image ||
                        !newPackage.name
                          ? "#93C5FD"
                          : "#2563EB",
                      padding: 12,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                      {loading ? "Creating..." : "Create Package"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: "80%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                Filter Packages
              </Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 20 }}>
                {/* Block Filter */}
                <View>
                  <Text style={styles.label}>Block</Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 8,
                      backgroundColor: "#fff",
                    }}
                  >
                    <TouchableOpacity
                      style={{ padding: 10}}
                      onPress={() => {
                        const options = [
                          {
                            text: "All Blocks",
                            onPress: () => setSelectedBlock(""),
                          },
                          ...blocks.map((b) => ({
                            text: `Block ${b.name}`,
                            onPress: () => setSelectedBlock(b.name),
                          })),
                        ];
                        Alert.alert("Select Block", "", options, {
                          cancelable: true,
                        });
                      }}
                    >
                      <Text
                        style={{ color: selectedBlock ? "#111827" : "#9CA3AF" }}
                      >
                        {selectedBlock
                          ? `Block ${selectedBlock}`
                          : "All Blocks"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Unit Filter */}
                {selectedBlock && (
                  <View>
                    <Text style={styles.label}>Unit</Text>
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: "#D1D5DB",
                        borderRadius: 8,
                        backgroundColor: "#fff",
                      }}
                    >
                      <TouchableOpacity
                        style={{ padding: 12 }}
                        onPress={() => {
                          const options = [
                            {
                              text: "All Units",
                              onPress: () => setSelectedUnit(""),
                            },
                            ...units.map((u) => ({
                              text: `Unit ${u.number}`,
                              onPress: () => setSelectedUnit(u.number),
                            })),
                          ];
                          Alert.alert("Select Unit", "", options, {
                            cancelable: true,
                          });
                        }}
                      >
                        <Text
                          style={{
                            color: selectedUnit ? "#111827" : "#9CA3AF",
                          }}
                        >
                          {selectedUnit ? `Unit ${selectedUnit}` : "All Units"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Filter Summary */}
                {activeFilterCount > 0 && (
                  <View
                    style={{
                      backgroundColor: "#F3F4F6",
                      padding: 16,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: "#374151",
                        fontSize: 14,
                        fontWeight: "600",
                        marginBottom: 8,
                      }}
                    >
                      Active Filters ({activeFilterCount})
                    </Text>
                    <View style={{ gap: 8 }}>
                      {selectedBlock && (
                        <Text style={{ color: "#6B7280", fontSize: 13 }}>
                          • Block: {selectedBlock}
                        </Text>
                      )}
                      {selectedUnit && (
                        <Text style={{ color: "#6B7280", fontSize: 13 }}>
                          • Unit: {selectedUnit}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Buttons */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      clearFilters();
                      setShowFilterModal(false);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "#F3F4F6",
                      padding: 14,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#6B7280", fontWeight: "600" }}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowFilterModal(false)}
                    style={{
                      flex: 1,
                      backgroundColor: "#2563EB",
                      padding: 14,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                      Apply Filters
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
});
