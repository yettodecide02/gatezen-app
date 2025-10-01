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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getToken, getUser } from "@/lib/auth";

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

function toISO(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function toHM(date: Date | string) {
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

type Facility = {
  id: string;
  name?: string;
  facilityType?: string;
  operatingHours?: string; // "HH:MM-HH:MM"
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
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  // backend
  const backendUrl =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    process.env.EXPO_BACKEND_URL ||
    "http://localhost:4000";

  // auth/user
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        setTokenState(t);
        setUserState(
          u || {
            id: "u1",
            name: "Admin",
            communityId: "c1",
          }
        );
      } catch {
        setUserState({ id: "u1", name: "Admin", communityId: "c1" });
      }
    })();
  }, []);

  // toast-lite
  const toastTimer = useRef<any>();
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // state
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<string>("");
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [peopleInput, setPeopleInput] = useState<string>("1");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [userBookingsToday, setUserBookingsToday] = useState<Booking[]>([]);

  const minsUsed = useMemo(() => {
    return (userBookingsToday || []).reduce((sum, b) => {
      const s = new Date(b.startsAt).getTime();
      const e = new Date(b.endsAt).getTime();
      return sum + Math.round((e - s) / 60000);
    }, 0);
  }, [userBookingsToday]);
  const minsLeft = Math.max(0, 180 - minsUsed);

  // helpers
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

  // load facilities
  const loadFacilities = useCallback(async () => {
    if (!user?.communityId) return;
    try {
      const res = await axios.get(`${backendUrl}/resident/facilities`, {
        params: { communityId: user.communityId },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const f = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setFacilities(f);
      if (!facilityId && f[0]?.id) setFacilityId(f[0].id);
    } catch (e) {
      console.warn("Failed to load facilities", e);
      setFacilities([]);
      showToast("Failed to load facilities");
    }
  }, [backendUrl, token, user?.communityId, facilityId, showToast]);

  // load bookings
  const loadBookings = useCallback(async () => {
    if (!facilityId || !date) return;
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/resident/bookings`, {
        params: { facilityId, date },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const list: Booking[] = Array.isArray(res.data) ? res.data : [];
      setBookings(
        list.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      );
    } catch (e) {
      console.warn("Failed to load bookings", e);
      setBookings([]);
      showToast("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token, facilityId, date, showToast]);

  const loadUserBookingsToday = useCallback(async () => {
    if (!user?.id || !date) return;
    try {
      const res = await axios.get(`${backendUrl}/resident/user-bookings`, {
        params: { userId: user.id, date },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setUserBookingsToday(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setUserBookingsToday([]);
    }
  }, [backendUrl, token, user?.id, date]);

  // effects
  useEffect(() => {
    if (user) loadFacilities();
  }, [user, loadFacilities]);

  useEffect(() => {
    if (facilityId && date) {
      loadBookings();
      loadUserBookingsToday();
    }
  }, [facilityId, date, loadBookings, loadUserBookingsToday]);

  useEffect(() => {
    const fac = facilities.find((f) => f.id === facilityId) || null;
    setSlots(buildSlots(fac, date));
    setSelectedSlot("");
  }, [facilities, facilityId, date, buildSlots]);

  useEffect(() => {
    // Clamp people count/input when capacity changes
    const cap = facility?.capacity || 10;
    const n = Math.max(1, Math.min(peopleCount, cap));
    if (n !== peopleCount) {
      setPeopleCount(n);
      setPeopleInput(String(n));
    }
  }, [facility?.capacity]);

  // polling (simple) for live updates
  useEffect(() => {
    const id = setInterval(() => {
      loadBookings();
      loadUserBookingsToday();
    }, 5000);
    return () => clearInterval(id);
  }, [loadBookings, loadUserBookingsToday]);

  const shiftDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const facility = facilities.find((f) => f.id === facilityId) || null;

  // booking create/cancel
  const createBooking = useCallback(async () => {
    if (!facilityId || !selectedSlot) return;
    const slot = slots.find((s) => s.start === selectedSlot);
    if (!slot) return Alert.alert("Select a valid slot");
    if (new Date(slot.start) < new Date()) {
      return Alert.alert("Invalid", "Cannot book a past slot");
    }

    const cap = facility?.capacity || 10;
    const nRaw = parseInt(peopleInput || String(peopleCount), 10);
    const effectiveCount = isNaN(nRaw) ? 1 : Math.max(1, Math.min(nRaw, cap));

    const bookedCount = (bookings || [])
      .filter(
        (b) =>
          +new Date(b.startsAt) === +new Date(slot.start) &&
          +new Date(b.endsAt) === +new Date(slot.end) &&
          b.status === "confirmed"
      )
      .reduce((sum, b) => sum + (b.peopleCount || 1), 0);
    if (bookedCount + effectiveCount > cap) {
      return Alert.alert("Full", "This slot is full");
    }

    try {
      const payload = {
        userId: user?.id,
        facilityId,
        startsAt: slot.start,
        endsAt: slot.end,
        note,
        peopleCount: effectiveCount,
      };
      await axios.post(`${backendUrl}/resident/bookings`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setNote("");
      setSelectedSlot("");
      setPeopleCount(effectiveCount);
      setPeopleInput(String(effectiveCount));
      showToast("Booked ✔");
      loadBookings();
      loadUserBookingsToday();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Failed to create booking";
      Alert.alert("Error", msg);
    }
  }, [
    backendUrl,
    token,
    user?.id,
    facilityId,
    slots,
    selectedSlot,
    peopleCount,
    peopleInput,
    note,
    bookings,
    facility?.capacity,
    loadBookings,
    loadUserBookingsToday,
    showToast,
  ]);

  const cancelBooking = useCallback(
    async (id: string) => {
      try {
        await axios.patch(
          `${backendUrl}/resident/bookings/${id}/cancel`,
          {},
          { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
        );
        showToast("Cancelled");
        loadBookings();
        loadUserBookingsToday();
      } catch (e) {
        Alert.alert("Error", "Failed to cancel booking");
      }
    },
    [backendUrl, token, loadBookings, loadUserBookingsToday, showToast]
  );

  // Simple Select modal UI
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  const [slotsOpen, setSlotsOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top + 8 }}>
      {toast ? (
        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            alignSelf: "center",
            backgroundColor: theme === "dark" ? "#0B0B0B" : "#111827",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            zIndex: 10,
          }}
        >
          <Text style={{ color: "#fff" }}>{toast}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              height: 28,
              width: 28,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: border,
              backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
            }}
          >
            <Feather name="calendar" size={16} color={icon as any} />
          </View>
          <Text style={{ color: text, fontSize: 18, fontWeight: "800" }}>
            Facility Bookings
          </Text>
        </View>

        {/* New Booking */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Text style={[styles.cardTitle, { color: text }]}>New Booking</Text>
          <View style={{ gap: 10 }}>
            {/* Facility select */}
            <Text style={[styles.label, { color: icon as any }]}>Facility</Text>
            <TouchableOpacity
              onPress={() => setFacilitiesOpen(true)}
              style={[
                styles.select,
                {
                  borderColor: border,
                  backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                },
              ]}
            >
              <Text style={{ color: text }} numberOfLines={1}>
                {facility?.facilityType || facility?.name || "Select facility"}
              </Text>
              <Feather name="chevron-down" size={18} color={icon as any} />
            </TouchableOpacity>

            {/* Date */}
            <Text style={[styles.label, { color: icon as any }]}>Date</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => shiftDay(-1)}
                style={[styles.btn, styles.btnOutline, { borderColor: border }]}
              >
                <Feather name="chevron-left" size={18} color={icon as any} />
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
                  },
                ]}
              />
              <TouchableOpacity
                onPress={() => shiftDay(+1)}
                style={[styles.btn, styles.btnOutline, { borderColor: border }]}
              >
                <Feather name="chevron-right" size={18} color={icon as any} />
              </TouchableOpacity>
            </View>

            {/* Slot */}
            <Text style={[styles.label, { color: icon as any }]}>Slot</Text>
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
              <Text style={{ color: text }} numberOfLines={1}>
                {selectedSlot
                  ? `${fmtTime(selectedSlot)} – ${fmtTime(
                      (slots.find((s) => s.start === selectedSlot)
                        ?.end as any) || selectedSlot
                    )}`
                  : "Select slot"}
              </Text>
              <Feather name="chevron-down" size={18} color={icon as any} />
            </TouchableOpacity>

            {/* People */}
            <Text style={[styles.label, { color: icon as any }]}>
              How many people?
            </Text>
            <TextInput
              keyboardType="number-pad"
              value={peopleInput}
              onChangeText={(v) => {
                // Allow empty while typing; update numeric state lazily
                const sanitized = v.replace(/[^0-9]/g, "");
                setPeopleInput(sanitized);
              }}
              onBlur={() => {
                const cap = facility?.capacity || 10;
                const nRaw = parseInt(peopleInput || "1", 10);
                const n = isNaN(nRaw) ? 1 : Math.max(1, Math.min(nRaw, cap));
                setPeopleCount(n);
                setPeopleInput(String(n));
              }}
              onSubmitEditing={() => {
                const cap = facility?.capacity || 10;
                const nRaw = parseInt(peopleInput || "1", 10);
                const n = isNaN(nRaw) ? 1 : Math.max(1, Math.min(nRaw, cap));
                setPeopleCount(n);
                setPeopleInput(String(n));
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
              placeholder="Birthday, match, etc."
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

            <Text style={{ color: icon as any }}>
              You have {Math.floor(minsLeft / 60)}h {minsLeft % 60}m left to
              book today.
            </Text>

            <TouchableOpacity
              onPress={createBooking}
              style={[styles.btn, styles.btnPrimary]}
            >
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Confirm Booking
              </Text>
            </TouchableOpacity>

            {facility ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Feather name="clock" size={14} color={icon as any} />
                <Text style={{ color: icon as any }}>
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
            ) : null}
          </View>
        </View>

        {/* Schedule */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text style={{ color: icon as any }}>
              Schedule — {facility?.name || facility?.facilityType || "…"}
            </Text>
            <TouchableOpacity
              onPress={loadBookings}
              style={[styles.btn, styles.btnGhost]}
            >
              <Feather name="refresh-cw" size={16} color={icon as any} />
              <Text style={{ color: icon as any, fontWeight: "600" }}>
                Refresh
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : bookings.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: icon as any }}>
                No bookings for this day.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {bookings.map((b) => (
                <View
                  key={b.id}
                  style={[styles.listItem, { borderColor: border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: text, fontWeight: "700" }}>
                      {fmtTime(b.startsAt)} – {fmtTime(b.endsAt)}
                    </Text>
                    <Text style={{ color: icon as any }}>{b.note || "—"}</Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor:
                        b.status === "confirmed"
                          ? theme === "dark"
                            ? "#1f2937"
                            : "#D1FAE5"
                          : theme === "dark"
                          ? "#1f2937"
                          : "#FECACA",
                      backgroundColor:
                        b.status === "confirmed"
                          ? theme === "dark"
                            ? "#052e1f"
                            : "#ECFDF5"
                          : theme === "dark"
                          ? "#2a0b0b"
                          : "#FEF2F2",
                    }}
                  >
                    {b.status === "confirmed" ? (
                      <Feather
                        name="calendar"
                        size={14}
                        color={theme === "dark" ? "#34D399" : "#065F46"}
                      />
                    ) : (
                      <Feather
                        name="x-circle"
                        size={14}
                        color={theme === "dark" ? "#FCA5A5" : "#991B1B"}
                      />
                    )}
                    <Text
                      style={{
                        color:
                          b.status === "confirmed"
                            ? theme === "dark"
                              ? "#A7F3D0"
                              : "#065F46"
                            : theme === "dark"
                            ? "#FCA5A5"
                            : "#991B1B",
                        fontWeight: "700",
                      }}
                    >
                      {b.status === "confirmed" ? "Confirmed" : "Cancelled"}
                    </Text>
                  </View>
                  {b.userId === user?.id && b.status !== "cancelled" ? (
                    <TouchableOpacity
                      onPress={() => cancelBooking(b.id)}
                      style={[
                        styles.btn,
                        styles.btnOutline,
                        { borderColor: border },
                      ]}
                    >
                      <Feather name="x-circle" size={16} color={icon as any} />
                      <Text style={{ color: icon as any, fontWeight: "700" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Facilities modal */}
      <Modal visible={facilitiesOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: text, marginBottom: 8 }]}>
              Select facility
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
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setFacilitiesOpen(false)}
              style={[styles.btn, styles.btnGhost, { marginTop: 10 }]}
            >
              <Text style={{ color: icon as any, fontWeight: "700" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Slots modal */}
      <Modal visible={slotsOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: text, marginBottom: 8 }]}>
              Select slot
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {slots.map((s, idx) => {
                const bookedCount = (bookings || [])
                  .filter(
                    (b) =>
                      +new Date(b.startsAt) === +new Date(s.start) &&
                      +new Date(b.endsAt) === +new Date(s.end) &&
                      b.status === "confirmed"
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
                      {fmtTime(s.start)} – {fmtTime(s.end)} ({bookedCount}/{cap}{" "}
                      booked)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setSlotsOpen(false)}
              style={[styles.btn, styles.btnGhost, { marginTop: 10 }]}
            >
              <Text style={{ color: icon as any, fontWeight: "700" }}>
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
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  select: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btnPrimary: {
    backgroundColor: "#2563EB",
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
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  rowItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
