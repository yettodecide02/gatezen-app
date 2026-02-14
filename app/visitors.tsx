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
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  Vibration,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import axios from "axios";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";
import Toast from "@/components/Toast";

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
  const theme = useColorScheme() ?? "light";
  const key = (status || "pending").toLowerCase();
  const statusConfig: any = {
    pending: {
      bg: theme === "dark" ? "#1e1b3a" : "#fffbeb",
      clr: theme === "dark" ? "#fbbf24" : "#92400e",
      br: theme === "dark" ? "#1f2937" : "#fde68a",
      icon: (
        <Feather
          name="clock"
          size={12}
          color={theme === "dark" ? "#fbbf24" : "#92400e"}
        />
      ),
    },
    cancelled: {
      bg: theme === "dark" ? "#2a0b0b" : "#fef2f2",
      clr: theme === "dark" ? "#fca5a5" : "#991b1b",
      br: theme === "dark" ? "#1f2937" : "#fecaca",
      icon: (
        <Feather
          name="x-circle"
          size={12}
          color={theme === "dark" ? "#fca5a5" : "#991b1b"}
        />
      ),
    },
    checked_in: {
      bg: theme === "dark" ? "#052e1f" : "#ecfdf5",
      clr: theme === "dark" ? "#34d399" : "#065f46",
      br: theme === "dark" ? "#1f2937" : "#a7f3d0",
      icon: (
        <Feather
          name="log-in"
          size={12}
          color={theme === "dark" ? "#34d399" : "#065f46"}
        />
      ),
    },
    checked_out: {
      bg: theme === "dark" ? "#1f1f1f" : "#f3f4f6",
      clr: theme === "dark" ? "#9ca3af" : "#374151",
      br: theme === "dark" ? "#1f2937" : "#d1d5db",
      icon: (
        <Feather
          name="log-out"
          size={12}
          color={theme === "dark" ? "#9ca3af" : "#374151"}
        />
      ),
    },
  };

  const config = statusConfig[key] || statusConfig.pending;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: config.bg,
        borderColor: config.br,
      }}
    >
      {config.icon}
      <Text style={{ color: config.clr, fontWeight: "700", fontSize: 11 }}>
        {STATUS_LABEL[key] || status}
      </Text>
    </View>
  );
}

