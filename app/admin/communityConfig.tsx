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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";

const FACILITY_TYPES = [
  { id: "swimming_pool", name: "Swimming Pool", icon: "🏊" },
  { id: "gymnasium", name: "Gymnasium", icon: "🏋️" },
  { id: "tennis_court", name: "Tennis Court", icon: "🎾" },
  { id: "basketball_court", name: "Basketball Court", icon: "🏀" },
  { id: "playground", name: "Playground", icon: "🛝" },
  { id: "clubhouse", name: "Clubhouse", icon: "🏛️" },
  { id: "party_hall", name: "Party Hall", icon: "🎉" },
  { id: "conference_room", name: "Conference Room", icon: "🏢" },
  { id: "library", name: "Library", icon: "📚" },
  { id: "garden", name: "Garden", icon: "🌳" },
  { id: "jogging_track", name: "Jogging Track", icon: "🏃" },
];

const PRICE_TYPES = [
  { id: "per_hour", name: "Per Hour" },
  { id: "per_day", name: "Per Day" },
  { id: "per_week", name: "Per Week" },
  { id: "per_month", name: "Per Month" },
  { id: "one_time", name: "One Time" },
];

const TIME_OPTIONS_START = [
  { value: "06:00", label: "06:00 AM" },
  { value: "08:00", label: "08:00 AM" },
  { value: "09:00", label: "09:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
];

const TIME_OPTIONS_END = [
  { value: "17:00", label: "05:00 PM" },
  { value: "18:00", label: "06:00 PM" },
  { value: "19:00", label: "07:00 PM" },
  { value: "20:00", label: "08:00 PM" },
  { value: "21:00", label: "09:00 PM" },
];

export default function CommunityConfig() {
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

  const [communityData, setCommunityData] = useState({
    name: "",
    description: "",
    address: "",
  });

  const [facilities, setFacilities] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState(null);

  const url = config.backendUrl;

  useEffect(() => {
    const initialFacilities = {};
    FACILITY_TYPES.forEach((type) => {
      initialFacilities[type.id] = {
        enabled: false,
        quantity: 1,
        maxCapacity: 10,
        isPaid: false,
        price: 0,
        priceType: "per_hour",
        operatingHours: "09:00-21:00",
        rules: "",
      };
    });
    setFacilities(initialFacilities);
    loadCommunityData();
  }, []);

  const loadCommunityData = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      if (!communityId) {
        Alert.alert("Error", "Community information not found");
        return;
      }

      const response = await axios.get(`${url}/admin/community`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { communityId },
      });

      if (response.data.success && response.data.data) {
        const community = response.data.data;

        setCommunityData({
          name: community.name || "",
          description: community.description || "",
          address: community.address || "",
        });

        if (community.facilities && community.facilities.length > 0) {
          const facilitiesMap = {};

          FACILITY_TYPES.forEach((type) => {
            facilitiesMap[type.id] = {
              enabled: false,
              quantity: 1,
              maxCapacity: 10,
              isPaid: false,
              price: 0,
              priceType: "per_hour",
              operatingHours: "09:00-21:00",
              rules: "",
            };
          });

          community.facilities.forEach((facility) => {
            facilitiesMap[facility.facilityType] = {
              enabled: facility.enabled,
              quantity: facility.quantity,
              maxCapacity: facility.maxCapacity,
              isPaid: facility.isPaid,
              price: facility.price || 0,
              priceType: facility.priceType || "per_hour",
              operatingHours: facility.operatingHours || "09:00-21:00",
              rules: facility.rules || "",
            };
          });

          setFacilities(facilitiesMap);
        }
      }
    } catch (error) {
      console.error("Error loading community data:", error);
      Alert.alert("Error", "Failed to load community data");
    } finally {
      setInitialLoad(false);
    }
  };

  const updateCommunityData = (field, value) => {
    setCommunityData((prev) => ({ ...prev, [field]: value }));
  };

  const updateFacility = (facilityId, field, value) => {
    setFacilities((prev) => ({
      ...prev,
      [facilityId]: {
        ...prev[facilityId],
        [field]: value,
      },
    }));
  };

  const adjustQuantity = (facilityId, delta) => {
    const currentQuantity = facilities[facilityId]?.quantity || 1;
    const newQuantity = Math.max(1, Math.min(50, currentQuantity + delta));
    updateFacility(facilityId, "quantity", newQuantity);
  };

  const adjustCapacity = (facilityId, delta) => {
    const currentCapacity = facilities[facilityId]?.maxCapacity || 1;
    const newCapacity = Math.max(1, Math.min(1000, currentCapacity + delta));
    updateFacility(facilityId, "maxCapacity", newCapacity);
  };

  const handleSave = async () => {
    if (!communityData.name.trim()) {
      Alert.alert("Validation Error", "Community name is required");
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      const enabledFacilities = Object.entries(facilities)
        .filter(([_, config]) => config.enabled)
        .map(([facilityId, config]) => ({
          facilityType: facilityId,
          ...config,
        }));

      const payload = {
        ...communityData,
        facilities: enabledFacilities,
        communityId,
      };

      const response = await axios.post(`${url}/admin/community`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        Alert.alert(
          "Success",
          response.data.message ||
            "Community configuration saved successfully!",
        );
        await loadCommunityData();
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Failed to save community configuration",
        );
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message ||
          err.message ||
          "Failed to save community configuration",
      );
    } finally {
      setLoading(false);
    }
  };

  const enabledCount = Object.values(facilities).filter(
    (f) => f.enabled,
  ).length;

  if (initialLoad) {
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
          Loading configuration...
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
                Community Configuration
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Configure details and facilities
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading || !communityData.name.trim()}
            style={[
              styles.saveButton,
              { backgroundColor: tint },
              (loading || !communityData.name.trim()) && styles.disabledButton,
            ]}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={theme === "dark" ? "#11181C" : "#ffffff"}
              />
            ) : (
              <Feather
                name="save"
                size={20}
                color={theme === "dark" ? "#11181C" : "#ffffff"}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Community Details */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.cardHeader}>
              <Feather name="map-pin" size={20} color={tint} />
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Community Details
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>
                Community Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme === "dark" ? "#181818" : "#f3f4f6",
                    color: textColor,
                    borderColor: borderCol,
                  },
                ]}
                value={communityData.name}
                onChangeText={(value) => updateCommunityData("name", value)}
                placeholder="Enter community name"
                placeholderTextColor={muted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.textarea,
                  {
                    backgroundColor: theme === "dark" ? "#181818" : "#f3f4f6",
                    color: textColor,
                    borderColor: borderCol,
                  },
                ]}
                value={communityData.description}
                onChangeText={(value) =>
                  updateCommunityData("description", value)
                }
                placeholder="Brief description of your community"
                placeholderTextColor={muted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Address</Text>
              <TextInput
                style={[
                  styles.textarea,
                  {
                    backgroundColor: theme === "dark" ? "#181818" : "#f3f4f6",
                    color: textColor,
                    borderColor: borderCol,
                  },
                ]}
                value={communityData.address}
                onChangeText={(value) => updateCommunityData("address", value)}
                placeholder="Community address"
                placeholderTextColor={muted}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          {/* Facilities Configuration */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.cardHeader}>
              <Feather name="settings" size={20} color={tint} />
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Facilities & Amenities
              </Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: muted }]}>
              Tap on a facility to configure • {enabledCount} enabled
            </Text>

            <View style={styles.facilityGrid}>
              {FACILITY_TYPES.map((facilityType) => {
                const config = facilities[facilityType.id] || {};
                const isEnabled = config.enabled;

                return (
                  <TouchableOpacity
                    key={facilityType.id}
                    onPress={() => setSelectedFacility(facilityType)}
                    style={[
                      styles.facilityCard,
                      {
                        backgroundColor: isEnabled
                          ? theme === "dark"
                            ? "#1a3a2e"
                            : "#d1fae5"
                          : theme === "dark"
                            ? "#181818"
                            : "#f3f4f6",
                        borderColor: isEnabled ? "#10b981" : borderCol,
                      },
                    ]}
                  >
                    {isEnabled && (
                      <View style={styles.enabledBadge}>
                        <Feather name="check-circle" size={14} color="#fff" />
                      </View>
                    )}
                    <Text style={styles.facilityIcon}>{facilityType.icon}</Text>
                    <Text
                      style={[styles.facilityName, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {facilityType.name}
                    </Text>
                    <Text
                      style={[
                        styles.facilityStatus,
                        {
                          color: isEnabled ? "#10b981" : muted,
                        },
                      ]}
                    >
                      {isEnabled ? "Enabled" : "Disabled"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Facility Configuration Modal */}
      {selectedFacility && (
        <Modal
          visible={!!selectedFacility}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedFacility(null)}
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
                <View style={styles.modalHeaderLeft}>
                  <Text style={styles.modalIcon}>{selectedFacility.icon}</Text>
                  <View>
                    <Text style={[styles.modalTitle, { color: textColor }]}>
                      {selectedFacility.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        updateFacility(
                          selectedFacility.id,
                          "enabled",
                          !facilities[selectedFacility.id]?.enabled,
                        )
                      }
                      style={styles.toggleButton}
                    >
                      <Feather
                        name={
                          facilities[selectedFacility.id]?.enabled
                            ? "toggle-right"
                            : "toggle-left"
                        }
                        size={20}
                        color={
                          facilities[selectedFacility.id]?.enabled
                            ? "#10b981"
                            : "#ef4444"
                        }
                      />
                      <Text
                        style={[
                          styles.toggleText,
                          {
                            color: facilities[selectedFacility.id]?.enabled
                              ? "#10b981"
                              : "#ef4444",
                          },
                        ]}
                      >
                        {facilities[selectedFacility.id]?.enabled
                          ? "Enabled"
                          : "Disabled"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedFacility(null)}
                  style={styles.closeButton}
                >
                  <Feather name="x" size={24} color={muted} />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView style={styles.modalBody}>
                {(() => {
                  const config = facilities[selectedFacility.id] || {};

                  return (
                    <View style={styles.modalContent}>
                      {/* Quantity & Capacity */}
                      <View style={styles.row}>
                        <View style={styles.rowItem}>
                          <Text style={[styles.label, { color: textColor }]}>
                            Quantity
                          </Text>
                          <View style={styles.counterRow}>
                            <TouchableOpacity
                              onPress={() =>
                                adjustQuantity(selectedFacility.id, -1)
                              }
                              style={[
                                styles.counterButton,
                                { backgroundColor: borderCol },
                              ]}
                            >
                              <Feather
                                name="minus"
                                size={18}
                                color={textColor}
                              />
                            </TouchableOpacity>
                            <Text
                              style={[
                                styles.counterValue,
                                { color: textColor },
                              ]}
                            >
                              {config.quantity}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                adjustQuantity(selectedFacility.id, 1)
                              }
                              style={[
                                styles.counterButton,
                                { backgroundColor: borderCol },
                              ]}
                            >
                              <Feather
                                name="plus"
                                size={18}
                                color={textColor}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.rowItem}>
                          <Text style={[styles.label, { color: textColor }]}>
                            Max Capacity
                          </Text>
                          <View style={styles.counterRow}>
                            <TouchableOpacity
                              onPress={() =>
                                adjustCapacity(selectedFacility.id, -1)
                              }
                              style={[
                                styles.counterButton,
                                { backgroundColor: borderCol },
                              ]}
                            >
                              <Feather
                                name="minus"
                                size={18}
                                color={textColor}
                              />
                            </TouchableOpacity>
                            <Text
                              style={[
                                styles.counterValue,
                                { color: textColor },
                              ]}
                            >
                              {config.maxCapacity}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                adjustCapacity(selectedFacility.id, 1)
                              }
                              style={[
                                styles.counterButton,
                                { backgroundColor: borderCol },
                              ]}
                            >
                              <Feather
                                name="plus"
                                size={18}
                                color={textColor}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* Payment Toggle */}
                      <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: textColor }]}>
                          Payment Type
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            updateFacility(
                              selectedFacility.id,
                              "isPaid",
                              !config.isPaid,
                            )
                          }
                          style={[
                            styles.paymentButton,
                            {
                              backgroundColor: config.isPaid
                                ? "#d1fae5"
                                : borderCol,
                              borderColor: config.isPaid
                                ? "#10b981"
                                : borderCol,
                            },
                          ]}
                        >
                          {config.isPaid && (
                            <Feather
                              name="dollar-sign"
                              size={18}
                              color="#10b981"
                            />
                          )}
                          <Text
                            style={[
                              styles.paymentButtonText,
                              {
                                color: config.isPaid ? "#10b981" : textColor,
                              },
                            ]}
                          >
                            {config.isPaid ? "Paid" : "Free"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Price Configuration */}
                      {config.isPaid && (
                        <View style={styles.row}>
                          <View style={styles.rowItem}>
                            <Text style={[styles.label, { color: textColor }]}>
                              Price
                            </Text>
                            <TextInput
                              style={[
                                styles.input,
                                {
                                  backgroundColor:
                                    theme === "dark" ? "#181818" : "#f3f4f6",
                                  color: textColor,
                                  borderColor: borderCol,
                                },
                              ]}
                              value={String(config.price)}
                              onChangeText={(value) =>
                                updateFacility(
                                  selectedFacility.id,
                                  "price",
                                  parseFloat(value) || 0,
                                )
                              }
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor={muted}
                            />
                          </View>

                          <View style={styles.rowItem}>
                            <Text style={[styles.label, { color: textColor }]}>
                              Price Type
                            </Text>
                            <View
                              style={[
                                styles.pickerContainer,
                                {
                                  backgroundColor:
                                    theme === "dark" ? "#181818" : "#f3f4f6",
                                  borderColor: borderCol,
                                },
                              ]}
                            >
                              <Picker
                                selectedValue={config.priceType}
                                onValueChange={(value) =>
                                  updateFacility(
                                    selectedFacility.id,
                                    "priceType",
                                    value,
                                  )
                                }
                                style={{ color: textColor }}
                              >
                                {PRICE_TYPES.map((type) => (
                                  <Picker.Item
                                    key={type.id}
                                    label={type.name}
                                    value={type.id}
                                  />
                                ))}
                              </Picker>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* Operating Hours */}
                      <View style={styles.row}>
                        <View style={styles.rowItem}>
                          <Text style={[styles.label, { color: textColor }]}>
                            Start Time
                          </Text>
                          <View
                            style={[
                              styles.pickerContainer,
                              {
                                backgroundColor:
                                  theme === "dark" ? "#181818" : "#f3f4f6",
                                borderColor: borderCol,
                              },
                            ]}
                          >
                            <Picker
                              selectedValue={
                                config.operatingHours.split("-")[0] || "09:00"
                              }
                              onValueChange={(value) => {
                                const end =
                                  config.operatingHours.split("-")[1] ||
                                  "21:00";
                                updateFacility(
                                  selectedFacility.id,
                                  "operatingHours",
                                  `${value}-${end}`,
                                );
                              }}
                              style={{ color: textColor }}
                            >
                              {TIME_OPTIONS_START.map((time) => (
                                <Picker.Item
                                  key={time.value}
                                  label={time.label}
                                  value={time.value}
                                />
                              ))}
                            </Picker>
                          </View>
                        </View>

                        <View style={styles.rowItem}>
                          <Text style={[styles.label, { color: textColor }]}>
                            End Time
                          </Text>
                          <View
                            style={[
                              styles.pickerContainer,
                              {
                                backgroundColor:
                                  theme === "dark" ? "#181818" : "#f3f4f6",
                                borderColor: borderCol,
                              },
                            ]}
                          >
                            <Picker
                              selectedValue={
                                config.operatingHours.split("-")[1] || "21:00"
                              }
                              onValueChange={(value) => {
                                const start =
                                  config.operatingHours.split("-")[0] ||
                                  "09:00";
                                updateFacility(
                                  selectedFacility.id,
                                  "operatingHours",
                                  `${start}-${value}`,
                                );
                              }}
                              style={{ color: textColor }}
                            >
                              {TIME_OPTIONS_END.map((time) => (
                                <Picker.Item
                                  key={time.value}
                                  label={time.label}
                                  value={time.value}
                                />
                              ))}
                            </Picker>
                          </View>
                        </View>
                      </View>

                      {/* Rules */}
                      <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: textColor }]}>
                          Rules & Guidelines
                        </Text>
                        <TextInput
                          style={[
                            styles.textarea,
                            {
                              backgroundColor:
                                theme === "dark" ? "#181818" : "#f3f4f6",
                              color: textColor,
                              borderColor: borderCol,
                            },
                          ]}
                          value={config.rules}
                          onChangeText={(value) =>
                            updateFacility(selectedFacility.id, "rules", value)
                          }
                          placeholder="Specific rules for this facility..."
                          placeholderTextColor={muted}
                          multiline
                          numberOfLines={3}
                        />
                      </View>
                    </View>
                  );
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 12,
    marginBottom: 16,
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 80,
  },
  facilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  facilityCard: {
    width: "30%",
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    alignItems: "center",
    position: "relative",
  },
  enabledBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  facilityIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  facilityName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  facilityStatus: {
    fontSize: 10,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
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
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  modalIcon: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    maxHeight: "80%",
  },
  modalContent: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  rowItem: {
    flex: 1,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    fontSize: 18,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "center",
  },
  paymentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
});
