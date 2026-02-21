// @ts-nocheck
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getToken, getUser } from "@/lib/auth";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import { config } from "@/lib/config";

function fmtTime(dt: string | number | Date) {
  const d = new Date(dt);
  try {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

function StatusChip({ status }: any) {
  const theme = useColorScheme() ?? "light";
  const statusConfig: any = {
    confirmed: {
      bg: theme === "dark" ? "#052e1f" : "#ecfdf5",
      clr: theme === "dark" ? "#34d399" : "#065f46",
      br: theme === "dark" ? "#1f2937" : "#d1fae5",
      icon: (
        <Feather
          name="check-circle"
          size={14}
          color={theme === "dark" ? "#34d399" : "#065f46"}
        />
      ),
      label: "Confirmed",
    },
    cancelled: {
      bg: theme === "dark" ? "#2a0b0b" : "#fef2f2",
      clr: theme === "dark" ? "#fca5a5" : "#991b1b",
      br: theme === "dark" ? "#1f2937" : "#fecaca",
      icon: (
        <Feather
          name="x-circle"
          size={14}
          color={theme === "dark" ? "#fca5a5" : "#991b1b"}
        />
      ),
      label: "Cancelled",
    },
    pending: {
      bg: theme === "dark" ? "#1e1b3a" : "#eff6ff",
      clr: theme === "dark" ? "#60a5fa" : "#1e40af",
      br: theme === "dark" ? "#1f2937" : "#bfdbfe",
      icon: (
        <Feather
          name="clock"
          size={14}
          color={theme === "dark" ? "#60a5fa" : "#1e40af"}
        />
      ),
      label: "Pending",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: config.bg,
        borderColor: config.br,
      }}
    >
      {config.icon}
      <Text style={{ color: config.clr, fontWeight: "700", fontSize: 12 }}>
        {config.label}
      </Text>
    </View>
  );
}

type Facility = {
  id: string;
  name?: string;
  facilityType?: string;
  operatingHours?: string;
  slotMins?: number;
  capacity?: number;
};

type Booking = {
  id: string;
  userId: string;
  facilityId: string;
  startsAt: string;
  endsAt: string;
  note?: string;
  peopleCount?: number;
  status: "confirmed" | "cancelled" | string;
};

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const tint = useThemeColor({}, "tint");
  const muted = useThemeColor({}, "icon");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  // Backend
  const backendUrl = config.backendUrl;

  // Toast system
  const { showError, showSuccess, toast, hideToast } = useToast();

  // Auth
  const [user, setUserState] = useState<any>(null);
  const [token, setTokenState] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        setTokenState(t);
        setUserState(u || { id: "u1", name: "Admin", communityId: "c1" });
      } catch {
        setUserState({ id: "u1", name: "Admin", communityId: "c1" });
      }
    })();
  }, []);

  // Check authentication and setup (only show errors if user and token loading is complete)
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    // Wait a bit for auth to load
    const timer = setTimeout(() => {
      setAuthChecked(true);
      if (!token) {
        showError(
          "Authentication Required",
          "Please log in to access bookings",
        );
        return;
      }
      // Only show setup error for obvious fallback values, allow real community IDs
      if (!user?.communityId) {
        showError(
          "Setup Required",
          "Please complete your profile setup to access bookings",
        );
        return;
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [token, user?.communityId, showError]);

  // Data
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<string>("");
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [peopleCount, setPeopleCount] = useState<number>("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [userBookingsToday, setUserBookingsToday] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newBookingExpanded, setNewBookingExpanded] = useState(false);

  // Modals
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  const [slotsOpen, setSlotsOpen] = useState(false);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  const minsUsed = useMemo(() => {
    return (userBookingsToday || []).reduce((sum, b) => {
      const s = new Date(b.startsAt).getTime();
      const e = new Date(b.endsAt).getTime();
      return sum + Math.round((e - s) / 60000);
    }, 0);
  }, [userBookingsToday]);
  const minsLeft = Math.max(0, 180 - minsUsed);

  // Build slots for the day
  const buildSlots = useCallback((facility?: Facility | null, d?: string) => {
    if (!facility || !d) return [] as { start: string; end: string }[];
    if (
      !facility.operatingHours ||
      typeof facility.operatingHours !== "string"
    ) {
      return [];
    }
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
      const out: { start: string; end: string }[] = [];
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
  }, []);

  // Load facilities
  const loadFacilities = useCallback(async () => {
    if (!user?.communityId || !token) {
      console.warn("Cannot load facilities: missing communityId or token");
      return;
    }

    try {
      const res = await axios.get(`${backendUrl}/resident/facilities`, {
        params: { communityId: user.communityId },
        headers: authHeaders,
      });
      const f = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      setFacilities(f);
      if (!facilityId && f[0]?.id) setFacilityId(f[0].id);
    } catch (e: any) {
      console.warn("Failed to load facilities", e);
      setFacilities([]);
      if (authChecked && e.response?.status === 401) {
        showError("Authentication Error", "Please log in again");
      } else if (authChecked && e.response?.status === 403) {
        showError(
          "Access Denied",
          "You don't have permission to view facilities",
        );
      } else if (authChecked) {
        showError("Error", "Failed to load facilities");
      }
    }
  }, [
    backendUrl,
    user?.communityId,
    authHeaders,
    facilityId,
    authChecked,
    showError,
  ]);

  // Load bookings
  const loadBookings = useCallback(async () => {
    if (!facilityId || !date || !token) {
      console.warn("Cannot load bookings: missing facilityId, date, or token");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/resident/bookings`, {
        params: { facilityId, date },
        headers: authHeaders,
      });
      const list: Booking[] = Array.isArray(res.data) ? res.data : [];
      const sortedList = list.sort(
        (a, b) => +new Date(a.startsAt) - +new Date(b.startsAt),
      );
      setBookings(sortedList);
    } catch (e: any) {
      console.warn("Failed to load bookings", e);
      setBookings([]);
      if (authChecked && e.response?.status === 401) {
        showError("Authentication Error", "Please log in again");
      } else if (authChecked && e.response?.status === 403) {
        showError(
          "Access Denied",
          "You don't have permission to view bookings",
        );
      } else if (authChecked) {
        showError("Error", "Failed to load bookings");
      }
    } finally {
      setLoading(false);
    }
  }, [
    backendUrl,
    token,
    facilityId,
    date,
    authHeaders,
    authChecked,
    showError,
  ]);

  const loadUserBookingsToday = useCallback(async () => {
    if (!user?.id || !date) return;
    try {
      const res = await axios.get(`${backendUrl}/resident/user-bookings`, {
        params: { userId: user.id, date },
        headers: authHeaders,
      });
      setUserBookingsToday(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error loading user bookings:", e);
      setUserBookingsToday([]);
      showError("Error", "Failed to load your bookings");
    }
  }, [backendUrl, user?.id, date, authHeaders, showError]);

  // Effects
  useEffect(() => {
    if (user && authChecked) loadFacilities();
  }, [user, authChecked, loadFacilities]);

  useEffect(() => {
    if (facilityId && date && authChecked) {
      loadBookings();
      loadUserBookingsToday();
    }
  }, [facilityId, date, authChecked, loadBookings, loadUserBookingsToday]);

  useEffect(() => {
    const fac = facilities.find((f) => f.id === facilityId) || null;
    setSlots(buildSlots(fac, date));
    setSelectedSlot("");
    setSelectedBooking(null); // Clear selected booking when facility/date changes
  }, [facilities, facilityId, date, buildSlots]);

  // Update selected booking when bookings list changes (without triggering loadBookings)
  useEffect(() => {
    if (selectedBooking && bookings.length > 0) {
      const updated = bookings.find((b) => b.id === selectedBooking.id);
      if (
        updated &&
        JSON.stringify(updated) !== JSON.stringify(selectedBooking)
      ) {
        setSelectedBooking(updated);
      }
    }
  }, [bookings]); // Only depend on bookings, not selectedBooking

  const shiftDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    if (newDate < today) {
      showError("Invalid Date", "Cannot select a date in the past");
      return;
    }
    setSelectedBooking(null);
    setDate(newDate);
  };

  const facility = facilities.find((f) => f.id === facilityId) || null;

  // Create booking
  const createBooking = useCallback(async () => {
    if (!facilityId || !selectedSlot) {
      showError("Validation Error", "Please select a facility and time slot");
      return;
    }

    const slot = slots.find((s) => s.start === selectedSlot);
    if (!slot) {
      showError("Invalid Slot", "Please select a valid time slot");
      return;
    }

    if (new Date(slot.start) < new Date()) {
      showError("Invalid Time", "Cannot book a slot in the past");
      return;
    }

    const cap = facility?.capacity || 10;
    const count = peopleCount === "" ? 1 : Number(peopleCount);
    const bookedCount = (bookings || [])
      .filter(
        (b) =>
          +new Date(b.startsAt) === +new Date(slot.start) &&
          +new Date(b.endsAt) === +new Date(slot.end) &&
          b.status === "confirmed",
      )
      .reduce((sum, b) => sum + (b.peopleCount || 1), 0);

    if (bookedCount + count > cap) {
      showError("Slot Full", "This time slot is already fully booked");
      return;
    }

    if (minsLeft < (facility?.slotMins || 60)) {
      showError(
        "Time Limit",
        `You have exceeded your daily booking limit. Only ${Math.floor(
          minsLeft / 60,
        )}h ${minsLeft % 60}m remaining.`,
      );
      return;
    }

    try {
      const payload = {
        userId: user?.id,
        facilityId,
        startsAt: slot.start,
        endsAt: slot.end,
        note: note.trim() || undefined,
        peopleCount: count,
        communityId: user?.communityId,
      };
      const res = await axios.post(`${backendUrl}/resident/bookings`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setNote("");
      setSelectedSlot("");
      setPeopleCount("");
      showSuccess("Success", "Booking confirmed successfully");
      setBookings((prev) =>
        [res.data, ...prev].sort(
          (a, b) => +new Date(a.startsAt) - +new Date(b.startsAt),
        ),
      );
      setSelectedBooking(res.data);
      loadUserBookingsToday();
    } catch (e: any) {
      console.error("Booking error:", e);
      let errorMessage = "Booking failed. Please try again.";
      if (e.response?.data?.error) {
        errorMessage = e.response.data.error;
      } else if (e.response?.status === 400) {
        errorMessage = "Invalid booking data. Please check your inputs.";
      } else if (e.response?.status === 403) {
        errorMessage = "You don't have permission to make this booking.";
      } else if (e.response?.status === 409) {
        errorMessage = "This time slot conflicts with another booking.";
      }
      showError("Booking Failed", errorMessage);
    }
  }, [
    backendUrl,
    token,
    user?.id,
    user?.communityId,
    facilityId,
    slots,
    selectedSlot,
    peopleCount,
    note,
    bookings,
    facility?.capacity,
    facility?.slotMins,
    minsLeft,
    loadUserBookingsToday,
    showError,
    showSuccess,
  ]);

  const cancelBooking = useCallback(
    async (id: string) => {
      try {
        await axios.patch(
          `${backendUrl}/resident/bookings/${id}/cancel`,
          {},
          { headers: authHeaders },
        );
        showSuccess("Success", "Booking cancelled successfully");
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
        );
        // Update selected booking if it's the one being cancelled
        setSelectedBooking((prev) =>
          prev?.id === id ? { ...prev, status: "cancelled" } : prev,
        );
        loadUserBookingsToday();
      } catch (e) {
        console.error("Error cancelling booking:", e);
        showError("Error", "Failed to cancel booking");
      }
    },
    [backendUrl, authHeaders, loadUserBookingsToday, showError, showSuccess],
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Fixed Header */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: Math.max(insets.top, 16),
            backgroundColor: bg,
            borderBottomColor: border,
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
              <Text style={[styles.title, { color: text }]}>
                Facility Bookings
              </Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Book community facilities
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 18, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* New Booking */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <TouchableOpacity
            onPress={() => setNewBookingExpanded(!newBookingExpanded)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: newBookingExpanded ? 12 : 0,
            }}
          >
            <Text style={[styles.cardTitle, { color: text }]}>New Booking</Text>
            <Feather
              name={newBookingExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color={tint}
            />
          </TouchableOpacity>
          {newBookingExpanded && (
            <View style={{ gap: 10 }}>
              {/* Facility */}
              <Text style={[styles.label, { color: icon as any }]}>
                Facility
              </Text>
              <TouchableOpacity
                onPress={() => setFacilitiesOpen(true)}
                style={[
                  styles.select,
                  {
                    borderColor: border,
                    backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                    minHeight: 48, // Better touch target for mobile
                  },
                ]}
              >
                <Text style={{ color: text, fontSize: 16 }} numberOfLines={1}>
                  {facility?.facilityType ||
                    facility?.name ||
                    "Select facility"}
                </Text>
                <Feather name="chevron-down" size={20} color={icon as any} />
              </TouchableOpacity>

              {/* Date */}
              <Text style={[styles.label, { color: icon as any }]}>Date</Text>
              <View
                style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
              >
                <TouchableOpacity
                  onPress={() => shiftDay(-1)}
                  style={[
                    styles.btn,
                    styles.btnOutline,
                    {
                      borderColor: border,
                      minHeight: 48,
                      minWidth: 48,
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Feather name="chevron-left" size={20} color={icon as any} />
                </TouchableOpacity>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={icon as any}
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      color: text,
                      borderColor: border,
                      backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                      minHeight: 48,
                      fontSize: 16,
                      textAlign: "center",
                    },
                  ]}
                />
                <TouchableOpacity
                  onPress={() => shiftDay(+1)}
                  style={[
                    styles.btn,
                    styles.btnOutline,
                    {
                      borderColor: border,
                      minHeight: 48,
                      minWidth: 48,
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Feather name="chevron-right" size={20} color={icon as any} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setDate(new Date().toISOString().slice(0, 10))}
                style={[
                  styles.btn,
                  styles.btnGhost,
                  {
                    alignSelf: "flex-start",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  },
                ]}
              >
                <Text
                  style={{
                    color: icon as any,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  Today
                </Text>
              </TouchableOpacity>

              {/* Slot */}
              <Text style={[styles.label, { color: icon as any }]}>
                Time Slot
              </Text>
              <TouchableOpacity
                onPress={() => setSlotsOpen(true)}
                style={[
                  styles.select,
                  {
                    borderColor: border,
                    backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                  },
                ]}
              >
                <Text style={{ color: text, fontSize: 16 }} numberOfLines={1}>
                  {selectedSlot
                    ? `${fmtTime(selectedSlot)} – ${fmtTime(
                        (slots.find((s) => s.start === selectedSlot)
                          ?.end as any) || selectedSlot,
                      )}`
                    : "Select time slot"}
                </Text>
                <Feather name="chevron-down" size={20} color={icon as any} />
              </TouchableOpacity>

              {/* People Count */}
              <Text style={[styles.label, { color: icon as any }]}>
                How many people?
              </Text>
              <TextInput
                keyboardType="number-pad"
                value={String(peopleCount)}
                onChangeText={(v) => {
                  if (v === "") {
                    setPeopleCount("");
                    return;
                  }
                  const num = parseInt(v, 10);
                  const cap = facility?.capacity || 10;
                  setPeopleCount(
                    isNaN(num) ? "" : Math.max(1, Math.min(num, cap)),
                  );
                }}
                style={[
                  styles.input,
                  {
                    color: text,
                    borderColor: border,
                    backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                  },
                ]}
              />

              {/* Note */}
              <Text style={[styles.label, { color: icon as any }]}>
                Note (optional)
              </Text>
              <TextInput
                placeholder="Birthday party, team meeting, etc."
                placeholderTextColor={icon as any}
                value={note}
                onChangeText={setNote}
                style={[
                  styles.input,
                  {
                    color: text,
                    borderColor: border,
                    backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                  },
                ]}
              />

              <Text style={{ color: icon as any, fontSize: 12 }}>
                You have {Math.floor(minsLeft / 60)}h {minsLeft % 60}m left to
                book today.
              </Text>

              <TouchableOpacity
                onPress={createBooking}
                disabled={!facilityId || !selectedSlot}
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  {
                    opacity: !facilityId || !selectedSlot ? 0.6 : 1,
                    minHeight: 52,
                    justifyContent: "center",
                  },
                ]}
              >
                <Feather name="check-circle" size={18} color="#fff" />
                <Text
                  style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                >
                  Confirm Booking
                </Text>
              </TouchableOpacity>

              {facility && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Feather name="clock" size={14} color={icon as any} />
                  <Text style={{ color: icon as any, fontSize: 12 }}>
                    {facility.operatingHours ? (
                      <>
                        Hours: {facility.operatingHours} • Slot:{" "}
                        {facility.slotMins || 60}m
                      </>
                    ) : (
                      <>Facility configuration loading...</>
                    )}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* My Bookings */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text style={[styles.cardTitle, { color: text }]}>My Bookings</Text>
            <TouchableOpacity
              onPress={loadBookings}
              style={[
                styles.btn,
                styles.btnOutline,
                {
                  borderColor: border,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  minHeight: 44,
                },
              ]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <>
                  <Feather name="refresh-cw" size={16} color={icon as any} />
                  <Text style={{ color: icon as any, fontWeight: "700" }}>
                    Refresh
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: text, fontSize: 14, fontWeight: "600" }}>
              {facility?.name || facility?.facilityType || "Select a Facility"}
            </Text>
            <Text style={{ color: icon as any, fontSize: 12, marginTop: 2 }}>
              {date
                ? new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Select a date"}
            </Text>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ color: icon as any, marginTop: 8 }}>
                Loading schedule...
              </Text>
            </View>
          ) : bookings.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 32,
                },
              ]}
            >
              <Feather
                name="calendar"
                size={48}
                color={icon as any}
                style={{ opacity: 0.5, marginBottom: 16 }}
              />
              <Text
                style={{
                  color: text,
                  fontWeight: "600",
                  fontSize: 16,
                  marginBottom: 4,
                }}
              >
                No bookings scheduled
              </Text>
              <Text style={{ color: icon as any, textAlign: "center" }}>
                This facility is available for the entire day
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {bookings.map((b) => {
                const isUserBooking = b.userId === user?.id;
                const startTime = new Date(b.startsAt);
                const endTime = new Date(b.endsAt);
                const duration = Math.round(
                  (endTime.getTime() - startTime.getTime()) / (1000 * 60),
                );

                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => {
                      // Prevent rapid clicks and ensure booking is valid
                      if (selectedBooking?.id === b.id) {
                        setSelectedBooking(null);
                      } else if (b && b.id) {
                        setSelectedBooking({ ...b });
                      }
                    }}
                    style={[
                      styles.listItem,
                      {
                        borderColor:
                          selectedBooking?.id === b.id ? "#c7d2fe" : border,
                        backgroundColor:
                          selectedBooking?.id === b.id
                            ? theme === "dark"
                              ? "#0b1220"
                              : "#eef2ff"
                            : isUserBooking
                              ? theme === "dark"
                                ? "#1a1a2e"
                                : "#f0f4ff"
                              : "transparent",
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: text,
                            fontWeight: "700",
                            fontSize: 16,
                          }}
                        >
                          {fmtTime(b.startsAt)} – {fmtTime(b.endsAt)}
                        </Text>
                        <Text style={{ color: icon as any, fontSize: 12 }}>
                          {duration} min
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: icon as any,
                          marginBottom: 4,
                          fontSize: 14,
                        }}
                      >
                        {b.note || "No description"}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        {b.peopleCount && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Feather
                              name="user"
                              size={10}
                              color={icon as any}
                            />
                            <Text style={{ color: icon as any, fontSize: 10 }}>
                              {b.peopleCount} people
                            </Text>
                          </View>
                        )}
                        {isUserBooking && (
                          <Text
                            style={{
                              color: theme === "dark" ? "#60a5fa" : "#2563eb",
                              fontSize: 10,
                              fontWeight: "600",
                            }}
                          >
                            Your booking
                          </Text>
                        )}
                      </View>
                    </View>
                    <StatusChip status={b.status} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Booking Details */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          {!selectedBooking ? (
            <Text style={{ color: icon as any }}>
              Select a booking to view details.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text
                    style={{ color: text, fontWeight: "700", fontSize: 16 }}
                  >
                    {fmtTime(selectedBooking.startsAt)} –{" "}
                    {fmtTime(selectedBooking.endsAt)}
                  </Text>
                  <Text
                    style={{ color: icon as any, fontSize: 12, marginTop: 2 }}
                  >
                    {facility?.facilityType || "Facility"} •{" "}
                    {Math.round(
                      (new Date(selectedBooking.endsAt).getTime() -
                        new Date(selectedBooking.startsAt).getTime()) /
                        (1000 * 60),
                    )}{" "}
                    minutes
                  </Text>
                </View>
                <StatusChip status={selectedBooking.status} />
              </View>

              <View>
                <Text
                  style={{ color: text, fontWeight: "700", marginBottom: 6 }}
                >
                  Description
                </Text>
                <Text style={{ color: icon as any }}>
                  {selectedBooking.note || "No description provided"}
                </Text>
              </View>

              {selectedBooking.peopleCount && (
                <View>
                  <Text
                    style={{ color: text, fontWeight: "700", marginBottom: 6 }}
                  >
                    People Count
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Feather name="users" size={16} color={icon as any} />
                    <Text style={{ color: text }}>
                      {selectedBooking.peopleCount} people
                    </Text>
                  </View>
                </View>
              )}

              {selectedBooking.userId === user?.id &&
                selectedBooking.status !== "cancelled" && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => cancelBooking(selectedBooking.id)}
                      style={[
                        styles.btn,
                        styles.btnOutline,
                        {
                          borderColor: "#dc2626",
                          flex: 1,
                          backgroundColor:
                            theme === "dark" ? "#1f1f1f" : "#fff",
                        },
                      ]}
                    >
                      <Feather name="x-circle" size={16} color="#dc2626" />
                      <Text
                        style={{
                          color: "#dc2626",
                          fontWeight: "700",
                          fontSize: 16,
                        }}
                      >
                        Cancel Booking
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Facilities Modal */}
      <Modal visible={facilitiesOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: text, marginBottom: 8 }]}>
              Select Facility
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {facilities.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => {
                    setFacilityId(f.id);
                    setFacilitiesOpen(false);
                  }}
                  style={[styles.rowItem, { borderColor: border }]}
                >
                  <Text style={{ color: text }}>
                    {f.facilityType || f.name || f.id}
                  </Text>
                  {f.operatingHours && (
                    <Text style={{ color: icon as any, fontSize: 12 }}>
                      {f.operatingHours}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setFacilitiesOpen(false)}
              style={[
                styles.btn,
                styles.btnGhost,
                {
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: border,
                },
              ]}
            >
              <Text
                style={{ color: icon as any, fontWeight: "700", fontSize: 16 }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Slots Modal */}
      <Modal visible={slotsOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: text, marginBottom: 8 }]}>
              Select Time Slot
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {slots.map((s, idx) => {
                const bookedCount = (bookings || [])
                  .filter(
                    (b) =>
                      +new Date(b.startsAt) === +new Date(s.start) &&
                      +new Date(b.endsAt) === +new Date(s.end) &&
                      b.status === "confirmed",
                  )
                  .reduce((sum, b) => sum + (b.peopleCount || 1), 0);
                const cap = facility?.capacity || 10;
                const isPast = new Date(s.start) < new Date();
                const disabled = bookedCount >= cap || isPast;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      if (disabled) return;
                      setSelectedSlot(s.start);
                      setSlotsOpen(false);
                    }}
                    disabled={disabled}
                    style={[
                      styles.rowItem,
                      { borderColor: border, opacity: disabled ? 0.5 : 1 },
                    ]}
                  >
                    <Text style={{ color: text }}>
                      {fmtTime(s.start)} – {fmtTime(s.end)}
                    </Text>
                    <Text style={{ color: icon as any, fontSize: 12 }}>
                      {bookedCount}/{cap} booked
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setSlotsOpen(false)}
              style={[
                styles.btn,
                styles.btnGhost,
                {
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: border,
                },
              ]}
            >
              <Text
                style={{ color: icon as any, fontWeight: "700", fontSize: 16 }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
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
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  select: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  btnGhost: {
    backgroundColor: "transparent",
  },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  rowItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 56,
    justifyContent: "center",
  },
});
