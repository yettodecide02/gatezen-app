// @ts-nocheck
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";
import Toast from "@/components/Toast";
import { config } from "@/lib/config";

const STATUS_LABEL: any = {
  pending: "Pending",
  cancelled: "Cancelled",
  checked_in: "Checked In",
  checked_out: "Checked Out",
};

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

function addDays(dateStr: string, days: number) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function Passes() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const tint = useThemeColor({}, "tint");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  // Screen dimensions
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width,
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Responsive sizes
  const isSmallScreen = screenWidth < 375;
  const containerPadding = isSmallScreen ? 12 : 16;
  const cardPadding = isSmallScreen ? 12 : 16;

  // Backend
  const backendUrl = config.backendUrl;

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

  // Date filters - default to past 30 days
  const today = isoNowLocalDate();
  const thirtyDaysAgo = addDays(today, -30);
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

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
      if (from) {
        const [fy, fm, fd] = from.split("-").map(Number);
        params.set("from", new Date(fy, fm - 1, fd, 0, 0, 0, 0).toISOString());
      }
      if (to) {
        const [ty, tm, td] = to.split("-").map(Number);
        params.set(
          "to",
          new Date(ty, tm - 1, td, 23, 59, 59, 999).toISOString(),
        );
      }
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
      showToast("Error loading visitor passes", "error");
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
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
                <Text style={[styles.title, { color: text }]}>My Passes</Text>
                <Text style={[styles.subtitle, { color: icon }]}>
                  Past visitor records
                </Text>
              </View>
            </View>
          </View>
        </View>

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
            paddingTop: 8,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Visitor Passes */}
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
                All Passes
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
                No visitor passes in this range.
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
                        <TypeChip type={visitor.visitorType} />
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Feather
                            name="calendar"
                            size={12}
                            color={icon as any}
                          />
                          <Text
                            style={{
                              color: icon as any,
                              fontSize: isSmallScreen ? 11 : 13,
                            }}
                          >
                            {new Date(visitor.visitDate).toLocaleDateString()}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Feather name="clock" size={12} color={icon as any} />
                          <Text
                            style={{
                              color: icon as any,
                              fontSize: isSmallScreen ? 11 : 13,
                            }}
                          >
                            {new Date(visitor.visitDate).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </Text>
                        </View>
                      </View>
                      {visitor.contact && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Feather name="mail" size={12} color={icon as any} />
                          <Text
                            style={{
                              color: icon as any,
                              fontSize: isSmallScreen ? 11 : 13,
                            }}
                            numberOfLines={1}
                          >
                            {visitor.contact}
                          </Text>
                        </View>
                      )}
                      {visitor.vehicleNo && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          <Feather name="truck" size={12} color={icon as any} />
                          <Text
                            style={{
                              color: icon as any,
                              fontSize: isSmallScreen ? 11 : 13,
                            }}
                          >
                            {visitor.vehicleNo}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View
                      style={{
                        alignItems: "flex-end",
                        justifyContent: "flex-start",
                      }}
                    >
                      <StatusChip status={visitor.status} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Date Pickers */}
        {showFromPicker && (
          <DateTimePicker
            value={new Date(from)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowFromPicker(false);
              if (selectedDate) {
                const pad = (n: number) => String(n).padStart(2, "0");
                const formattedDate = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
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
                const pad = (n: number) => String(n).padStart(2, "0");
                const formattedDate = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
                setTo(formattedDate);
              }
            }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
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
  filterLabel: {
    fontWeight: "600",
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
  },
  visitorItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
});
