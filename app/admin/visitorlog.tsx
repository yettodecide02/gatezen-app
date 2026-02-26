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
  Modal,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getCommunityId } from "@/lib/auth";
import { config } from "@/lib/config";

export default function VisitorLog() {
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

  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // For date filters
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState("from"); // 'from' or 'to'

  const url = config.backendUrl;

  useEffect(() => {
    fetchVisitors();
  }, [fromDate, toDate]);

  const fetchVisitors = async () => {
    try {
      const token = await getToken();
      const communityId = await getCommunityId();

      const res = await axios.get(`${url}/admin/visitor`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          communityId,
          from: fromDate,
          to: toDate,
        },
      });

      setVisitors(res.data.visitors || []);
    } catch (error) {
      console.error("Error fetching visitors:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVisitors();
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const dateString = selectedDate.toISOString().split("T")[0];
      if (datePickerMode === "from") {
        setFromDate(dateString);
      } else {
        setToDate(dateString);
      }
    }

    if (Platform.OS === "ios") {
      // iOS keeps picker visible
    }
  };

  const openDatePicker = (mode) => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getVisitorTypeConfig = (type) => {
    switch (type) {
      case "DELIVERY":
        return { bg: "#dbeafe", text: "#1e40af", icon: "truck" };
      case "GUEST":
        return { bg: "#d1fae5", text: "#065f46", icon: "user" };
      case "CAB_AUTO":
        return { bg: "#fef3c7", text: "#92400e", icon: "navigation" };
      default:
        return { bg: "#f3f4f6", text: "#374151", icon: "user" };
    }
  };

  const getStatusBadge = (checkIn, checkOut) => {
    if (!checkIn)
      return {
        bg: "#f3f4f6",
        text: "#6b7280",
        label: "Pending",
        icon: "clock",
      };
    if (checkIn && !checkOut)
      return {
        bg: "#d1fae5",
        text: "#065f46",
        label: "Checked In",
        icon: "log-in",
      };
    return {
      bg: "#f3f4f6",
      text: "#6b7280",
      label: "Checked Out",
      icon: "log-out",
    };
  };

  // Extract unique unit numbers for dropdown
  const uniqueUnits = [
    ...new Set(
      visitors
        .map((v) => v.user?.unit?.number)
        .filter((num) => num !== undefined && num !== null),
    ),
  ];

  // Apply filters
  const filteredVisitors = visitors.filter((visitor) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      visitor.name.toLowerCase().includes(search) ||
      visitor.contact?.includes(search) ||
      visitor.vehicleNo?.toLowerCase().includes(search) ||
      visitor.user?.name.toLowerCase().includes(search) ||
      visitor.user?.unit?.number.toLowerCase().includes(search);

    const matchesType =
      typeFilter === "ALL" || visitor.visitorType === typeFilter;

    const matchesUnit =
      unitFilter === "ALL" || visitor.user?.unit?.number === unitFilter;

    return matchesSearch && matchesType && matchesUnit;
  });

  // Stats
  const stats = {
    total: filteredVisitors.length,
    checkedIn: filteredVisitors.filter((v) => v.checkInAt && !v.checkOutAt)
      .length,
    checkedOut: filteredVisitors.filter((v) => v.checkOutAt).length,
    pending: filteredVisitors.filter((v) => !v.checkInAt).length,
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
          Loading visitor log...
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
                Visitor Log
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Track and manage all visitors
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
                label: "Total",
                value: stats.total,
                icon: "users",
                color: "#6366f1",
              },
              {
                label: "Checked In",
                value: stats.checkedIn,
                icon: "log-in",
                color: "#10b981",
              },
              {
                label: "Checked Out",
                value: stats.checkedOut,
                icon: "log-out",
                color: "#6b7280",
              },
              {
                label: "Pending",
                value: stats.pending,
                icon: "clock",
                color: "#f59e0b",
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

          {/* Filters */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <TouchableOpacity
              onPress={() => setFiltersExpanded(!filtersExpanded)}
              style={styles.filterHeader}
            >
              <Text style={[styles.filterTitle, { color: textColor }]}>
                Filters
              </Text>
              <Feather
                name={filtersExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={muted}
              />
            </TouchableOpacity>

            {filtersExpanded && (
              <>
                {/* Search */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: textColor }]}>
                    Search
                  </Text>
                  <View style={styles.searchContainer}>
                    <Feather
                      name="search"
                      size={18}
                      color={muted}
                      style={styles.searchIcon}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.searchInput,
                        {
                          backgroundColor:
                            theme === "dark" ? "#181818" : "#f3f4f6",
                          color: textColor,
                          borderColor: borderCol,
                        },
                      ]}
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                      placeholder="Search by name, contact, vehicle..."
                      placeholderTextColor={muted}
                    />
                  </View>
                </View>

                {/* Date Filters */}
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Text style={[styles.label, { color: textColor }]}>
                      From Date
                    </Text>
                    <TouchableOpacity
                      onPress={() => openDatePicker("from")}
                      style={[
                        styles.input,
                        styles.dateButton,
                        {
                          backgroundColor:
                            theme === "dark" ? "#181818" : "#f3f4f6",
                          borderColor: borderCol,
                        },
                      ]}
                    >
                      <Feather name="calendar" size={16} color={muted} />
                      <Text
                        style={[styles.dateButtonText, { color: textColor }]}
                      >
                        {fromDate}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.rowItem}>
                    <Text style={[styles.label, { color: textColor }]}>
                      To Date
                    </Text>
                    <TouchableOpacity
                      onPress={() => openDatePicker("to")}
                      style={[
                        styles.input,
                        styles.dateButton,
                        {
                          backgroundColor:
                            theme === "dark" ? "#181818" : "#f3f4f6",
                          borderColor: borderCol,
                        },
                      ]}
                    >
                      <Feather name="calendar" size={16} color={muted} />
                      <Text
                        style={[styles.dateButtonText, { color: textColor }]}
                      >
                        {toDate}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={
                      datePickerMode === "from"
                        ? new Date(fromDate)
                        : new Date(toDate)
                    }
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}

                {Platform.OS === "ios" && showDatePicker && (
                  <View style={styles.iosDatePickerActions}>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={[
                        styles.iosDatePickerButton,
                        { backgroundColor: tint },
                      ]}
                    >
                      <Text
                        style={[
                          styles.iosDatePickerButtonText,
                          { color: theme === "dark" ? "#11181C" : "#ffffff" },
                        ]}
                      >
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Type and Unit Filters */}
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Text style={[styles.label, { color: textColor }]}>
                      Visitor Type
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
                        selectedValue={typeFilter}
                        onValueChange={setTypeFilter}
                        style={{ color: textColor }}
                      >
                        <Picker.Item label="All Types" value="ALL" />
                        <Picker.Item label="Guest" value="GUEST" />
                        <Picker.Item label="Delivery" value="DELIVERY" />
                        <Picker.Item label="Cab / Auto" value="CAB_AUTO" />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.rowItem}>
                    <Text style={[styles.label, { color: textColor }]}>
                      Unit
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
                        selectedValue={unitFilter}
                        onValueChange={setUnitFilter}
                        style={{ color: textColor }}
                      >
                        <Picker.Item label="All Units" value="ALL" />
                        {uniqueUnits.map((unit) => (
                          <Picker.Item
                            key={unit}
                            label={`Unit ${unit}`}
                            value={unit}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.refreshButton, { backgroundColor: tint }]}
                  onPress={handleRefresh}
                >
                  <Feather
                    name="refresh-cw"
                    size={16}
                    color={theme === "dark" ? "#11181C" : "#ffffff"}
                  />
                  <Text
                    style={[
                      styles.refreshButtonText,
                      { color: theme === "dark" ? "#11181C" : "#ffffff" },
                    ]}
                  >
                    Refresh
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Visitors List */}
          {filteredVisitors.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: borderCol }]}>
                <Feather name="users" size={32} color={muted} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                No visitors found
              </Text>
              <Text style={[styles.emptyDesc, { color: muted }]}>
                {searchTerm || fromDate !== toDate
                  ? "Try adjusting your filters"
                  : "Visitors will appear here when they check in"}
              </Text>
            </View>
          ) : (
            <View style={styles.visitorsList}>
              {filteredVisitors.map((visitor) => {
                const typeConfig = getVisitorTypeConfig(visitor.visitorType);
                const statusBadge = getStatusBadge(
                  visitor.checkInAt,
                  visitor.checkOutAt,
                );

                return (
                  <View
                    key={visitor.id}
                    style={[
                      styles.visitorCard,
                      { backgroundColor: cardBg, borderColor: borderCol },
                    ]}
                  >
                    {/* Header */}
                    <View style={styles.visitorHeader}>
                      <View style={styles.visitorHeaderLeft}>
                        <View
                          style={[
                            styles.visitorAvatar,
                            { backgroundColor: typeConfig.bg },
                          ]}
                        >
                          <Feather
                            name={typeConfig.icon}
                            size={24}
                            color={typeConfig.text}
                          />
                        </View>
                        <View style={styles.visitorHeaderInfo}>
                          <Text
                            style={[styles.visitorName, { color: textColor }]}
                          >
                            {visitor.name}
                          </Text>
                          <View
                            style={[
                              styles.visitorTypeBadge,
                              { backgroundColor: typeConfig.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.visitorTypeText,
                                { color: typeConfig.text },
                              ]}
                            >
                              {visitor.visitorType}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusBadge.bg },
                        ]}
                      >
                        <Feather
                          name={statusBadge.icon}
                          size={12}
                          color={statusBadge.text}
                        />
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: statusBadge.text },
                          ]}
                        >
                          {statusBadge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Visiting Info */}
                    <View
                      style={[
                        styles.visitingInfo,
                        {
                          backgroundColor:
                            theme === "dark" ? "#1a2332" : "#eef2ff",
                          borderColor: theme === "dark" ? "#2d3748" : "#c7d2fe",
                        },
                      ]}
                    >
                      <Text style={[styles.visitingLabel, { color: muted }]}>
                        Visiting:{" "}
                        <Text
                          style={[styles.visitingValue, { color: textColor }]}
                        >
                          {visitor.user?.name ?? "Unknown"}
                        </Text>
                        {visitor.user?.unit
                          ? `${" • "}Unit ${visitor.user.unit.number}, Block ${visitor.user.unit.block?.name ?? ""}`
                          : ""}
                      </Text>
                    </View>

                    {/* Details Grid */}
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailItem}>
                        <View
                          style={[
                            styles.detailIcon,
                            { backgroundColor: borderCol },
                          ]}
                        >
                          <Feather name="calendar" size={14} color={muted} />
                        </View>
                        <View>
                          <Text style={[styles.detailLabel, { color: muted }]}>
                            Date
                          </Text>
                          <Text
                            style={[styles.detailValue, { color: textColor }]}
                          >
                            {formatDate(visitor.visitDate)}
                          </Text>
                        </View>
                      </View>

                      {visitor.contact && (
                        <View style={styles.detailItem}>
                          <View
                            style={[
                              styles.detailIcon,
                              { backgroundColor: borderCol },
                            ]}
                          >
                            <Feather name="phone" size={14} color={muted} />
                          </View>
                          <View>
                            <Text
                              style={[styles.detailLabel, { color: muted }]}
                            >
                              Contact
                            </Text>
                            <Text
                              style={[styles.detailValue, { color: textColor }]}
                            >
                              {visitor.contact}
                            </Text>
                          </View>
                        </View>
                      )}

                      {visitor.vehicleNo && (
                        <View style={styles.detailItem}>
                          <View
                            style={[
                              styles.detailIcon,
                              { backgroundColor: borderCol },
                            ]}
                          >
                            <Feather name="truck" size={14} color={muted} />
                          </View>
                          <View>
                            <Text
                              style={[styles.detailLabel, { color: muted }]}
                            >
                              Vehicle
                            </Text>
                            <Text
                              style={[
                                styles.detailValue,
                                styles.monoText,
                                { color: textColor },
                              ]}
                            >
                              {visitor.vehicleNo}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Check In/Out Times */}
                    <View
                      style={[styles.timeRow, { borderTopColor: borderCol }]}
                    >
                      <View style={styles.timeItem}>
                        <View
                          style={[
                            styles.timeIcon,
                            {
                              backgroundColor: visitor.checkInAt
                                ? "#d1fae5"
                                : borderCol,
                            },
                          ]}
                        >
                          <Feather
                            name="log-in"
                            size={14}
                            color={visitor.checkInAt ? "#065f46" : muted}
                          />
                        </View>
                        <View>
                          <Text style={[styles.timeLabel, { color: muted }]}>
                            Check In
                          </Text>
                          <Text
                            style={[
                              styles.timeValue,
                              { color: visitor.checkInAt ? textColor : muted },
                            ]}
                          >
                            {visitor.checkInAt
                              ? formatTime(visitor.checkInAt)
                              : "Not yet"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.timeItem}>
                        <View
                          style={[
                            styles.timeIcon,
                            { backgroundColor: borderCol },
                          ]}
                        >
                          <Feather
                            name="log-out"
                            size={14}
                            color={visitor.checkOutAt ? "#374151" : muted}
                          />
                        </View>
                        <View>
                          <Text style={[styles.timeLabel, { color: muted }]}>
                            Check Out
                          </Text>
                          <Text
                            style={[
                              styles.timeValue,
                              { color: visitor.checkOutAt ? textColor : muted },
                            ]}
                          >
                            {visitor.checkOutAt
                              ? formatTime(visitor.checkOutAt)
                              : "Not yet"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
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
    width: "48%",
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
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  searchContainer: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: 12,
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateButtonText: {
    fontSize: 14,
  },
  iosDatePickerActions: {
    alignItems: "flex-end",
    marginTop: 8,
    marginBottom: 16,
  },
  iosDatePickerButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  iosDatePickerButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchInput: {
    paddingLeft: 40,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  rowItem: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
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
  },
  visitorsList: {
    gap: 16,
  },
  visitorCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  visitorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  visitorHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  visitorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  visitorHeaderInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  visitorTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visitorTypeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  visitingInfo: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  visitingLabel: {
    fontSize: 12,
  },
  visitingValue: {
    fontWeight: "600",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: "45%",
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  monoText: {
    fontFamily: "monospace",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  timeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  timeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  timeLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 12,
    fontWeight: "500",
  },
});
