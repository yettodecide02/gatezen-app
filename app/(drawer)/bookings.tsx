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

type Facility = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerHour: number;
};

type Booking = {
  id: string;
  facilityId: string;
  facilityName: string;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending" | "cancelled";
  note?: string;
  userName: string;
};

type Event = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  attendeeCount: number;
  maxAttendees: number;
};

export default function Bookings() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const [tab, setTab] = useState<"facilities" | "events">("facilities");
  const [loading, setLoading] = useState(true);

  // Facilities
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string>("");

  // Events
  const [events, setEvents] = useState<Event[]>([]);

  // Booking form
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingDate, setBookingDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [duration, setDuration] = useState(1);
  const [note, setNote] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      // const facilitiesResponse = await fetch('/api/facilities');
      // const bookingsResponse = await fetch('/api/bookings');
      // const eventsResponse = await fetch('/api/events');
      // const facilitiesData = await facilitiesResponse.json();
      // const bookingsData = await bookingsResponse.json();
      // const eventsData = await eventsResponse.json();

      setFacilities([]);
      setBookings([]);
      setEvents([]);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBookFacility = async () => {
    try {
      if (!selectedFacility) {
        Alert.alert("Error", "Please select a facility");
        return;
      }

      // TODO: Implement actual booking API call
      // const response = await bookingAPI.createBooking({
      //   facilityId: selectedFacility.id,
      //   date: selectedDate,
      //   note: note,
      // });

      Alert.alert(
        "Booking Successful",
        "Your facility booking has been confirmed!",
        [
          {
            text: "OK",
            onPress: () => {
              setShowBookingForm(false);
              setNote("");
              loadData();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Booking Failed", "Please try again later.");
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
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
          Loading bookings...
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
          style={[styles.tab, tab === "facilities" && styles.activeTab]}
          onPress={() => setTab("facilities")}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === "facilities" ? "#6366F1" : text },
            ]}
          >
            Facilities
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "events" && styles.activeTab]}
          onPress={() => setTab("events")}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === "events" ? "#6366F1" : text },
            ]}
          >
            Events
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {tab === "facilities" ? (
          <>
            {/* Book Facility Button */}
            <Pressable
              style={styles.bookButton}
              onPress={() => setShowBookingForm(true)}
            >
              <Feather name="plus" size={20} color="#ffffff" />
              <Text style={styles.bookButtonText}>Book Facility</Text>
            </Pressable>

            {/* Available Facilities */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: text }]}>
                Available Facilities
              </Text>
              {facilities.map((facility) => (
                <View
                  key={facility.id}
                  style={[
                    styles.facilityCard,
                    { backgroundColor: cardBg, borderColor: borderCol },
                  ]}
                >
                  <View style={styles.facilityHeader}>
                    <Text style={[styles.facilityName, { color: text }]}>
                      {facility.name}
                    </Text>
                    <Text style={[styles.facilityPrice, { color: text }]}>
                      ₹{facility.pricePerHour}/hr
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.facilityDescription,
                      { color: text, opacity: 0.7 },
                    ]}
                  >
                    {facility.description}
                  </Text>
                  <View style={styles.facilityMeta}>
                    <View style={styles.facilityMetaItem}>
                      <Feather name="users" size={14} color={text} />
                      <Text style={[styles.facilityMetaText, { color: text }]}>
                        Capacity: {facility.capacity}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* My Bookings */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: text }]}>
                My Bookings
              </Text>
              {bookings.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: cardBg, borderColor: borderCol },
                  ]}
                >
                  <Text style={[styles.emptyText, { color: text }]}>
                    No bookings yet
                  </Text>
                </View>
              ) : (
                bookings.map((booking) => (
                  <View
                    key={booking.id}
                    style={[
                      styles.bookingCard,
                      { backgroundColor: cardBg, borderColor: borderCol },
                    ]}
                  >
                    <View style={styles.bookingHeader}>
                      <Text style={[styles.bookingFacility, { color: text }]}>
                        {booking.facilityName}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          styles[`status_${booking.status}`],
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            styles[`statusText_${booking.status}`],
                          ]}
                        >
                          {booking.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.bookingTime}>
                      <Feather name="clock" size={16} color={text} />
                      <Text style={[styles.bookingTimeText, { color: text }]}>
                        {formatTime(booking.startTime)} -{" "}
                        {formatTime(booking.endTime)}
                      </Text>
                    </View>
                    {booking.note && (
                      <Text
                        style={[
                          styles.bookingNote,
                          { color: text, opacity: 0.7 },
                        ]}
                      >
                        Note: {booking.note}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          /* Events Tab */
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: text }]}>
              Community Events
            </Text>
            {events.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                ]}
              >
                <Text style={[styles.emptyText, { color: text }]}>
                  No upcoming events
                </Text>
              </View>
            ) : (
              events.map((event) => (
                <View
                  key={event.id}
                  style={[
                    styles.eventCard,
                    { backgroundColor: cardBg, borderColor: borderCol },
                  ]}
                >
                  <Text style={[styles.eventTitle, { color: text }]}>
                    {event.title}
                  </Text>
                  <Text
                    style={[
                      styles.eventDescription,
                      { color: text, opacity: 0.7 },
                    ]}
                  >
                    {event.description}
                  </Text>
                  <View style={styles.eventMeta}>
                    <View style={styles.eventMetaItem}>
                      <Feather name="calendar" size={14} color={text} />
                      <Text style={[styles.eventMetaText, { color: text }]}>
                        {formatDateTime(event.startTime)}
                      </Text>
                    </View>
                    <View style={styles.eventMetaItem}>
                      <Feather name="map-pin" size={14} color={text} />
                      <Text style={[styles.eventMetaText, { color: text }]}>
                        {event.location}
                      </Text>
                    </View>
                    <View style={styles.eventMetaItem}>
                      <Feather name="users" size={14} color={text} />
                      <Text style={[styles.eventMetaText, { color: text }]}>
                        {event.attendeeCount}/{event.maxAttendees} attending
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Booking Form Modal */}
      <Modal
        visible={showBookingForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookingForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: text }]}>
                Book Facility
              </Text>
              <Pressable onPress={() => setShowBookingForm(false)}>
                <Feather name="x" size={24} color={text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Facility Selection */}
              <Text style={[styles.formLabel, { color: text }]}>
                Select Facility
              </Text>
              <View style={styles.facilityOptions}>
                {facilities.map((facility) => (
                  <Pressable
                    key={facility.id}
                    style={[
                      styles.facilityOption,
                      { borderColor: borderCol },
                      selectedFacility === facility.id &&
                        styles.selectedFacilityOption,
                    ]}
                    onPress={() => setSelectedFacility(facility.id)}
                  >
                    <Text style={[styles.facilityOptionText, { color: text }]}>
                      {facility.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Date Selection */}
              <Text style={[styles.formLabel, { color: text }]}>Date</Text>
              <Pressable
                style={[styles.dateButton, { borderColor: borderCol }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={20} color={text} />
                <Text style={[styles.dateButtonText, { color: text }]}>
                  {bookingDate.toDateString()}
                </Text>
              </Pressable>

              {/* Time Selection */}
              <Text style={[styles.formLabel, { color: text }]}>
                Start Time
              </Text>
              <Pressable
                style={[styles.dateButton, { borderColor: borderCol }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Feather name="clock" size={20} color={text} />
                <Text style={[styles.dateButtonText, { color: text }]}>
                  {startTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </Pressable>

              {/* Duration */}
              <Text style={[styles.formLabel, { color: text }]}>
                Duration (hours)
              </Text>
              <View style={styles.durationButtons}>
                {[1, 2, 3, 4].map((hrs) => (
                  <Pressable
                    key={hrs}
                    style={[
                      styles.durationButton,
                      { borderColor: borderCol },
                      duration === hrs && styles.selectedDurationButton,
                    ]}
                    onPress={() => setDuration(hrs)}
                  >
                    <Text style={[styles.durationButtonText, { color: text }]}>
                      {hrs}h
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Note */}
              <Text style={[styles.formLabel, { color: text }]}>
                Note (optional)
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  { color: text, borderColor: borderCol },
                ]}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note for your booking..."
                placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                multiline
                numberOfLines={3}
              />

              <Pressable
                style={styles.submitButton}
                onPress={handleBookFacility}
              >
                <Text style={styles.submitButtonText}>Book Now</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={bookingDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setBookingDate(selectedDate);
            }
          }}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              setStartTime(selectedTime);
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

  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  bookButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },

  facilityCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  facilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  facilityName: {
    fontSize: 18,
    fontWeight: "600",
  },
  facilityPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6366F1",
  },
  facilityDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  facilityMeta: {
    flexDirection: "row",
    gap: 16,
  },
  facilityMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  facilityMetaText: {
    fontSize: 12,
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
  },

  bookingCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bookingFacility: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  status_confirmed: {
    backgroundColor: "#ECFDF5",
  },
  status_pending: {
    backgroundColor: "#FFF7ED",
  },
  status_cancelled: {
    backgroundColor: "#FEF2F2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusText_confirmed: {
    color: "#065F46",
  },
  statusText_pending: {
    color: "#9A3412",
  },
  statusText_cancelled: {
    color: "#DC2626",
  },
  bookingTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  bookingTimeText: {
    fontSize: 14,
  },
  bookingNote: {
    fontSize: 12,
    fontStyle: "italic",
  },

  eventCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  eventMeta: {
    gap: 8,
  },
  eventMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventMetaText: {
    fontSize: 12,
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
    minHeight: "60%",
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

  facilityOptions: {
    gap: 8,
  },
  facilityOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  selectedFacilityOption: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderColor: "#6366F1",
  },
  facilityOptionText: {
    fontSize: 14,
    fontWeight: "500",
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
    fontSize: 14,
  },

  durationButtons: {
    flexDirection: "row",
    gap: 8,
  },
  durationButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  selectedDurationButton: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderColor: "#6366F1",
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },

  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 14,
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
