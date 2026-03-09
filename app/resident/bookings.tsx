// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import { useAppContext } from "@/contexts/AppContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchResidentFacilities,
  fetchResidentFacilityBookings,
  createResidentFacilityBooking,
  cancelResidentFacilityBooking,
} from "@/lib/queries/resident";

function pad(n) {
  return String(n).padStart(2, "0");
}

function buildSlots(facility, d) {
  if (!facility?.operatingHours || typeof facility.operatingHours !== "string")
    return [];
  const parts = facility.operatingHours.split("-").map((s) => s.trim());
  if (parts.length !== 2) return [];
  const [startHM, endHM] = parts;
  const re = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!re.test(startHM) || !re.test(endHM)) return [];
  const slotMins = facility.slotMins || 60;
  try {
    const start = new Date(`${d}T${startHM}:00`);
    const end = new Date(`${d}T${endHM}:00`);
    if (!(start < end)) return [];
    const out = [];
    let curr = new Date(start);
    while (curr < end) {
      const s = new Date(curr);
      const e = new Date(curr.getTime() + slotMins * 60000);
      if (e > end) break;
      out.push({ start: s.toISOString(), end: e.toISOString() });
      curr = e;
    }
    return out;
  } catch {
    return [];
  }
}

function fmtTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const FACILITY_ICONS: Record<string, string> = {
  gym: "activity",
  fitness: "activity",
  pool: "droplet",
  swimming: "droplet",
  clubhouse: "home",
  hall: "home",
  lounge: "home",
  tennis: "circle",
  badminton: "circle",
  court: "circle",
  library: "book-open",
  reading: "book-open",
  parking: "truck",
  playground: "smile",
  kids: "smile",
  garden: "feather",
  park: "feather",
  terrace: "sun",
  rooftop: "sun",
  yoga: "wind",
  spa: "wind",
  cafe: "coffee",
  restaurant: "coffee",
};

