// @ts-nocheck
import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import axios from "axios";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";

const STATUS_LABEL: any = {
  pending: "Pending",
  cancelled: "Cancelled",
  checked_in: "Checked In",
  checked_out: "Checked Out",
};

const VISITOR_TYPES = [
  { value: "GUEST", label: "Guest" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "CAB_AUTO", label: "Cab/Auto" },
];

function StatusChip({ status }: any) {
  const key = (status || "pending").toLowerCase();
  const map: any = {
    pending: {
      bg: "#fffbeb",
      clr: "#92400e",
      br: "#fde68a",
      icon: <Feather name="clock" size={14} color="#92400e" />,
    },
    cancelled: {
      bg: "#fef2f2",
      clr: "#991b1b",
      br: "#fecaca",
      icon: <Feather name="x-circle" size={14} color="#991b1b" />,
    },
    checked_in: {
      bg: "#ecfdf5",
      clr: "#065f46",
      br: "#a7f3d0",
      icon: <Feather name="log-in" size={14} color="#065f46" />,
    },
    checked_out: {
      bg: "#f3f4f6",
      clr: "#374151",
      br: "#d1d5db",
      icon: <Feather name="log-out" size={14} color="#374151" />,
    },
  };
  const s = map[key] || map.pending;
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
        backgroundColor: s.bg,
        borderColor: s.br,
      }}
    >
      {s.icon}
      <Text style={{ color: s.clr, fontWeight: "700" }}>
        {STATUS_LABEL[key] || status}
      </Text>
    </View>
  );
}

function TypeChip({ type }: any) {
  const displayType =
    type
      ?.replace("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Guest";
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
      }}
    >
      <Text style={{ color: "#1E40AF", fontSize: 12, fontWeight: "600" }}>
        {displayType}
      </Text>
    </View>
  );
}

function isoNowLocalDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoNowLocalTime() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VisitorsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  // Backend
  const backendUrl =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    process.env.EXPO_BACKEND_URL ||
    "http://localhost:4000";

  // Auth
  const [user, setUserState] = useState<any>(null);
  const [token, setTokenState] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        setTokenState(t);
        setUserState(u || { id: "u1", name: "Resident", communityId: "c1" });
      } catch {
        setUserState({ id: "u1", name: "Resident", communityId: "c1" });
      }
    })();
  }, []);

  // Data
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date filters
  const [from, setFrom] = useState(isoNowLocalDate());
  const [to, setTo] = useState(isoNowLocalDate());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // New visitor form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("GUEST");
  const [expectedDate, setExpectedDate] = useState(isoNowLocalDate());
  const [expectedTime, setExpectedTime] = useState(isoNowLocalTime());
  const [showExpectedDatePicker, setShowExpectedDatePicker] = useState(false);
  const [showExpectedTimePicker, setShowExpectedTimePicker] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const toastTimer = useRef<any>();
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token]
  );

  const load = useCallback(async () => {
    if (!user?.id || !user?.communityId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("communityId", user.communityId);
      params.set("userId", user.id);

      const res = await axios.get(
        `${backendUrl}/resident/visitors?${params.toString()}`,
        {
          headers: authHeaders,
        }
      );
      const list = Array.isArray(res.data) ? res.data : [];
      setVisitors(list);
    } catch (e) {
      setVisitors([]);
      showToast("Error loading visitors");
    } finally {
      setLoading(false);
    }
  }, [
    backendUrl,
    user?.id,
    user?.communityId,
    from,
    to,
    authHeaders,
    showToast,
  ]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const preAuthorize = useCallback(async () => {
    if (!name.trim() || !purpose.trim()) {
      showToast("Please fill name and purpose");
      return;
    }
    if (type === "GUEST" && !email.trim()) {
      showToast("Email is required for GUEST visitor type");
      return;
    }
    if (!user?.communityId || !user?.id) {
      showToast("User information missing. Please log in again");
      return;
    }

    try {
      setSubmitting(true);
      const localDateTime = `${expectedDate}T${expectedTime}:00`;
      const expectedAt = new Date(localDateTime).toISOString();

      const requestData = {
        name: name.trim(),
        email: email.trim(),
        type: type || "GUEST",
        expectedAt,
        purpose: purpose.trim(),
        vehicle: vehicle?.trim() || null,
        notes: notes?.trim() || null,
        communityId: user.communityId,
        residentId: user.id,
      };

      await axios.post(`${backendUrl}/resident/visitor-creation`, requestData, {
        headers: authHeaders,
      });

      // Reset form
      setName("");
      setEmail("");
      setType("GUEST");
      setPurpose("");
      setVehicle("");
      setNotes("");
      showToast("Pre-authorization submitted successfully!");
      load();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        "Error creating visitor. Please try again.";
      showToast(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [
    backendUrl,
    authHeaders,
    user?.communityId,
    user?.id,
    name,
    email,
    type,
    expectedDate,
    expectedTime,
    purpose,
    vehicle,
    notes,
    showToast,
    load,
  ]);

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
            <Feather name="users" size={16} color={icon as any} />
          </View>
          <Text style={{ color: text, fontSize: 18, fontWeight: "800" }}>
            Visitor & Access Management
          </Text>
        </View>

        {/* Pre-Authorize Guest */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Text style={[styles.cardTitle, { color: text }]}>
            Pre-Authorize Guest
          </Text>
          <View style={{ gap: 10 }}>
            <TextInput
              placeholder="Visitor Name (e.g., John Doe)"
              placeholderTextColor={icon as any}
              value={name}
              onChangeText={setName}
              style={[
                styles.input,
                {
                  color: text,
                  borderColor: border,
                  backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                },
              ]}
            />

            <View style={styles.inputWithIcon}>
              <View
                style={[
                  styles.input,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    color: text,
                    borderColor: border,
                    backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                  },
                ]}
              >
                <Feather name="mail" size={16} color={icon as any} />
                <TextInput
                  placeholder="visitor@example.com"
                  placeholderTextColor={icon as any}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  style={{
                    flex: 1,
                    color: text,
                    fontSize: 16,
                  }}
                />
              </View>
            </View>

            {/* Visitor Type Selector */}
            <View>
              <Text style={[styles.label, { color: text }]}>Visitor Type</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                {VISITOR_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setType(t.value)}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor:
                          type === t.value ? "#2563EB" : "transparent",
                        borderColor: type === t.value ? "#2563EB" : border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: type === t.value ? "#fff" : text,
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date & Time */}
            <View>
              <Text style={[styles.label, { color: text }]}>
                Expected Date & Time
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <TouchableOpacity
                  onPress={() => setShowExpectedDatePicker(true)}
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderColor: border,
                      backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                    },
                  ]}
                >
                  <Text style={{ color: text }}>
                    {new Date(expectedDate).toLocaleDateString()}
                  </Text>
                  <Feather name="calendar" size={16} color={icon as any} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowExpectedTimePicker(true)}
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderColor: border,
                      backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                    },
                  ]}
                >
                  <Text style={{ color: text }}>{expectedTime}</Text>
                  <Feather name="clock" size={16} color={icon as any} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputWithIcon}>
              <View
                style={[
                  styles.input,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    color: text,
                    borderColor: border,
                    backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                  },
                ]}
              >
                <Feather name="clipboard" size={16} color={icon as any} />
                <TextInput
                  placeholder="Purpose (Delivery / Guest / Maintenance)"
                  placeholderTextColor={icon as any}
                  value={purpose}
                  onChangeText={setPurpose}
                  style={{
                    flex: 1,
                    color: text,
                    fontSize: 16,
                  }}
                />
              </View>
            </View>

            <View style={styles.inputWithIcon}>
              <View
                style={[
                  styles.input,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    color: text,
                    borderColor: border,
                    backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                  },
                ]}
              >
                <Feather name="truck" size={16} color={icon as any} />
                <TextInput
                  placeholder="Vehicle (optional, e.g., KA01 AB 1234)"
                  placeholderTextColor={icon as any}
                  value={vehicle}
                  onChangeText={setVehicle}
                  style={{
                    flex: 1,
                    color: text,
                    fontSize: 16,
                  }}
                />
              </View>
            </View>

            <TextInput
              placeholder="Notes (optional) - Any extra instructions for security"
              placeholderTextColor={icon as any}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              style={[
                styles.textarea,
                {
                  color: text,
                  borderColor: border,
                  backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                },
              ]}
            />

            <TouchableOpacity
              onPress={preAuthorize}
              disabled={submitting}
              style={[
                styles.btn,
                styles.btnPrimary,
                { opacity: submitting ? 0.6 : 1 },
              ]}
            >
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {submitting ? "Submitting..." : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Visitors */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={[styles.cardTitle, { color: text }]}>
              Upcoming / Recent
            </Text>
            <TouchableOpacity onPress={load} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={icon as any} />
              ) : (
                <Feather name="refresh-cw" size={16} color={icon as any} />
              )}
            </TouchableOpacity>
          </View>

          {/* Date Range Filter */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.filterLabel, { color: icon as any }]}>
                From
              </Text>
              <TouchableOpacity
                onPress={() => setShowFromPicker(true)}
                style={[
                  styles.filterInput,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderColor: border,
                    backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                  },
                ]}
              >
                <Text style={{ color: text, fontSize: 14 }}>
                  {new Date(from).toLocaleDateString()}
                </Text>
                <Feather name="calendar" size={14} color={icon as any} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.filterLabel, { color: icon as any }]}>
                To
              </Text>
              <TouchableOpacity
                onPress={() => setShowToPicker(true)}
                style={[
                  styles.filterInput,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderColor: border,
                    backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                  },
                ]}
              >
                <Text style={{ color: text, fontSize: 14 }}>
                  {new Date(to).toLocaleDateString()}
                </Text>
                <Feather name="calendar" size={14} color={icon as any} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator size="large" color={icon as any} />
            </View>
          ) : visitors.length === 0 ? (
            <Text
              style={{
                color: icon as any,
                textAlign: "center",
                paddingVertical: 20,
              }}
            >
              No visitors in range.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {visitors.map((visitor) => (
                <View
                  key={visitor.id}
                  style={[
                    styles.visitorItem,
                    { borderColor: border, backgroundColor: "transparent" },
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
                        style={{ color: text, fontWeight: "700", fontSize: 16 }}
                      >
                        {visitor.name}
                      </Text>
                      <TypeChip type={visitor.type} />
                    </View>
                    <Text
                      style={{
                        color: icon as any,
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      {visitor.email}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 2,
                      }}
                    >
                      <Feather name="calendar" size={12} color={icon as any} />
                      <Text style={{ color: icon as any, fontSize: 12 }}>
                        {new Date(visitor.expectedAt).toLocaleString()}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: icon as any,
                        fontSize: 12,
                        marginBottom: 2,
                      }}
                    >
                      Purpose: {visitor.purpose}
                    </Text>
                    {visitor.vehicle && (
                      <Text
                        style={{
                          color: icon as any,
                          fontSize: 12,
                          marginBottom: 2,
                        }}
                      >
                        Vehicle: {visitor.vehicle}
                      </Text>
                    )}
                    {visitor.notes && (
                      <Text style={{ color: icon as any, fontSize: 12 }}>
                        Notes: {visitor.notes}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <StatusChip status={visitor.status?.toLowerCase()} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date/Time Pickers */}
      {showFromPicker && (
        <DateTimePicker
          value={new Date(from)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowFromPicker(false);
            if (selectedDate) {
              const formattedDate = selectedDate.toISOString().split("T")[0];
              setFrom(formattedDate);
            }
          }}
        />
      )}

      {showToPicker && (
        <DateTimePicker
          value={new Date(to)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowToPicker(false);
            if (selectedDate) {
              const formattedDate = selectedDate.toISOString().split("T")[0];
              setTo(formattedDate);
            }
          }}
        />
      )}

      {showExpectedDatePicker && (
        <DateTimePicker
          value={new Date(expectedDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowExpectedDatePicker(false);
            if (selectedDate) {
              const formattedDate = selectedDate.toISOString().split("T")[0];
              setExpectedDate(formattedDate);
            }
          }}
        />
      )}

      {showExpectedTimePicker && (
        <DateTimePicker
          value={new Date(`${expectedDate}T${expectedTime}:00`)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedTime) => {
            setShowExpectedTimePicker(false);
            if (selectedTime) {
              const hours = selectedTime.getHours().toString().padStart(2, "0");
              const minutes = selectedTime
                .getMinutes()
                .toString()
                .padStart(2, "0");
              setExpectedTime(`${hours}:${minutes}`);
            }
          }}
        />
      )}
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  inputWithIcon: {
    // Container for inputs with icons
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    textAlignVertical: "top",
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  btnPrimary: {
    backgroundColor: "#2563EB",
  },
  visitorItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
});
