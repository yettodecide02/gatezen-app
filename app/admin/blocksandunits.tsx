// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";

export default function BlocksAndUnits() {
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

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState({});

  // Set blocks as collapsed by default when loaded
  useEffect(() => {
    if (blocks.length > 0) {
      const collapsed = {};
      blocks.forEach((block) => {
        if (collapsedBlocks[block.id] === undefined) {
          collapsed[block.id] = true;
        }
      });
      if (Object.keys(collapsed).length > 0) {
        setCollapsedBlocks((prev) => ({ ...prev, ...collapsed }));
      }
    }
  }, [blocks.length]);

  // Block Form State
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [blockForm, setBlockForm] = useState({ name: "", description: "" });
  const [blockLoading, setBlockLoading] = useState(false);

  // Unit Form State
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitCreationStep, setUnitCreationStep] = useState(1);
  const [unitsToCreate, setUnitsToCreate] = useState("");
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [currentUnitNumber, setCurrentUnitNumber] = useState("");
  const [createdUnits, setCreatedUnits] = useState([]);
  const [unitBlockId, setUnitBlockId] = useState(null);
  const [unitLoading, setUnitLoading] = useState(false);

  const url = config.backendUrl;

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      const res = await axios.get(`${url}/admin/blocks`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId },
      });

      const blocksData = res.data.blocks || res.data.data || res.data;
      setBlocks(Array.isArray(blocksData) ? blocksData : []);
    } catch (error) {
      console.error("Error fetching blocks:", error);
      Alert.alert("Error", "Failed to load blocks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBlocks();
  };

  const handleCreateBlock = async () => {
    if (!blockForm.name.trim()) {
      Alert.alert("Validation Error", "Block name is required");
      return;
    }

    setBlockLoading(true);
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      const payload = { ...blockForm, communityId };

      await axios.post(`${url}/admin/blocks`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", "Block created successfully!");
      setShowBlockModal(false);
      setBlockForm({ name: "", description: "" });
      fetchBlocks();
    } catch (error) {
      console.error("Error creating block:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create block",
      );
    } finally {
      setBlockLoading(false);
    }
  };

  const handleUpdateBlock = async () => {
    if (!blockForm.name.trim()) {
      Alert.alert("Validation Error", "Block name is required");
      return;
    }

    setBlockLoading(true);
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      const payload = { ...blockForm, communityId };

      await axios.put(`${url}/admin/blocks/${editingBlock.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", "Block updated successfully!");
      setShowBlockModal(false);
      setBlockForm({ name: "", description: "" });
      setEditingBlock(null);
      fetchBlocks();
    } catch (error) {
      console.error("Error updating block:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update block",
      );
    } finally {
      setBlockLoading(false);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    Alert.alert(
      "Delete Block",
      "Are you sure you want to delete this block? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.delete(`${url}/admin/blocks/${blockId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Success", "Block deleted successfully!");
              fetchBlocks();
            } catch (error) {
              console.error("Error deleting block:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete block",
              );
            }
          },
        },
      ],
    );
  };

  const startEditBlock = (block) => {
    setEditingBlock(block);
    setBlockForm({ name: block.name, description: block.description || "" });
    setShowBlockModal(true);
  };

  const startCreateUnit = (blockId) => {
    setUnitBlockId(blockId);
    setUnitCreationStep(1);
    setUnitsToCreate(1);
    setCurrentUnitIndex(0);
    setCurrentUnitNumber("");
    setCreatedUnits([]);
    setShowUnitModal(true);
  };

  const handleUnitCountSubmit = () => {
    if (unitsToCreate < 1 || unitsToCreate > 50) {
      Alert.alert("Invalid Count", "Please enter a number between 1 and 50");
      return;
    }
    setUnitCreationStep(2);
    setCurrentUnitIndex(0);
    setCurrentUnitNumber("");
  };

  const handleCreateUnit = async () => {
    if (!currentUnitNumber.trim()) {
      Alert.alert("Validation Error", "Unit number is required");
      return;
    }

    setUnitLoading(true);
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      const payload = {
        number: currentUnitNumber.trim(),
        blockId: unitBlockId,
        communityId,
      };

      await axios.post(`${url}/admin/units`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newUnit = { number: currentUnitNumber.trim(), created: true };
      setCreatedUnits((prev) => [...prev, newUnit]);

      if (currentUnitIndex + 1 < unitsToCreate) {
        Alert.alert(
          "Success",
          `Unit ${currentUnitNumber} created successfully!`,
        );
        setCurrentUnitIndex((prev) => prev + 1);
        setCurrentUnitNumber("");
      } else {
        Alert.alert(
          "All Units Created",
          `Successfully created ${unitsToCreate} units!`,
        );
        resetUnitForm();
        setShowUnitModal(false);
        fetchBlocks();
      }
    } catch (error) {
      console.error("Error creating unit:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create unit",
      );
    } finally {
      setUnitLoading(false);
    }
  };

  const handleDeleteUnit = async (unitId) => {
    Alert.alert(
      "Delete Unit",
      "Are you sure you want to delete this unit? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.delete(`${url}/admin/units/${unitId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Success", "Unit deleted successfully!");
              fetchBlocks();
            } catch (error) {
              console.error("Error deleting unit:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete unit",
              );
            }
          },
        },
      ],
    );
  };

  const resetUnitForm = () => {
    setUnitCreationStep(1);
    setUnitsToCreate(1);
    setCurrentUnitIndex(0);
    setCurrentUnitNumber("");
    setCreatedUnits([]);
    setUnitBlockId(null);
  };

  const cancelBlockForm = () => {
    setShowBlockModal(false);
    setBlockForm({ name: "", description: "" });
    setEditingBlock(null);
  };

  const cancelUnitForm = () => {
    setShowUnitModal(false);
    resetUnitForm();
  };

  // Calculate statistics
  const stats = {
    totalBlocks: blocks.length,
    totalUnits: blocks.reduce(
      (sum, block) => sum + (block.units?.length || 0),
      0,
    ),
    occupiedUnits: blocks.reduce(
      (sum, block) =>
        sum +
        (block.units?.filter((unit) => unit.residents?.length > 0).length || 0),
      0,
    ),
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
          Loading blocks...
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
                Blocks & Units
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Manage blocks and units in your community
              </Text>
            </View>
          </View>
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
            {[
              {
                label: "Total Blocks",
                value: stats.totalBlocks,
                icon: "home",
                color: "#6366f1",
              },
              {
                label: "Total Units",
                value: stats.totalUnits,
                icon: "grid",
                color: "#06b6d4",
              },
              {
                label: "Occupied",
                value: stats.occupiedUnits,
                icon: "users",
                color: "#10b981",
              },
            ].map((item, index) => (
              <View
                key={index}
                style={[
                  styles.statCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                ]}
              >
                <View style={styles.statHeader}>
                  <View
                    style={[styles.statIcon, { backgroundColor: item.color }]}
                  >
                    <Feather name={item.icon} size={16} color="#ffffff" />
                  </View>
                  <Text style={[styles.statLabel, { color: muted }]}>
                    {item.label}
                  </Text>
                </View>
                <Text style={[styles.statValue, { color: textColor }]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Create Block Button */}
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: tint }]}
            onPress={() => setShowBlockModal(true)}
          >
            <Feather
              name="plus"
              size={16}
              color={theme === "dark" ? "#11181C" : "#ffffff"}
            />
            <Text
              style={[
                styles.createButtonText,
                { color: theme === "dark" ? "#11181C" : "#ffffff" },
              ]}
            >
              Create New Block
            </Text>
          </TouchableOpacity>

          {/* Blocks List */}
          {blocks.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: borderCol }]}>
                <Feather name="home" size={32} color={muted} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                No blocks found
              </Text>
              <Text style={[styles.emptyDesc, { color: muted }]}>
                Create your first block to get started
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: tint }]}
                onPress={() => setShowBlockModal(true)}
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
                  Create Block
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.blocksList}>
              {blocks.map((block) => (
                <View
                  key={block.id}
                  style={[
                    styles.blockCard,
                    { backgroundColor: cardBg, borderColor: borderCol },
                  ]}
                >
                  {/* Block Header */}
                  <View style={styles.blockHeader}>
                    <View style={styles.blockHeaderLeft}>
                      <View
                        style={[
                          styles.blockIcon,
                          {
                            backgroundColor:
                              theme === "dark" ? "#3b4f7a" : "#eef2ff",
                          },
                        ]}
                      >
                        <Feather
                          name="home"
                          size={20}
                          color={theme === "dark" ? "#6366f1" : "#4f46e5"}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.blockName, { color: textColor }]}>
                          Block {block.name}
                        </Text>
                        {block.description && (
                          <Text style={[styles.blockDesc, { color: muted }]}>
                            {block.description}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.blockActions}>
                      <TouchableOpacity
                        onPress={() => startEditBlock(block)}
                        style={[
                          styles.iconButton,
                          { backgroundColor: borderCol },
                        ]}
                      >
                        <Feather name="edit-2" size={16} color={textColor} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteBlock(block.id)}
                        style={[
                          styles.iconButton,
                          {
                            backgroundColor:
                              theme === "dark"
                                ? "rgba(239, 68, 68, 0.2)"
                                : "#fef2f2",
                          },
                        ]}
                      >
                        <Feather name="trash-2" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Units Section */}
                  <View
                    style={[styles.unitsSection, { borderTopColor: borderCol }]}
                  >
                    <View style={styles.unitsSectionHeader}>
                      <TouchableOpacity
                        onPress={() =>
                          setCollapsedBlocks((prev) => ({
                            ...prev,
                            [block.id]: !prev[block.id],
                          }))
                        }
                        style={styles.unitsSectionTitle}
                      >
                        <Feather name="grid" size={16} color="#06b6d4" />
                        <Text
                          style={[
                            styles.unitsSectionText,
                            { color: textColor },
                          ]}
                        >
                          Units ({block.units?.length || 0})
                        </Text>
                        <Feather
                          name={
                            collapsedBlocks[block.id]
                              ? "chevron-down"
                              : "chevron-up"
                          }
                          size={16}
                          color={muted}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => startCreateUnit(block.id)}
                        style={[
                          styles.addUnitButton,
                          { backgroundColor: tint },
                        ]}
                      >
                        <Feather
                          name="plus"
                          size={14}
                          color={theme === "dark" ? "#11181C" : "#ffffff"}
                        />
                        <Text
                          style={[
                            styles.addUnitText,
                            { color: theme === "dark" ? "#11181C" : "#ffffff" },
                          ]}
                        >
                          Add Unit
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {!collapsedBlocks[block.id] && (
                      <>
                        {block.units?.length > 0 ? (
                          <View style={styles.unitsGrid}>
                            {block.units.map((unit) => (
                              <View
                                key={unit.id}
                                style={[
                                  styles.unitCard,
                                  {
                                    backgroundColor:
                                      theme === "dark" ? "#181818" : "#f9fafb",
                                    borderColor: borderCol,
                                  },
                                ]}
                              >
                                <View style={styles.unitHeader}>
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={[
                                        styles.unitNumber,
                                        { color: textColor },
                                      ]}
                                    >
                                      Unit {unit.number}
                                    </Text>
                                    {unit.residents?.length > 0 ? (
                                      <View style={styles.residentInfo}>
                                        <Feather
                                          name="users"
                                          size={10}
                                          color="#059669"
                                        />
                                        <Text
                                          style={[
                                            styles.residentText,
                                            { color: "#059669" },
                                          ]}
                                          numberOfLines={1}
                                        >
                                          {unit.residents[0].name}
                                          {unit.residents.length > 1 &&
                                            ` +${unit.residents.length - 1}`}
                                        </Text>
                                      </View>
                                    ) : (
                                      <Text
                                        style={[
                                          styles.vacantText,
                                          { color: muted },
                                        ]}
                                      >
                                        Vacant
                                      </Text>
                                    )}
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => handleDeleteUnit(unit.id)}
                                    style={[
                                      styles.deleteUnitButton,
                                      {
                                        backgroundColor:
                                          theme === "dark"
                                            ? "rgba(239, 68, 68, 0.2)"
                                            : "#fef2f2",
                                      },
                                    ]}
                                  >
                                    <Feather
                                      name="trash-2"
                                      size={12}
                                      color="#ef4444"
                                    />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.emptyUnits,
                              {
                                backgroundColor:
                                  theme === "dark" ? "#181818" : "#f9fafb",
                                borderColor: borderCol,
                              },
                            ]}
                          >
                            <Text
                              style={[styles.emptyUnitsText, { color: muted }]}
                            >
                              No units in this block yet. Click "Add Unit" to
                              create one.
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Block Form Modal */}
      <Modal
        visible={showBlockModal}
        transparent
        animationType="fade"
        onRequestClose={cancelBlockForm}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {editingBlock ? "Edit Block" : "Create New Block"}
              </Text>
              <TouchableOpacity onPress={cancelBlockForm}>
                <Feather name="x" size={24} color={muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: textColor }]}>
                  Block Name <Text style={{ color: "#ef4444" }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme === "dark" ? "#181818" : "#f9fafb",
                      color: textColor,
                      borderColor: borderCol,
                    },
                  ]}
                  value={blockForm.name}
                  onChangeText={(text) =>
                    setBlockForm({ ...blockForm, name: text })
                  }
                  placeholder="e.g., A, B, Tower 1"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: textColor }]}>
                  Description
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      backgroundColor: theme === "dark" ? "#181818" : "#f9fafb",
                      color: textColor,
                      borderColor: borderCol,
                    },
                  ]}
                  value={blockForm.description}
                  onChangeText={(text) =>
                    setBlockForm({ ...blockForm, description: text })
                  }
                  placeholder="Optional description"
                  placeholderTextColor={muted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={cancelBlockForm}
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    { borderColor: borderCol },
                  ]}
                >
                  <Text style={[styles.cancelButtonText, { color: textColor }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={editingBlock ? handleUpdateBlock : handleCreateBlock}
                  style={[
                    styles.modalButton,
                    styles.submitButton,
                    { backgroundColor: tint },
                  ]}
                  disabled={blockLoading}
                >
                  {blockLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={theme === "dark" ? "#11181C" : "#ffffff"}
                    />
                  ) : (
                    <>
                      <Feather
                        name="save"
                        size={16}
                        color={theme === "dark" ? "#11181C" : "#ffffff"}
                      />
                      <Text
                        style={[
                          styles.submitButtonText,
                          { color: theme === "dark" ? "#11181C" : "#ffffff" },
                        ]}
                      >
                        {editingBlock ? "Update Block" : "Create Block"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unit Form Modal */}
      <Modal
        visible={showUnitModal}
        transparent
        animationType="fade"
        onRequestClose={cancelUnitForm}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {unitCreationStep === 1
                  ? "Create Units"
                  : `Create Unit ${currentUnitIndex + 1} of ${unitsToCreate}`}
              </Text>
              <TouchableOpacity onPress={cancelUnitForm}>
                <Feather name="x" size={24} color={muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {unitCreationStep === 1 ? (
                <>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: textColor }]}>
                      How many units do you want to create?{" "}
                      <Text style={{ color: "#ef4444" }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor:
                            theme === "dark" ? "#181818" : "#f9fafb",
                          color: textColor,
                          borderColor: borderCol,
                        },
                      ]}
                      value={String(unitsToCreate)}
                      onChangeText={(text) =>
                        setUnitsToCreate(parseInt(text) || "")
                      }
                      keyboardType="number-pad"
                      placeholder="Enter number of units"
                      placeholderTextColor={muted}
                    />
                    <Text style={[styles.helperText, { color: muted }]}>
                      You can create up to 50 units at once
                    </Text>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      onPress={cancelUnitForm}
                      style={[
                        styles.modalButton,
                        styles.cancelButton,
                        { borderColor: borderCol },
                      ]}
                    >
                      <Text
                        style={[styles.cancelButtonText, { color: textColor }]}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleUnitCountSubmit}
                      style={[
                        styles.modalButton,
                        styles.submitButton,
                        { backgroundColor: tint },
                      ]}
                    >
                      <Text
                        style={[
                          styles.submitButtonText,
                          { color: theme === "dark" ? "#11181C" : "#ffffff" },
                        ]}
                      >
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {createdUnits.length > 0 && (
                    <View
                      style={[
                        styles.createdUnitsBox,
                        {
                          backgroundColor:
                            theme === "dark"
                              ? "rgba(16, 185, 129, 0.2)"
                              : "#d1fae5",
                          borderColor: theme === "dark" ? "#065f46" : "#a7f3d0",
                        },
                      ]}
                    >
                      <View style={styles.createdUnitsHeader}>
                        <Feather
                          name="check-circle"
                          size={16}
                          color="#059669"
                        />
                        <Text
                          style={[
                            styles.createdUnitsTitle,
                            { color: "#059669" },
                          ]}
                        >
                          Created Units:
                        </Text>
                      </View>
                      <View style={styles.createdUnitsList}>
                        {createdUnits.map((unit, index) => (
                          <View key={index} style={styles.createdUnitBadge}>
                            <Text
                              style={[
                                styles.createdUnitText,
                                { color: "#059669" },
                              ]}
                            >
                              {unit.number}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: textColor }]}>
                      Unit {currentUnitIndex + 1} Number{" "}
                      <Text style={{ color: "#ef4444" }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor:
                            theme === "dark" ? "#181818" : "#f9fafb",
                          color: textColor,
                          borderColor: borderCol,
                        },
                      ]}
                      value={currentUnitNumber}
                      onChangeText={setCurrentUnitNumber}
                      placeholder="e.g., 101, A-01, 1A"
                      placeholderTextColor={muted}
                      autoFocus
                    />
                    <Text style={[styles.helperText, { color: muted }]}>
                      Press OK to create this unit
                    </Text>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      onPress={() => {
                        if (createdUnits.length > 0) {
                          Alert.alert(
                            "Units Created",
                            `Created ${createdUnits.length} units successfully`,
                          );
                          resetUnitForm();
                          setShowUnitModal(false);
                          fetchBlocks();
                        } else {
                          setUnitCreationStep(1);
                        }
                      }}
                      style={[
                        styles.modalButton,
                        styles.cancelButton,
                        { borderColor: borderCol },
                      ]}
                    >
                      <Text
                        style={[styles.cancelButtonText, { color: textColor }]}
                      >
                        {createdUnits.length > 0 ? "Finish" : "Back"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleCreateUnit}
                      style={[
                        styles.modalButton,
                        styles.submitButton,
                        { backgroundColor: tint },
                      ]}
                      disabled={unitLoading}
                    >
                      {unitLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={theme === "dark" ? "#11181C" : "#ffffff"}
                        />
                      ) : (
                        <>
                          <Feather
                            name="save"
                            size={16}
                            color={theme === "dark" ? "#11181C" : "#ffffff"}
                          />
                          <Text
                            style={[
                              styles.submitButtonText,
                              {
                                color: theme === "dark" ? "#11181C" : "#ffffff",
                              },
                            ]}
                          >
                            OK
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: "31%",
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
  blocksList: {
    gap: 16,
  },
  blockCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  blockHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  blockIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  blockName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  blockDesc: {
    fontSize: 13,
  },
  blockActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  unitsSection: {
    padding: 16,
    borderTopWidth: 1,
  },
  unitsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  unitsSectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unitsSectionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addUnitButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addUnitText: {
    fontSize: 12,
    fontWeight: "600",
  },
  unitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  unitCard: {
    width: "31%",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  unitHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  unitNumber: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  residentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  residentText: {
    fontSize: 10,
    flex: 1,
  },
  vacantText: {
    fontSize: 10,
    fontStyle: "italic",
  },
  deleteUnitButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyUnits: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
  },
  emptyUnitsText: {
    fontSize: 12,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
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
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 11,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {},
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  createdUnitsBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  createdUnitsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  createdUnitsTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  createdUnitsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  createdUnitBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  createdUnitText: {
    fontSize: 10,
    fontWeight: "500",
  },
});
