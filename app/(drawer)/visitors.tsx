// @ts-nocheck
import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import DateTimePicker from "@react-native-community/datetimepicker";

type Visitor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  expectedDate: string;
  expectedTime: string;
  purpose: string;
  vehicle?: string;
  notes?: string;
  status: "pending" | "approved" | "denied" | "completed";
  qrCode?: string;
  approvedBy?: string;
  actualArrival?: string;
  actualDeparture?: string;
};

export default function Visitors() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const [tab, setTab] = useState<"my-visitors" | "add-visitor">("my-visitors");
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Add visitor form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    expectedDate: new Date(),
    expectedTime: new Date(),
    purpose: "",
    vehicle: "",
    notes: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadVisitors = async () => {
    try {
      setLoading(true);
      // TODO: Implement actual visitors API call
      // const response = await visitorsAPI.getVisitors();
      // setVisitors(response.data);

      // For now, setting empty array until API is implemented
      setVisitors([]);
    } catch (error) {
      console.error("Failed to load visitors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisitors();
  }, []);

  const filteredVisitors = useMemo(() => {
    if (!statusFilter) return visitors;
    return visitors.filter((visitor) => visitor.status === statusFilter);
  }, [visitors, statusFilter]);

  const handleAddVisitor = async () => {
    try {
      if (!formData.name.trim()) {
        Alert.alert("Error", "Visitor name is required");
        return;
      }

      if (!formData.purpose.trim()) {
        Alert.alert("Error", "Purpose of visit is required");
        return;
      }

      // TODO: Implement actual visitor creation API call
      // const response = await visitorsAPI.createVisitor(formData);

      Alert.alert(
        "Visitor Added",
        "Visitor has been pre-authorized successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              setShowAddForm(false);
              setFormData({
                name: "",
                email: "",
                phone: "",
                expectedDate: new Date(),
                expectedTime: new Date(),
                purpose: "",
                vehicle: "",
                notes: "",
              });
              loadVisitors();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to add visitor. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "pending":
        return "#F59E0B";
      case "denied":
        return "#EF4444";
      case "completed":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return "check-circle";
      case "pending":
        return "clock";
      case "denied":
        return "x-circle";
      case "completed":
        return "check";
      default:
        return "help-circle";
    }
  };

  const formatDateTime = (date: string, time: string) => {
    return `${new Date(date).toLocaleDateString()} at ${time}`;
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: bg, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { color: text }]}>
          Loading visitors...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, paddingTop: insets.top },
      ]}
    >
      {/* Tab Navigation */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: cardBg, borderColor: borderCol },
        ]}
      >
        <Pressable
          style={[styles.tab, tab === "my-visitors" && styles.activeTab]}
          onPress={() => setTab("my-visitors")}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === "my-visitors" ? "#6366F1" : text },
            ]}
          >
            My Visitors
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "add-visitor" && styles.activeTab]}
          onPress={() => setTab("add-visitor")}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === "add-visitor" ? "#6366F1" : text },
            ]}
          >
            Add Visitor
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {tab === "my-visitors" ? (
          <>
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: text }]}>
                Filter by Status:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
              >
                <View style={styles.filterButtons}>
                  <Pressable
                    style={[
                      styles.filterButton,
                      { borderColor: borderCol },
                      !statusFilter && styles.activeFilterButton,
                    ]}
                    onPress={() => setStatusFilter("")}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        { color: !statusFilter ? "#6366F1" : text },
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>
                  {["pending", "approved", "denied", "completed"].map(
                    (status) => (
                      <Pressable
                        key={status}
                        style={[
                          styles.filterButton,
                          { borderColor: borderCol },
                          statusFilter === status && styles.activeFilterButton,
                        ]}
                        onPress={() => setStatusFilter(status)}
                      >
                        <Text
                          style={[
                            styles.filterButtonText,
                            {
                              color: statusFilter === status ? "#6366F1" : text,
                            },
                          ]}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </Pressable>
                    )
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Visitors List */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="users" size={24} color={text} />
                <Text style={[styles.sectionTitle, { color: text }]}>
                  Visitors ({filteredVisitors.length})
                </Text>
              </View>

              {filteredVisitors.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: cardBg, borderColor: borderCol },
                  ]}
                >
                  <Feather
                    name="users"
                    size={48}
                    color={text}
                    style={{ opacity: 0.3 }}
                  />
                  <Text style={[styles.emptyText, { color: text }]}>
                    {statusFilter
                      ? `No ${statusFilter} visitors`
                      : "No visitors yet"}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: text }]}>
                    Add a visitor to get started
                  </Text>
                </View>
              ) : (
                filteredVisitors.map((visitor) => (
                  <View
                    key={visitor.id}
                    style={[
                      styles.visitorCard,
                      { backgroundColor: cardBg, borderColor: borderCol },
                    ]}
                  >
                    <View style={styles.visitorHeader}>
                      <View style={styles.visitorInfo}>
                        <Text style={[styles.visitorName, { color: text }]}>
                          {visitor.name}
                        </Text>
                        {visitor.email && (
                          <Text
                            style={[
                              styles.visitorContact,
                              { color: text, opacity: 0.7 },
                            ]}
                          >
                            {visitor.email}
                          </Text>
                        )}
                        {visitor.phone && (
                          <Text
                            style={[
                              styles.visitorContact,
                              { color: text, opacity: 0.7 },
                            ]}
                          >
                            {visitor.phone}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: `${getStatusColor(
                              visitor.status
                            )}22`,
                          },
                        ]}
                      >
                        <Feather
                          name={getStatusIcon(visitor.status)}
                          size={14}
                          color={getStatusColor(visitor.status)}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(visitor.status) },
                          ]}
                        >
                          {visitor.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.visitorDetails}>
                      <View style={styles.detailRow}>
                        <Feather name="calendar" size={16} color={text} />
                        <Text style={[styles.detailText, { color: text }]}>
                          {formatDateTime(
                            visitor.expectedDate,
                            visitor.expectedTime
                          )}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Feather name="clipboard" size={16} color={text} />
                        <Text style={[styles.detailText, { color: text }]}>
                          {visitor.purpose}
                        </Text>
                      </View>

                      {visitor.vehicle && (
                        <View style={styles.detailRow}>
                          <Feather name="truck" size={16} color={text} />
                          <Text style={[styles.detailText, { color: text }]}>
                            {visitor.vehicle}
                          </Text>
                        </View>
                      )}

                      {visitor.notes && (
                        <View style={styles.detailRow}>
                          <Feather
                            name="message-circle"
                            size={16}
                            color={text}
                          />
                          <Text style={[styles.detailText, { color: text }]}>
                            {visitor.notes}
                          </Text>
                        </View>
                      )}
                    </View>

                    {visitor.qrCode && (
                      <View style={styles.qrSection}>
                        <Text style={[styles.qrLabel, { color: text }]}>
                          QR Code: {visitor.qrCode}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          /* Add Visitor Tab */
          <>
            <Pressable
              style={styles.addButton}
              onPress={() => setShowAddForm(true)}
            >
              <Feather name="user-plus" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Pre-authorize Visitor</Text>
            </Pressable>

            <View
              style={[
                styles.infoCard,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <Feather name="info" size={24} color="#6366F1" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: text }]}>
                  Visitor Management
                </Text>
                <Text style={[styles.infoText, { color: text, opacity: 0.7 }]}>
                  Pre-authorize visitors to streamline their entry process.
                  They'll receive a QR code for quick access.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Visitor Form Modal */}
      <Modal
        visible={showAddForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: text }]}>
                Add Visitor
              </Text>
              <Pressable onPress={() => setShowAddForm(false)}>
                <Feather name="x" size={24} color={text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Basic Info */}
              <Text style={[styles.formLabel, { color: text }]}>
                Visitor Name *
              </Text>
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, name: text }))
                }
                placeholder="Enter visitor's full name"
                placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
              />

              <Text style={[styles.formLabel, { color: text }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, email: text }))
                }
                placeholder="visitor@example.com"
                placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                keyboardType="email-address"
              />

              <Text style={[styles.formLabel, { color: text }]}>Phone</Text>
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, phone: text }))
                }
                placeholder="+1234567890"
                placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                keyboardType="phone-pad"
              />

              {/* Date & Time */}
              <Text style={[styles.formLabel, { color: text }]}>
                Expected Date
              </Text>
              <Pressable
                style={[styles.dateButton, { borderColor: borderCol }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={20} color={text} />
                <Text style={[styles.dateButtonText, { color: text }]}>
                  {formData.expectedDate.toDateString()}
                </Text>
              </Pressable>

              <Text style={[styles.formLabel, { color: text }]}>
                Expected Time
              </Text>
              <Pressable
                style={[styles.dateButton, { borderColor: borderCol }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Feather name="clock" size={20} color={text} />
                <Text style={[styles.dateButtonText, { color: text }]}>
                  {formData.expectedTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </Pressable>

              {/* Purpose */}
              <Text style={[styles.formLabel, { color: text }]}>
                Purpose of Visit *
              </Text>
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={formData.purpose}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, purpose: text }))
                }
                placeholder="Family visit, delivery, maintenance, etc."
                placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
              />

              {/* Vehicle */}
              <Text style={[styles.formLabel, { color: text }]}>
                Vehicle Details
              </Text>
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={formData.vehicle}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, vehicle: text }))
                }
                placeholder="Car - ABC123, Two Wheeler, etc."
                placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
              />

              {/* Notes */}
              <Text style={[styles.formLabel, { color: text }]}>
                Additional Notes
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  { color: text, borderColor: borderCol },
                ]}
                value={formData.notes}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, notes: text }))
                }
                placeholder="Any additional information..."
                placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                multiline
                numberOfLines={3}
              />

              <Pressable style={styles.submitButton} onPress={handleAddVisitor}>
                <Text style={styles.submitButtonText}>
                  Pre-authorize Visitor
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.expectedDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setFormData((prev) => ({ ...prev, expectedDate: selectedDate }));
            }
          }}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={formData.expectedTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              setFormData((prev) => ({ ...prev, expectedTime: selectedTime }));
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },

  tabContainer: {
    flexDirection: "row",
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
  },

  content: { flex: 1, paddingHorizontal: 16 },

  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeFilterButton: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderColor: "#6366F1",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    opacity: 0.7,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
  },

  visitorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  visitorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  visitorInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  visitorContact: {
    fontSize: 14,
    marginBottom: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  visitorDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },

  qrSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    paddingTop: 12,
  },
  qrLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  infoCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    minHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalForm: {
    padding: 20,
  },

  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },

  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },

  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 16,
    minHeight: 80,
  },

  submitButton: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
