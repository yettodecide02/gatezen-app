// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";

export default function StaffManagement() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const muted = iconColor;
  const insets = useSafeAreaInsets();

  const [gatekeepers, setGatekeepers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const url = config.backendUrl;

  useEffect(() => {
    fetchGatekeepers();
  }, []);

  const fetchGatekeepers = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      const response = await axios.get(`${url}/admin/gatekeepers`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId },
      });

      setGatekeepers(response.data || []);
    } catch (error) {
      console.error("Error fetching gatekeepers:", error);
      Alert.alert("Error", "Failed to fetch gatekeepers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGatekeepers();
  };

  const handleDelete = async (id) => {
    Alert.alert(
      "Remove Gatekeeper",
      "Are you sure you want to remove this gatekeeper?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setDeleteLoading((prev) => ({ ...prev, [id]: true }));

            try {
              const token = await getToken();
              await axios.delete(`${url}/admin/gatekeepers/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              Alert.alert("Success", "Gatekeeper removed successfully");
              fetchGatekeepers();
            } catch (error) {
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to remove gatekeeper",
              );
            } finally {
              setDeleteLoading((prev) => ({ ...prev, [id]: false }));
            }
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert("Validation Error", "All fields are required");
      return;
    }

    setSubmitting(true);

    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      await axios.post(
        `${url}/admin/gatekeeper-signup`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          communityId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      setFormData({ name: "", email: "", password: "" });
      setShowModal(false);
      Alert.alert("Success", "Gatekeeper created successfully");
      fetchGatekeepers();
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to create gatekeeper",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: gatekeepers.length,
    active: gatekeepers.filter(
      (g) => g.status === "APPROVED" || g.status === "ACTIVE",
    ).length,
    inactive: gatekeepers.filter(
      (g) => g.status !== "APPROVED" && g.status !== "ACTIVE",
    ).length,
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: bg },
        ]}
      >
        <ActivityIndicator size="large" color={tint} />
        <Text style={[styles.loadingText, { color: textColor }]}>
          Loading staff...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Fixed Header */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: Math.max(insets.top, 16),
            backgroundColor: bg,
            borderBottomColor: borderCol,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={24} color={tint} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.title, { color: textColor }]}>
                Staff Management
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Manage gatekeepers and security staff
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={[styles.addButton, { backgroundColor: tint }]}
          >
            <Feather
              name="plus"
              size={20}
              color={theme === "dark" ? "#11181C" : "#ffffff"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Statistics Cards */}
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: "#6366f1" }]}>
                  <Feather name="shield" size={20} color="#ffffff" />
                </View>
                <Text style={[styles.statLabel, { color: muted }]}>
                  Total Staff
                </Text>
              </View>
              <Text style={[styles.statValue, { color: textColor }]}>
                {stats.total}
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: "#10b981" }]}>
                  <Feather name="check-circle" size={20} color="#ffffff" />
                </View>
                <Text style={[styles.statLabel, { color: muted }]}>Active</Text>
              </View>
              <Text style={[styles.statValue, { color: textColor }]}>
                {stats.active}
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: "#6b7280" }]}>
                  <Feather name="user" size={20} color="#ffffff" />
                </View>
                <Text style={[styles.statLabel, { color: muted }]}>
                  Inactive
                </Text>
              </View>
              <Text style={[styles.statValue, { color: textColor }]}>
                {stats.inactive}
              </Text>
            </View>
          </View>

          {/* Gatekeepers List */}
          {gatekeepers.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: borderCol }]}>
                <Feather name="shield" size={32} color={muted} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                No gatekeepers found
              </Text>
              <Text style={[styles.emptyDesc, { color: muted }]}>
                Add your first gatekeeper to get started
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: tint }]}
                onPress={() => setShowModal(true)}
              >
                <Feather
                  name="plus"
                  size={16}
                  color={theme === "dark" ? "#11181C" : "#ffffff"}
                />
                <Text
                  style={[
                    styles.emptyButtonText,
                    { color: theme === "dark" ? "#11181C" : "#ffffff" },
                  ]}
                >
                  Add Gatekeeper
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <Text style={[styles.listTitle, { color: textColor }]}>
                All Gatekeepers ({gatekeepers.length})
              </Text>

              {gatekeepers.map((gatekeeper) => (
                <View
                  key={gatekeeper.id}
                  style={[styles.listItem, { borderBottomColor: borderCol }]}
                >
                  <View style={styles.listItemLeft}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor:
                            theme === "dark" ? "#2d2d3d" : "#eef2ff",
                        },
                      ]}
                    >
                      <Feather name="user" size={20} color="#6366f1" />
                    </View>
                    <View style={styles.listItemInfo}>
                      <Text style={[styles.listItemName, { color: textColor }]}>
                        {gatekeeper.name}
                      </Text>
                      <Text style={[styles.listItemEmail, { color: muted }]}>
                        {gatekeeper.email}
                      </Text>
                      <View style={styles.badges}>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: "#dbeafe",
                              borderColor: "#93c5fd",
                            },
                          ]}
                        >
                          <Text
                            style={[styles.badgeText, { color: "#1e40af" }]}
                          >
                            {gatekeeper.role || "GATEKEEPER"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor:
                                gatekeeper.status === "APPROVED" ||
                                gatekeeper.status === "ACTIVE"
                                  ? "#d1fae5"
                                  : "#fee2e2",
                              borderColor:
                                gatekeeper.status === "APPROVED" ||
                                gatekeeper.status === "ACTIVE"
                                  ? "#6ee7b7"
                                  : "#fca5a5",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color:
                                  gatekeeper.status === "APPROVED" ||
                                  gatekeeper.status === "ACTIVE"
                                    ? "#065f46"
                                    : "#991b1b",
                              },
                            ]}
                          >
                            {gatekeeper.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(gatekeeper.id)}
                    disabled={deleteLoading[gatekeeper.id]}
                    style={[
                      styles.deleteButton,
                      deleteLoading[gatekeeper.id] && styles.disabledButton,
                    ]}
                  >
                    {deleteLoading[gatekeeper.id] ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Gatekeeper Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            {/* Modal Header */}
            <View
              style={[
                styles.modalHeader,
                { backgroundColor: cardBg, borderBottomColor: borderCol },
              ]}
            >
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Create New Gatekeeper
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color={muted} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: textColor }]}>
                  Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Feather
                    name="user"
                    size={18}
                    color={muted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputWithIcon,
                      {
                        backgroundColor:
                          theme === "dark" ? "#181818" : "#f3f4f6",
                        color: textColor,
                        borderColor: borderCol,
                      },
                    ]}
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                    placeholder="Enter name"
                    placeholderTextColor={muted}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: textColor }]}>
                  Email <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Feather
                    name="mail"
                    size={18}
                    color={muted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputWithIcon,
                      {
                        backgroundColor:
                          theme === "dark" ? "#181818" : "#f3f4f6",
                        color: textColor,
                        borderColor: borderCol,
                      },
                    ]}
                    value={formData.email}
                    onChangeText={(text) =>
                      setFormData({ ...formData, email: text })
                    }
                    placeholder="Enter email"
                    placeholderTextColor={muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: textColor }]}>
                  Password <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputWithButton,
                      {
                        backgroundColor:
                          theme === "dark" ? "#181818" : "#f3f4f6",
                        color: textColor,
                        borderColor: borderCol,
                      },
                    ]}
                    value={formData.password}
                    onChangeText={(text) =>
                      setFormData({ ...formData, password: text })
                    }
                    placeholder="Enter password"
                    placeholderTextColor={muted}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color={muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: borderCol }]}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { borderColor: borderCol },
                ]}
              >
                <Text style={[styles.cancelButtonText, { color: muted }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  { backgroundColor: tint },
                  submitting && styles.disabledButton,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator
                    size="small"
                    color={theme === "dark" ? "#11181C" : "#ffffff"}
                  />
                ) : (
                  <Text
                    style={[
                      styles.submitButtonText,
                      { color: theme === "dark" ? "#11181C" : "#ffffff" },
                    ]}
                  >
                    Create Gatekeeper
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  listItemEmail: {
    fontSize: 12,
    marginBottom: 6,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 48,
    alignItems: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
  inputWithButton: {
    paddingRight: 40,
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    top: 12,
    zIndex: 1,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  submitButton: {
    // backgroundColor will be set dynamically
  },
  submitButtonText: {
    fontWeight: "600",
  },
});
