// @ts-nocheck
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  Alert,
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
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
};

function StatusChip({ status }: any) {
  const theme = useColorScheme() ?? "light";
  const statusConfig: any = {
    PENDING: {
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
    APPROVED: {
      bg: theme === "dark" ? "#052e1f" : "#ecfdf5",
      clr: theme === "dark" ? "#34d399" : "#065f46",
      br: theme === "dark" ? "#1f2937" : "#a7f3d0",
      icon: (
        <Feather
          name="check-circle"
          size={12}
          color={theme === "dark" ? "#34d399" : "#065f46"}
        />
      ),
    },
    REJECTED: {
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
    CHECKED_IN: {
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
    CHECKED_OUT: {
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

  const config = statusConfig[status] || statusConfig.PENDING;

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
        {STATUS_LABEL[status] || status}
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

export default function KidPasses() {
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

  const isSmallScreen = screenWidth < 375;
  const containerPadding = isSmallScreen ? 12 : 16;
  const cardPadding = isSmallScreen ? 12 : 16;
  const inputFontSize = isSmallScreen ? 14 : 16;
  const inputPaddingH = isSmallScreen ? 12 : 16;
  const inputPaddingV = isSmallScreen ? 10 : 14;

  const backendUrl = config.backendUrl;

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

  const [kidPasses, setKidPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [parentName, setParentName] = useState("");
  const [contact, setContact] = useState("");
  const [permissions, setPermissions] = useState("");
  const today = isoNowLocalDate();
  const oneWeekLater = addDays(today, 7);
  const [validFrom, setValidFrom] = useState(today);
  const [validTo, setValidTo] = useState(oneWeekLater);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createExpanded, setCreateExpanded] = useState(false);

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
      const res = await axios.get(
        `${backendUrl}/resident/kid-passes?userId=${user.id}&communityId=${user.communityId}`,
        {
          headers: authHeaders,
        },
      );
      setKidPasses(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setKidPasses([]);
      showToast("Error loading kid passes", "error");
    } finally {
      setLoading(false);
    }
  }, [backendUrl, user?.id, user?.communityId, authHeaders, showToast]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const createKidPass = useCallback(async () => {
    if (!childName.trim()) {
      showToast("Child name is required", "error");
      return;
    }
    if (!parentName.trim()) {
      showToast("Parent name is required", "error");
      return;
    }
    if (!contact.trim()) {
      showToast("Contact is required", "error");
      return;
    }
    if (!validFrom || !validTo) {
      showToast("Valid dates are required", "error");
      return;
    }
    if (!user?.communityId || !user?.id) {
      showToast("User information missing. Please log in again", "error");
      return;
    }

    try {
      setSubmitting(true);
      const [fromYear, fromMonth, fromDay] = validFrom.split("-").map(Number);
      const [toYear, toMonth, toDay] = validTo.split("-").map(Number);
      const fromDate = new Date(
        fromYear,
        fromMonth - 1,
        fromDay,
        0,
        0,
        0,
      ).toISOString();
      const toDate = new Date(
        toYear,
        toMonth - 1,
        toDay,
        23,
        59,
        59,
      ).toISOString();

      const requestData = {
        childName: childName.trim(),
        childAge: childAge.trim() ? parseInt(childAge) : null,
        parentName: parentName.trim(),
        contact: contact.trim(),
        permissions: permissions.trim() || "Standard access",
        validFrom: fromDate,
        validTo: toDate,
        communityId: user.communityId,
        userId: user.id,
      };

      const response = await axios.post(
        `${backendUrl}/resident/kid-passes`,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        },
      );

      setChildName("");
      setChildAge("");
      setParentName("");
      setContact("");
      setPermissions("");
      setValidFrom(today);
      setValidTo(oneWeekLater);
      setCreateExpanded(false);
      showToast("Kid pass created successfully!", "success");
      load();
    } catch (error: any) {
      let errorMessage = "Error creating kid pass. Please try again.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  }, [
    childName,
    parentName,
    contact,
    validFrom,
    validTo,
    childAge,
    permissions,
    user,
    backendUrl,
    authHeaders,
    showToast,
    load,
    today,
    oneWeekLater,
  ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={{ flex: 1, backgroundColor: bg }}>
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
                <Text style={[styles.title, { color: text }]}>Kid Passes</Text>
                <Text style={[styles.subtitle, { color: icon }]}>
                  Manage child exit permissions
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
          {/* Create Kid Pass */}
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
            <TouchableOpacity
              onPress={() => setCreateExpanded(!createExpanded)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: createExpanded ? 12 : 0,
              }}
            >
              <Text
                style={[
                  styles.cardTitle,
                  { color: text, fontSize: isSmallScreen ? 16 : 18 },
                ]}
              >
                Create Kid Pass
              </Text>
              <Feather
                name={createExpanded ? "chevron-up" : "chevron-down"}
                size={24}
                color={tint}
              />
            </TouchableOpacity>

            {createExpanded && (
              <View style={{ gap: isSmallScreen ? 8 : 10 }}>
                <TextInput
                  placeholder="Child Name"
                  placeholderTextColor={icon as any}
                  value={childName}
                  onChangeText={setChildName}
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

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    placeholder="Age (optional)"
                    placeholderTextColor={icon as any}
                    value={childAge}
                    onChangeText={setChildAge}
                    keyboardType="number-pad"
                    style={[
                      styles.input,
                      {
                        flex: 0.3,
                        color: text,
                        borderColor: border,
                        backgroundColor:
                          theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                        minHeight: isSmallScreen ? 44 : 48,
                        fontSize: inputFontSize,
                        paddingHorizontal: inputPaddingH,
                        paddingVertical: inputPaddingV,
                      },
                    ]}
                  />
                  <TextInput
                    placeholder="Parent Name"
                    placeholderTextColor={icon as any}
                    value={parentName}
                    onChangeText={setParentName}
                    style={[
                      styles.input,
                      {
                        flex: 0.7,
                        color: text,
                        borderColor: border,
                        backgroundColor:
                          theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                        minHeight: isSmallScreen ? 44 : 48,
                        fontSize: inputFontSize,
                        paddingHorizontal: inputPaddingH,
                        paddingVertical: inputPaddingV,
                      },
                    ]}
                  />
                </View>

                <TextInput
                  placeholder="Contact (phone/email)"
                  placeholderTextColor={icon as any}
                  value={contact}
                  onChangeText={setContact}
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

                <TextInput
                  placeholder="Permissions (e.g., Can go to school, playground, etc.)"
                  placeholderTextColor={icon as any}
                  value={permissions}
                  onChangeText={setPermissions}
                  multiline
                  style={[
                    styles.input,
                    {
                      color: text,
                      borderColor: border,
                      backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                      minHeight: 80,
                      fontSize: inputFontSize,
                      paddingHorizontal: inputPaddingH,
                      paddingVertical: inputPaddingV,
                      textAlignVertical: "top",
                    },
                  ]}
                />

                {/* Date Range */}
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
                    Valid Period
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: icon as any,
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        From
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowFromPicker(true)}
                        style={[
                          styles.input,
                          {
                            borderColor: border,
                            backgroundColor:
                              theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            minHeight: isSmallScreen ? 44 : 48,
                            paddingHorizontal: inputPaddingH,
                            paddingVertical: inputPaddingV,
                          },
                        ]}
                      >
                        <Text style={{ color: text, fontSize: inputFontSize }}>
                          {new Date(validFrom).toLocaleDateString()}
                        </Text>
                        <Feather
                          name="calendar"
                          size={16}
                          color={icon as any}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: icon as any,
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        To
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowToPicker(true)}
                        style={[
                          styles.input,
                          {
                            borderColor: border,
                            backgroundColor:
                              theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            minHeight: isSmallScreen ? 44 : 48,
                            paddingHorizontal: inputPaddingH,
                            paddingVertical: inputPaddingV,
                          },
                        ]}
                      >
                        <Text style={{ color: text, fontSize: inputFontSize }}>
                          {new Date(validTo).toLocaleDateString()}
                        </Text>
                        <Feather
                          name="calendar"
                          size={16}
                          color={icon as any}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={createKidPass}
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
                    name="plus-circle"
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
                    {submitting ? "Creating..." : "Create Pass"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Kid Passes List */}
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
                marginBottom: 8,
              }}
            >
              <Text
                style={[
                  styles.cardTitle,
                  { color: text, fontSize: isSmallScreen ? 16 : 18 },
                ]}
              >
                My Passes
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

            {loading ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator size="large" color={icon as any} />
              </View>
            ) : kidPasses.length === 0 ? (
              <Text
                style={{
                  color: icon as any,
                  textAlign: "center",
                  paddingVertical: 20,
                  fontSize: isSmallScreen ? 13 : 14,
                }}
              >
                No kid passes created yet.
              </Text>
            ) : (
              <View style={{ gap: isSmallScreen ? 10 : 12 }}>
                {kidPasses.map((pass) => (
                  <View
                    key={pass.id}
                    style={[
                      styles.passCard,
                      {
                        borderColor: border,
                        padding: isSmallScreen ? 12 : 16,
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: text,
                          fontWeight: "700",
                          fontSize: isSmallScreen ? 14 : 16,
                        }}
                      >
                        {pass.childName}
                      </Text>
                      <StatusChip status={pass.status} />
                    </View>

                    <View
                      style={{
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Feather name="user" size={12} color={icon as any} />
                        <Text
                          style={{
                            color: icon as any,
                            fontSize: isSmallScreen ? 11 : 13,
                            flex: 1,
                          }}
                        >
                          Parent: {pass.parentName}
                        </Text>
                      </View>

                      {pass.childAge && (
                        <View style={{ flexDirection: "row", gap: 8 }}>
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
                            Age: {pass.childAge}
                          </Text>
                        </View>
                      )}

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Feather name="phone" size={12} color={icon as any} />
                        <Text
                          style={{
                            color: icon as any,
                            fontSize: isSmallScreen ? 11 : 13,
                          }}
                          numberOfLines={1}
                        >
                          {pass.contact}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Feather name="lock" size={12} color={icon as any} />
                        <Text
                          style={{
                            color: icon as any,
                            fontSize: isSmallScreen ? 11 : 13,
                            flex: 1,
                          }}
                          numberOfLines={2}
                        >
                          {pass.permissions}
                        </Text>
                      </View>

                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 4 }}
                      >
                        <Feather name="clock" size={12} color={icon as any} />
                        <Text
                          style={{
                            color: icon as any,
                            fontSize: isSmallScreen ? 10 : 12,
                          }}
                        >
                          {new Date(pass.validFrom).toLocaleDateString()} -{" "}
                          {new Date(pass.validTo).toLocaleDateString()}
                        </Text>
                      </View>
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
            value={new Date(validFrom)}
            mode="date"
            minimumDate={new Date()}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowFromPicker(false);
              if (selectedDate) {
                const pad = (n: number) => String(n).padStart(2, "0");
                const formattedDate = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
                setValidFrom(formattedDate);
              }
            }}
          />
        )}

        {showToPicker && (
          <DateTimePicker
            value={new Date(validTo)}
            mode="date"
            minimumDate={new Date(validFrom)}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowToPicker(false);
              if (selectedDate) {
                const pad = (n: number) => String(n).padStart(2, "0");
                const formattedDate = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
                setValidTo(formattedDate);
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
  },
  label: {
    fontWeight: "700",
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
  passCard: {
    borderWidth: 1,
    borderRadius: 16,
  },
});