function getFacilityIcon(name?: string): string {
  if (!name) return "grid";
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(FACILITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "grid";
}

export default function BookingsScreen() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const fieldBg = isDark ? "#111111" : "#F8FAFC";

  const { toast, showError, showSuccess, hideToast } = useToast();
  const { user, token } = useAppContext();
  const queryClient = useQueryClient();

  const [facilityId, setFacilityId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [note, setNote] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [slotErr, setSlotErr] = useState("");
  const [peopleErr, setPeopleErr] = useState("");
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);

  // Facilities query
  const { data: rawFacilities } = useQuery({
    queryKey: queryKeys.resident.facilities(user?.communityId ?? ""),
    queryFn: () => fetchResidentFacilities(token, user!.communityId as string),
    enabled: !!user?.communityId && !!token,
    staleTime: 30 * 60 * 1000,
  });
  const facilities = useMemo(
    () =>
      (rawFacilities ?? []).map((a) => ({
        ...a,
        facilityType: a.facilityType?.replace(/_/g, " ") ?? a.facilityType,
      })),
    [rawFacilities],
  );

  // Auto-select first facility
  useEffect(() => {
    if (facilities.length > 0 && !facilityId) setFacilityId(facilities[0].id);
  }, [facilities]);

  // Facility bookings query
  const {
    data: bookingData,
    isLoading: loading,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: queryKeys.resident.facilityBookings(
      facilityId,
      date,
      user?.id ?? "",
    ),
    queryFn: () =>
      fetchResidentFacilityBookings(token, facilityId, date, user?.id),
    enabled: !!facilityId && !!date && !!token,
    staleTime: 3 * 60 * 1000,
  });
  const { bookings = [], userBookings = [] } = bookingData ?? {};

  const createMutation = useMutation({
    mutationFn: (payload: object) =>
      createResidentFacilityBooking(token, payload),
    onSuccess: () => {
      showSuccess("Booking confirmed!");
      setNote("");
      setSelectedSlot("");
      setPeopleCount("");
      setShowBookForm(false);
      queryClient.invalidateQueries({
        queryKey: queryKeys.resident.facilityBookings(
          facilityId,
          date,
          user?.id ?? "",
        ),
      });
    },
    onError: (e: any) =>
      showError(e?.response?.data?.error || "Booking failed"),
    onSettled: () => setSubmitting(false),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelResidentFacilityBooking(token, id),
    onSuccess: () => {
      showSuccess("Booking cancelled");
      queryClient.invalidateQueries({
        queryKey: queryKeys.resident.facilityBookings(
          facilityId,
          date,
          user?.id ?? "",
        ),
      });
    },
    onError: () => showError("Failed to cancel booking"),
  });
  useEffect(() => {
    const fac = facilities.find((f) => f.id === facilityId) || null;
    setSlots(buildSlots(fac, date));
    setSelectedSlot("");
  }, [facilities, facilityId, date]);

  const facility = facilities.find((f) => f.id === facilityId) || null;

  const minsUsed = useMemo(() => {
    return (userBookings || []).reduce((sum, b) => {
      const s = new Date(b.startsAt).getTime();
      const e = new Date(b.endsAt).getTime();
      return sum + Math.round((e - s) / 60000);
    }, 0);
  }, [userBookings]);
  const minsLeft = Math.max(0, 180 - minsUsed);

  const isSlotBooked = (slot) => {
    const cap = facility?.capacity || 1;
    const bookedPeople = bookings
      .filter(
        (b) =>
          +new Date(b.startsAt) === +new Date(slot.start) &&
          b.status === "confirmed",
      )
      .reduce((sum, b) => sum + (b.peopleCount || 1), 0);
    return bookedPeople >= cap;
  };
  const isSlotPast = (slot) => new Date(slot.start) < new Date();

  const shiftDay = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const createBooking = () => {
    let valid = true;
    if (!facilityId || !selectedSlot) {
      setSlotErr("Please select a time slot");
      valid = false;
    } else {
      setSlotErr("");
    }
    const count = peopleCount === "" ? 1 : Number(peopleCount);
    if (peopleCount !== "" && (isNaN(count) || count < 1)) {
      setPeopleErr("Enter a valid number (1 or more)");
      valid = false;
    } else {
      setPeopleErr("");
    }
    if (!valid) return;
    const slot = slots.find((s) => s.start === selectedSlot);
    if (!slot) {
      setSlotErr("Select a valid time slot");
      return;
    }
    if (new Date(slot.start) < new Date()) {
      setSlotErr("Cannot book a past slot");
      return;
    }
    if (minsLeft < (facility?.slotMins || 60)) {
      showError(
        `Daily limit reached. ${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m remaining`,
      );
      return;
    }
    const cap = facility?.capacity || 10;
    const bookedCount = bookings
      .filter(
        (b) =>
          +new Date(b.startsAt) === +new Date(slot.start) &&
          b.status === "confirmed",
      )
      .reduce((s, b) => s + (b.peopleCount || 1), 0);
    if (bookedCount + count > cap) {
      setSlotErr("This slot is fully booked");
      return;
    }
    setSubmitting(true);
    createMutation.mutate({
      userId: user?.id,
      facilityId,
      startsAt: slot.start,
      endsAt: slot.end,
      note: note.trim() || undefined,
      peopleCount: count,
      communityId: user?.communityId,
    });
  };

  const cancelBooking = (id) => {
    cancelMutation.mutate(id);
  };

  const SC = {
    confirmed: { color: "#10B981", label: "CONF" },
    cancelled: { color: "#EF4444", label: "CNCL" },
    pending: { color: "#F59E0B", label: "PNDG" },
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: 14,
          paddingHorizontal: 20,
          backgroundColor: bg,
          borderBottomWidth: 1,
          borderBottomColor: borderCol,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: borderCol,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="arrow-left" size={18} color={text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
              Bookings
            </Text>
            <Text style={{ fontSize: 12, color: muted }}>
              Amenity reservations
            </Text>
          </View>
          {date >= new Date().toISOString().slice(0, 10) && (
            <Pressable
              onPress={() => setShowBookForm(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: tint,
              }}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>
                Book
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Facility + Date controls */}
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: borderCol,
            padding: 14,
            gap: 12,
          }}
        >
          {/* Facility picker */}
          <View>
            <Text
              style={{
                fontSize: 11,
                color: muted,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              Facility
            </Text>
            <Pressable
              onPress={() =>
                facilities.length > 1 && setShowFacilityModal(true)
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: fieldBg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: borderCol,
                padding: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: tint + "18",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather
                    name={getFacilityIcon(facility?.name)}
                    size={14}
                    color={tint}
                  />
                </View>
                <View>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: text }}
                  >
                    {facility?.name || "Select facility"}
                  </Text>
                  {facility?.facilityType && (
                    <Text style={{ fontSize: 11, color: muted }}>
                      {facility.facilityType}
                    </Text>
                  )}
                </View>
              </View>
              {facilities.length > 1 && (
                <Feather name="chevron-down" size={16} color={muted} />
              )}
            </Pressable>
          </View>

          {/* Date nav */}
          <View>
            <Text
              style={{
                fontSize: 11,
                color: muted,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              Date
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Pressable
                onPress={() => shiftDay(-1)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: fieldBg,
                  borderWidth: 1,
                  borderColor: borderCol,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="chevron-left" size={16} color={text} />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (Platform.OS === "android") {
                    DateTimePickerAndroid.open({
                      value: new Date(date + "T00:00:00"),
                      mode: "date",
                      onChange: (e, d) => {
                        if (e.type === "set" && d)
                          setDate(d.toISOString().slice(0, 10));
                      },
                    });
                  } else {
                    setShowDatePicker(true);
                  }
                }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: fieldBg,
                  borderWidth: 1,
                  borderColor: borderCol,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: text }}>
                  {fmtDate(date)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => shiftDay(1)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: fieldBg,
                  borderWidth: 1,
                  borderColor: borderCol,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="chevron-right" size={16} color={text} />
              </Pressable>
            </View>
          </View>

          {/* Facility info */}
          {facility && (
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {facility.operatingHours && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Feather name="clock" size={11} color={muted} />
                  <Text style={{ fontSize: 11, color: muted }}>
                    {facility.operatingHours}
                  </Text>
                </View>
              )}
              {facility.capacity && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Feather name="users" size={11} color={muted} />
                  <Text style={{ fontSize: 11, color: muted }}>
                    Cap {facility.capacity}
                  </Text>
                </View>
              )}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Feather
                  name="bar-chart-2"
                  size={11}
                  color={minsLeft < 30 ? "#EF4444" : muted}
                />
                <Text
                  style={{
                    fontSize: 11,
                    color: minsLeft < 30 ? "#EF4444" : muted,
                  }}
                >
                  {Math.floor(minsLeft / 60)}h {minsLeft % 60}m left today
                </Text>
              </View>
              {slots.length > 0 &&
                (() => {
                  const available = slots.filter(
                    (s) => !isSlotBooked(s) && !isSlotPast(s),
                  ).length;
                  const slotColor = available > 0 ? "#10B981" : "#EF4444";
                  return (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Feather
                        name="check-circle"
                        size={11}
                        color={slotColor}
                      />
                      <Text style={{ fontSize: 11, color: slotColor }}>
                        {available} slot{available !== 1 ? "s" : ""} free
                      </Text>
                    </View>
                  );
                })()}
            </View>
          )}
        </View>

        {/* Bookings for the day */}
        <Text
          style={{
            fontSize: 11,
            color: muted,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Bookings for this day
        </Text>
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 30 }}>
            <ActivityIndicator color={tint} />
          </View>
        ) : bookings.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 28, gap: 6 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: tint + "18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="calendar" size={22} color={tint} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: text }}>
              No Bookings
            </Text>
            <Text style={{ fontSize: 12, color: muted }}>
              No reservations for this facility and date.
            </Text>
          </View>
        ) : (
          bookings.map((b) => {
            const sc = SC[(b.status || "").toLowerCase()] || SC.pending;
            const ismine = b.userId === user?.id;
            return (
              <View
                key={b.id}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: borderCol,
                  padding: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: text }}
                  >
                    {fmtTime(b.startsAt)} – {fmtTime(b.endsAt)}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {ismine && (
                      <View
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: tint + "20",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: tint,
                          }}
                        >
                          MINE
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: sc.color + "20",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: sc.color,
                        }}
                      >
                        {sc.label}
                      </Text>
                    </View>
                  </View>
                </View>
                {b.note && (
                  <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                    {b.note}
                  </Text>
                )}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  {b.peopleCount && (
                    <Text style={{ fontSize: 11, color: muted }}>
                      <Feather name="users" size={11} /> {b.peopleCount}{" "}
                      {b.peopleCount === 1 ? "person" : "people"}
                    </Text>
                  )}
                  {ismine && b.status === "confirmed" && (
                    <Pressable
                      onPress={() => cancelBooking(b.id)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: "#EF444415",
                        borderWidth: 1,
                        borderColor: "#EF444430",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: "#EF4444",
                        }}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Book new modal */}
      <Modal
        visible={showBookForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBookForm(false)}
      >
        <KeyboardAvoidingView
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          behavior={Platform.select({ ios: "padding", android: "height" })}
        >
          <ScrollView
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "90%",
              paddingHorizontal: 20,
              paddingTop: 20,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
                New Booking
              </Text>
              <Pressable
                onPress={() => setShowBookForm(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: borderCol,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={16} color={text} />
              </Pressable>
            </View>

            <Text
              style={{
                fontSize: 12,
                color: muted,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Available Slots
            </Text>
            {!!slotErr && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}>
                <Feather name="alert-circle" size={12} color="#EF4444" />
                <Text style={{ fontSize: 12, color: "#EF4444" }}>{slotErr}</Text>
              </View>
            )}
            {slots.length === 0 ? (
              <Text style={{ fontSize: 13, color: muted, marginBottom: 12 }}>
                No slots available for this date.
              </Text>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {slots.map((slot) => {
                  const booked = isSlotBooked(slot);
                  const past = isSlotPast(slot);
                  const sel = selectedSlot === slot.start;
                  const disabled = booked || past;
                  const cap = facility?.capacity || 1;
                  const bookedPeople = bookings
                    .filter(
                      (b) =>
                        +new Date(b.startsAt) === +new Date(slot.start) &&
                        b.status === "confirmed",
                    )
                    .reduce((sum, b) => sum + (b.peopleCount || 1), 0);
                  const remaining = Math.max(0, cap - bookedPeople);
                  return (
                    <Pressable
                      key={slot.start}
                      onPress={() => {
                        if (!disabled) {
                          setSelectedSlot(slot.start);
                          if (slotErr) setSlotErr("");
                        }
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        backgroundColor: sel
                          ? tint
                          : disabled
                            ? isDark
                              ? "#1A1A1A"
                              : "#F1F5F9"
                            : fieldBg,
                        borderColor: sel
                          ? tint
                          : disabled
                            ? borderCol
                            : borderCol,
                        opacity: disabled ? 0.5 : 1,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: sel ? "#fff" : disabled ? muted : text,
                        }}
                      >
                        {fmtTime(slot.start)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "500",
                          color: sel
                            ? "rgba(255,255,255,0.75)"
                            : booked
                              ? "#EF4444"
                              : remaining <= 2
                                ? "#F59E0B"
                                : muted,
                          textAlign: "center",
                          marginTop: 2,
                        }}
                      >
                        {booked ? "Full" : `${remaining} left`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 5,
                }}
              >
                People Count
              </Text>
              <TextInput
                value={peopleCount}
                onChangeText={(v) => {
                  setPeopleCount(v);
                  if (peopleErr) setPeopleErr("");
                }}
                placeholder="1"
                placeholderTextColor={muted}
                keyboardType="number-pad"
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: peopleErr ? "#EF4444" : borderCol,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: text,
                }}
              />
              {!!peopleErr && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
                  <Feather name="alert-circle" size={12} color="#EF4444" />
                  <Text style={{ fontSize: 12, color: "#EF4444" }}>{peopleErr}</Text>
                </View>
              )}
            </View>
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 5,
                }}
              >
                Note (optional)
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note..."
                placeholderTextColor={muted}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: borderCol,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: text,
                  minHeight: 72,
                  textAlignVertical: "top",
                }}
              />
            </View>

            <Pressable
              onPress={createBooking}
              disabled={submitting || !selectedSlot}
              style={({ pressed }) => ({
                backgroundColor:
                  pressed || submitting || !selectedSlot ? tint + "80" : tint,
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
                marginBottom: insets.bottom + 20,
              })}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}
                >
                  Confirm Booking
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Facility picker modal */}
      <Modal
        visible={showFacilityModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFacilityModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
                Select Facility
              </Text>
              <Pressable
                onPress={() => setShowFacilityModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: borderCol,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={16} color={text} />
              </Pressable>
            </View>
            {facilities.map((f, i) => (
              <Pressable
                key={f.id}
                onPress={() => {
                  setFacilityId(f.id);
                  setShowFacilityModal(false);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 12,
                  borderBottomWidth: i < facilities.length - 1 ? 1 : 0,
                  borderBottomColor: borderCol,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: tint + "18",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather
                    name={getFacilityIcon(f.name)}
                    size={16}
                    color={tint}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: text }}
                  >
                    {f.name}
                  </Text>
                  {f.facilityType && (
                    <Text style={{ fontSize: 12, color: muted }}>
                      {f.facilityType}
                    </Text>
                  )}
                </View>
                {facilityId === f.id && (
                  <Feather name="check" size={16} color={tint} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {Platform.OS === "ios" && showDatePicker && (
        <DateTimePicker
          value={new Date(date + "T00:00:00")}
          mode="date"
          onChange={(e, d) => {
            setShowDatePicker(false);
            if (e.type === "set" && d) setDate(d.toISOString().slice(0, 10));
          }}
        />
      )}
      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