function TypeChip({ type }: any) {
  const theme = useColorScheme() ?? "light";
  const displayType =
    type
      ?.replace("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Guest";

  const typeConfig: any = {
    Guest: { icon: "user", color: theme === "dark" ? "#60a5fa" : "#2563eb" },
    Delivery: {
      icon: "package",
      color: theme === "dark" ? "#f59e0b" : "#d97706",
    },
    "Cab/Auto": {
      icon: "truck",
      color: theme === "dark" ? "#10b981" : "#059669",
    },
  };

  const config = typeConfig[displayType] || typeConfig["Guest"];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: theme === "dark" ? "#1a1a2e" : "#EFF6FF",
        borderWidth: 1,
        borderColor: theme === "dark" ? "#2d2d50" : "#BFDBFE",
      }}
    >
      <Feather name={config.icon} size={9} color={config.color} />
      <Text style={{ color: config.color, fontSize: 10, fontWeight: "600" }}>
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

  // Screen dimensions
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width,
  );
  const [screenHeight, setScreenHeight] = useState(
    Dimensions.get("window").height,
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
      setScreenHeight(window.height);
    });
    return () => subscription?.remove();
  }, []);

  // Responsive sizes
  const isSmallScreen = screenWidth < 375;
  const headerIconSize = isSmallScreen ? 16 : 18;
  const headerFontSize = isSmallScreen ? 18 : 20;
  const inputFontSize = isSmallScreen ? 14 : 16;
  const inputPaddingH = isSmallScreen ? 12 : 16;
  const inputPaddingV = isSmallScreen ? 10 : 14;
  const cardPadding = isSmallScreen ? 12 : 16;
  const containerPadding = isSmallScreen ? 12 : 16;

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
  const [vehicle, setVehicle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Visitor type picker modal
  const [visitorTypePickerOpen, setVisitorTypePickerOpen] = useState(false);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success">("error");

  const showToast = useCallback(
    (message: string, type: "error" | "success" = "error") => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
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
        },
      );
      const list = Array.isArray(res.data) ? res.data : [];
      setVisitors(list);
    } catch (e) {
      setVisitors([]);
      showToast("Error loading visitors", "error");
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
    if (!name.trim()) {
      showToast("Visitor name is required", "error");
      return;
    }
    if (type === "GUEST" && !email.trim()) {
      showToast("Email is required for guest visitors", "error");
      return;
    }

    if (type === "GUEST" && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        showToast("Please enter a valid email address", "error");
        return;
      }
    }
    if (!expectedDate || !expectedTime) {
      showToast("Expected date and time are required", "error");
      return;
    }
    if (!user?.communityId || !user?.id) {
      showToast("User information missing. Please log in again", "error");
      return;
    }

    try {
      setSubmitting(true);
      const localDateTime = `${expectedDate}T${expectedTime}:00`;
      const expectedAt = new Date(localDateTime).toISOString();

      const requestData = {
        name: name.trim(),
        contact: email.trim() || null,
        visitorType: type || "GUEST",
        visitDate: expectedAt,
        vehicleNo: vehicle?.trim() || null,
        communityId: user.communityId,
        userId: user.id,
      };

      const cleanedRequestData = Object.fromEntries(
        Object.entries(requestData).filter(
          ([_, value]) => value !== null && value !== "",
        ),
      );

      if (!cleanedRequestData.contact && type === "GUEST") {
        cleanedRequestData.contact = null;
      }

      const response = await axios.post(
        `${backendUrl}/resident/visitor-creation`,
        cleanedRequestData,
        {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        },
      );

      setName("");
      setEmail("");
      setType("GUEST");
      setExpectedDate(isoNowLocalDate());
      setExpectedTime(isoNowLocalTime());
      setVehicle("");
      showToast("Pre-authorization submitted successfully!", "success");
      load();
    } catch (error: any) {
      let errorMessage = "Error creating visitor. Please try again.";

      if (error.response?.data) {
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.details) {
          errorMessage = error.response.data.details;
        } else {
          errorMessage = `Server error: ${JSON.stringify(error.response.data)}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      showToast(errorMessage, "error");
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
    vehicle,
    showToast,
    load,
  ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View
        style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top + 8 }}
      >
        <Toast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          onHide={hideToast}
        />

        <ScrollView
          contentContainerStyle={{
            padding: containerPadding,
            gap: isSmallScreen ? 14 : 18,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: isSmallScreen ? 8 : 12,
            }}
          >
            <View
              style={{
                height: isSmallScreen ? 28 : 32,
                width: isSmallScreen ? 28 : 32,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: border,
                backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
              }}
            >
              <Feather name="users" size={headerIconSize} color={icon as any} />
            </View>
            <Text
              style={{
                color: text,
                fontSize: headerFontSize,
                fontWeight: "800",
                flex: 1,
                flexWrap: "wrap",
              }}
              numberOfLines={2}
            >
              Visitor & Access Management
            </Text>
          </View>

          {/* Pre-Authorize Guest */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: card,
                borderColor: border,
                padding: cardPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: text, fontSize: isSmallScreen ? 16 : 18 },
              ]}
            >
              Pre-Authorize Guest
            </Text>
            <View style={{ gap: isSmallScreen ? 8 : 10 }}>
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
                    minHeight: isSmallScreen ? 44 : 48,
                    fontSize: inputFontSize,
                    paddingHorizontal: inputPaddingH,
                    paddingVertical: inputPaddingV,
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
                      minHeight: isSmallScreen ? 44 : 48,
                      paddingHorizontal: inputPaddingH,
                      paddingVertical: inputPaddingV,
                    },
                  ]}
                >
                  <Feather
                    name="mail"
                    size={isSmallScreen ? 14 : 16}
                    color={icon as any}
                  />
                  <TextInput
                    placeholder={
                      type === "GUEST"
                        ? "visitor@example.com (required)"
                        : "visitor@example.com (optional)"
                    }
                    placeholderTextColor={icon as any}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    style={{
                      flex: 1,
                      color: text,
                      fontSize: inputFontSize,
                    }}
                  />
                </View>
              </View>

              {/* Visitor Type Selector */}
              <View>
                <Text
                  style={[
                    styles.label,
                    {
                      color: text,
                      marginBottom: 8,
                      fontSize: isSmallScreen ? 13 : 14,
                    },
                  ]}
                >
                  Visitor Type
                </Text>
                <TouchableOpacity
                  onPress={() => setVisitorTypePickerOpen(true)}
                  style={[
                    styles.input,
                    {
                      borderColor: border,
                      backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      minHeight: isSmallScreen ? 44 : 48,
                      paddingHorizontal: inputPaddingH,
                      paddingVertical: inputPaddingV,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      flex: 1,
                    }}
                  >
                    <Feather
                      name={
                        type === "GUEST"
                          ? "user"
                          : type === "DELIVERY"
                            ? "package"
                            : type === "CAB_AUTO"
                              ? "truck"
                              : "user"
                      }
                      size={isSmallScreen ? 14 : 16}
                      color={icon as any}
                    />
                    <Text
                      style={{
                        color: text,
                        fontSize: inputFontSize,
                        flex: 1,
                      }}
                    >
                      {VISITOR_TYPES.find((t) => t.value === type)?.label ||
                        "Guest"}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-down"
                    size={isSmallScreen ? 14 : 16}
                    color={icon as any}
                  />
                </TouchableOpacity>
              </View>

              {/* Date & Time */}
              <View>
                <Text
                  style={[
                    styles.label,
                    {
                      color: text,
                      marginBottom: 8,
                      fontSize: isSmallScreen ? 13 : 14,
                    },
                  ]}
                >
                  Expected Date & Time
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    gap: isSmallScreen ? 8 : 10,
                    marginTop: 6,
                  }}
                >
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
                        backgroundColor:
                          theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                        minHeight: isSmallScreen ? 44 : 48,
                        paddingHorizontal: inputPaddingH,
                        paddingVertical: inputPaddingV,
                      },
                    ]}
                  >
                    <Text
                      style={{ color: text, fontSize: isSmallScreen ? 13 : 16 }}
                      numberOfLines={1}
                    >
                      {new Date(expectedDate).toLocaleDateString()}
                    </Text>
                    <Feather
                      name="calendar"
                      size={isSmallScreen ? 16 : 18}
                      color={icon as any}
                    />
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
                        backgroundColor:
                          theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                        minHeight: isSmallScreen ? 44 : 48,
                        paddingHorizontal: inputPaddingH,
                        paddingVertical: inputPaddingV,
                      },
                    ]}
                  >
                    <Text
                      style={{ color: text, fontSize: isSmallScreen ? 13 : 16 }}
                    >
                      {expectedTime}
                    </Text>
                    <Feather
                      name="clock"
                      size={isSmallScreen ? 16 : 18}
                      color={icon as any}
                    />
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
                      minHeight: isSmallScreen ? 44 : 48,
                      paddingHorizontal: inputPaddingH,
                      paddingVertical: inputPaddingV,
                    },
                  ]}
                >
                  <Feather
                    name="truck"
                    size={isSmallScreen ? 14 : 16}
                    color={icon as any}
                  />
                  <TextInput
                    placeholder="Vehicle (optional, e.g., KA01 AB 1234)"
                    placeholderTextColor={icon as any}
                    value={vehicle}
                    onChangeText={setVehicle}
                    style={{
                      flex: 1,
                      color: text,
                      fontSize: inputFontSize,
                    }}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={preAuthorize}
                disabled={submitting}
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  {
                    opacity: submitting ? 0.6 : 1,
                    minHeight: isSmallScreen ? 46 : 52,
                    justifyContent: "center",
                  },
                ]}
              >
                <Feather
                  name="check-circle"
                  size={isSmallScreen ? 16 : 18}
                  color="#fff"
                />
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: isSmallScreen ? 14 : 16,
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* My Visitors */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: card,
                borderColor: border,
                padding: cardPadding,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={[
                  styles.cardTitle,
                  { color: text, fontSize: isSmallScreen ? 16 : 18 },
                ]}
              >
                Upcoming / Recent
              </Text>
              <TouchableOpacity onPress={load} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={icon as any} />
                ) : (
                  <Feather
                    name="refresh-cw"
                    size={isSmallScreen ? 14 : 16}
                    color={icon as any}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Date Range Filter */}
            <View
              style={{
                flexDirection: "row",
                gap: isSmallScreen ? 6 : 8,
                marginBottom: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.filterLabel,
                    { color: icon as any, fontSize: isSmallScreen ? 11 : 12 },
                  ]}
                >
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
                      paddingHorizontal: isSmallScreen ? 8 : 10,
                      paddingVertical: isSmallScreen ? 6 : 8,
                    },
                  ]}
                >
                  <Text
                    style={{ color: text, fontSize: isSmallScreen ? 12 : 14 }}
                    numberOfLines={1}
                  >
                    {new Date(from).toLocaleDateString()}
                  </Text>
                  <Feather
                    name="calendar"
                    size={isSmallScreen ? 12 : 14}
                    color={icon as any}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.filterLabel,
                    { color: icon as any, fontSize: isSmallScreen ? 11 : 12 },
                  ]}
                >
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
                      paddingHorizontal: isSmallScreen ? 8 : 10,
                      paddingVertical: isSmallScreen ? 6 : 8,
                    },
                  ]}
                >
                  <Text
                    style={{ color: text, fontSize: isSmallScreen ? 12 : 14 }}
                    numberOfLines={1}
                  >
                    {new Date(to).toLocaleDateString()}
                  </Text>
                  <Feather
                    name="calendar"
                    size={isSmallScreen ? 12 : 14}
                    color={icon as any}
                  />
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
                  fontSize: isSmallScreen ? 13 : 14,
                }}
              >
                No visitors in range.
              </Text>
            ) : (
              <View style={{ gap: isSmallScreen ? 10 : 12 }}>
                {visitors.map((visitor) => (
                  <View
                    key={visitor.id}
                    style={[
                      styles.visitorItem,
                      {
                        borderColor: border,
                        backgroundColor: "transparent",
                        padding: isSmallScreen ? 12 : 16,
                        minHeight: isSmallScreen ? 90 : 100,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 4,
                          flexWrap: "wrap",
                        }}
                      >
                        <Text
                          style={{
                            color: text,
                            fontWeight: "700",
                            fontSize: isSmallScreen ? 14 : 16,
                            flexShrink: 1,
                          }}
                          numberOfLines={2}
                        >
                          {visitor.name}
                        </Text>
                        <TypeChip type={visitor.type} />
                      </View>
                      <Text
                        style={{
                          color: icon as any,
                          fontSize: isSmallScreen ? 12 : 14,
                          marginBottom: 2,
                        }}
                        numberOfLines={1}
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
                        <Feather
                          name="calendar"
                          size={isSmallScreen ? 10 : 12}
                          color={icon as any}
                        />
                        <Text
                          style={{
                            color: icon as any,
                            fontSize: isSmallScreen ? 11 : 12,
                          }}
                        >
                          {new Date(visitor.visitDate).toLocaleString()}
                        </Text>
                      </View>
                      {visitor.vehicle && (
                        <Text
                          style={{
                            color: icon as any,
                            fontSize: isSmallScreen ? 11 : 12,
                            marginBottom: 2,
                          }}
                        >
                          Vehicle: {visitor.vehicle}
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
                const hours = selectedTime
                  .getHours()
                  .toString()
                  .padStart(2, "0");
                const minutes = selectedTime
                  .getMinutes()
                  .toString()
                  .padStart(2, "0");
                setExpectedTime(`${hours}:${minutes}`);
              }
            }}
          />
        )}

        {/* Visitor Type Picker Modal */}
        <Modal visible={visitorTypePickerOpen} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: card,
                  borderColor: border,
                  width: screenWidth > 500 ? 400 : screenWidth - 40,
                  maxWidth: "90%",
                  padding: isSmallScreen ? 16 : 20,
                },
              ]}
            >
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: text,
                    marginBottom: 16,
                    fontSize: isSmallScreen ? 16 : 18,
                  },
                ]}
              >
                Select Visitor Type
              </Text>
              <View style={{ gap: isSmallScreen ? 10 : 12 }}>
                {VISITOR_TYPES.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setType(option.value);
                      setVisitorTypePickerOpen(false);
                    }}
                    style={[
                      styles.visitorTypeOption,
                      {
                        borderColor: border,
                        backgroundColor:
                          type === option.value
                            ? theme === "dark"
                              ? "#1a1a2e"
                              : "#f0f4ff"
                            : "transparent",
                        paddingVertical: isSmallScreen ? 12 : 16,
                        paddingHorizontal: isSmallScreen ? 10 : 12,
                        minHeight: isSmallScreen ? 50 : 56,
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Feather
                        name={
                          option.value === "GUEST"
                            ? "user"
                            : option.value === "DELIVERY"
                              ? "package"
                              : option.value === "CAB_AUTO"
                                ? "truck"
                                : "user"
                        }
                        size={isSmallScreen ? 16 : 18}
                        color={
                          type === option.value
                            ? theme === "dark"
                              ? "#60a5fa"
                              : "#2563eb"
                            : (icon as any)
                        }
                      />
                      <Text
                        style={{
                          color:
                            type === option.value
                              ? theme === "dark"
                                ? "#60a5fa"
                                : "#2563eb"
                              : text,
                          fontWeight: type === option.value ? "700" : "400",
                          fontSize: isSmallScreen ? 14 : 16,
                        }}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {type === option.value && (
                      <Feather
                        name="check"
                        size={isSmallScreen ? 16 : 18}
                        color={theme === "dark" ? "#60a5fa" : "#2563eb"}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setVisitorTypePickerOpen(false)}
                style={[
                  styles.btn,
                  styles.btnOutline,
                  {
                    marginTop: 16,
                    borderColor: border,
                    justifyContent: "center",
                    minHeight: isSmallScreen ? 44 : 48,
                  },
                ]}
              >
                <Text
                  style={{
                    color: icon as any,
                    fontWeight: "700",
                    fontSize: isSmallScreen ? 14 : 16,
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontWeight: "800",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
  },
  inputWithIcon: {
    // Container for inputs with icons
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },
  label: {
    fontWeight: "700",
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterLabel: {
    fontWeight: "600",
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  visitorItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  visitorTypeOption: {
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
