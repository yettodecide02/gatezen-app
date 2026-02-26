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
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";

const STATUS_LABEL: any = {
  submitted: "Submitted",
  in_progress: "In Progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
  closed: "Closed",
};

function StatusChip({ status }: any) {
  const key = (status || "submitted").toLowerCase();
  const map: any = {
    submitted: {
      bg: "#fffbeb",
      clr: "#92400e",
      br: "#fde68a",
      icon: <Feather name="clock" size={14} color="#92400e" />,
    },
    in_progress: {
      bg: "#eff6ff",
      clr: "#1e40af",
      br: "#bfdbfe",
      icon: <Feather name="alert-circle" size={14} color="#1e40af" />,
    },
    resolved: {
      bg: "#ecfdf5",
      clr: "#065f46",
      br: "#a7f3d0",
      icon: <Feather name="check-circle" size={14} color="#065f46" />,
    },
    cancelled: {
      bg: "#fef2f2",
      clr: "#991b1b",
      br: "#fecaca",
      icon: <Feather name="x-circle" size={14} color="#991b1b" />,
    },
    closed: {
      bg: "#f3f4f6",
      clr: "#374151",
      br: "#d1d5db",
      icon: <Feather name="check-square" size={14} color="#374151" />,
    },
  };
  const s = map[key] || map.submitted;
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
      <Text style={{ color: s.clr, fontWeight: "700", fontSize: 12 }}>
        {STATUS_LABEL[key] || status}
      </Text>
    </View>
  );
}

export default function MaintenanceScreen() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const tint = useThemeColor({}, "tint");
  const muted = useThemeColor({}, "icon");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  // Get screen dimensions
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

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
        setUserState(u || { id: "u1", name: "Admin", communityId: "c1" });
      } catch {
        setUserState({ id: "u1", name: "Admin", communityId: "c1" });
      }
    })();
  }, []);

  // Data
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // New ticket
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [desc, setDesc] = useState("");

  // Category picker
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const categoryOptions = [
    "General",
    "Electrical",
    "Plumbing",
    "Carpentry",
    "Cleaning",
    "Security",
  ];

  // New Request Collapse
  const [newRequestExpanded, setNewRequestExpanded] = useState(false);

  // Comments
  const [message, setMessage] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showListener = require("react-native").Keyboard.addListener(
      "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hideListener = require("react-native").Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const scrollToCommentInput = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Toast
  const toastTimer = useRef<any>();
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  const load = useCallback(async () => {
    if (!user?.id || !user?.communityId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/resident/maintenance`, {
        params: { userId: user.id, communityId: user.communityId },
        headers: authHeaders,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setTickets(list);
      setSelected(
        (prev) =>
          (prev ? list.find((t: any) => t.id === prev.id) : list[0]) || null,
      );
    } catch (e) {
      console.warn("Failed to load maintenance tickets", e);
      setTickets([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, user?.id, user?.communityId, authHeaders]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const submitTicket = useCallback(async () => {
    if (!title.trim()) return;
    if (!user?.id || !user?.communityId) return;
    setSubmittingTicket(true);
    try {
      const payload = {
        userId: user.id,
        communityId: user.communityId,
        title: title.trim(),
        category: category.trim() || "General",
        description: desc.trim(),
      };
      const res = await axios.post(
        `${backendUrl}/resident/maintenance`,
        payload,
        {
          headers: authHeaders,
        },
      );
      const t = res.data;
      setTitle("");
      setCategory("General");
      setDesc("");
      setTickets((prev) => [t, ...prev]);
      setSelected(t);
      showToast("Ticket created");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.error || "Failed to submit");
    } finally {
      setSubmittingTicket(false);
    }
  }, [
    backendUrl,
    authHeaders,
    user?.id,
    user?.communityId,
    title,
    category,
    desc,
    showToast,
  ]);

  const addComment = useCallback(async () => {
    if (!selected || !message.trim()) return;
    try {
      const res = await axios.post(
        `${backendUrl}/resident/maintenance/${selected.id}/comments`,
        { userId: user?.id, name: user?.name, text: message.trim() },
        { headers: authHeaders },
      );
      const c = res.data;
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? { ...t, comments: [...(t.comments || []), c] }
            : t,
        ),
      );
      setSelected((s: any) => ({
        ...s,
        comments: [...(s?.comments || []), c],
      }));
      setMessage("");
    } catch (e) {
      Alert.alert("Error", "Failed to add comment");
    }
  }, [backendUrl, authHeaders, selected, user?.id, user?.name, message]);

  // Responsive values
  const isSmallScreen = dimensions.width < 380;
  const padding = isSmallScreen ? 12 : 16;
  const cardPadding = isSmallScreen ? 12 : 14;
  const fontSize = isSmallScreen ? 16 : 18;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
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
                <Text style={[styles.title, { color: text }]}>Maintenance</Text>
                <Text style={[styles.subtitle, { color: muted }]}>
                  Submit and track requests
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Toast */}
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
              maxWidth: dimensions.width - 32,
            }}
          >
            <Text style={{ color: "#fff" }}>{toast}</Text>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={{
            padding: padding,
            gap: padding,
            paddingBottom: keyboardVisible ? 400 : padding,
          }}
          showsVerticalScrollIndicator={false}
          ref={scrollViewRef}
          keyboardShouldPersistTaps="handled"
        >
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
              onPress={() => setNewRequestExpanded(!newRequestExpanded)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={[styles.cardTitle, { color: text }]}>
                New Request
              </Text>
              <Feather
                name={newRequestExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={icon as any}
              />
            </TouchableOpacity>
            {newRequestExpanded && (
              <View style={{ gap: 10 }}>
                <TextInput
                  placeholder="Title (e.g., Leaking tap)"
                  placeholderTextColor={icon as any}
                  value={title}
                  onChangeText={setTitle}
                  style={[
                    styles.input,
                    {
                      color: text,
                      borderColor: border,
                      backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                    },
                  ]}
                />

                {/* Category Picker Button */}
                <TouchableOpacity
                  onPress={() => setCategoryPickerOpen(true)}
                  style={[
                    styles.input,
                    {
                      borderColor: border,
                      backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    },
                  ]}
                  activeOpacity={0.7}
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
                        category === "Electrical"
                          ? "zap"
                          : category === "Plumbing"
                            ? "droplet"
                            : category === "Carpentry"
                              ? "tool"
                              : category === "Cleaning"
                                ? "refresh-cw"
                                : category === "Security"
                                  ? "shield"
                                  : "settings"
                      }
                      size={16}
                      color={icon as any}
                    />
                    <Text
                      style={{
                        color: text,
                        fontSize: 16,
                        flex: 1,
                      }}
                    >
                      {category}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={16} color={icon as any} />
                </TouchableOpacity>

                <TextInput
                  placeholder="Describe the issue in detail…"
                  placeholderTextColor={icon as any}
                  value={desc}
                  onChangeText={setDesc}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[
                    styles.textarea,
                    {
                      color: text,
                      borderColor: border,
                      backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                    },
                  ]}
                />

                <View
                  style={{
                    flexDirection: isSmallScreen ? "column" : "row",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={submitTicket}
                    disabled={submittingTicket}
                    style={[
                      styles.btn,
                      styles.btnPrimary,
                      {
                        flex: isSmallScreen ? undefined : 1,
                        opacity: submittingTicket ? 0.7 : 1,
                      },
                    ]}
                  >
                    {submittingTicket ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="plus" size={16} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
                          Submit Request
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* My Tickets */}
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
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Text style={[styles.cardTitle, { color: text }]}>
                My Tickets
              </Text>
              <TouchableOpacity
                onPress={load}
                style={[
                  styles.btn,
                  styles.btnOutline,
                  {
                    borderColor: border,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <>
                    <Feather name="refresh-cw" size={16} color={icon as any} />
                    <Text
                      style={{
                        color: icon as any,
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      Refresh
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator />
              </View>
            ) : tickets.length === 0 ? (
              <Text style={{ color: icon as any }}>No requests yet.</Text>
            ) : (
              <ScrollView
                style={{ maxHeight: 380 }}
                scrollEnabled={tickets.length > 5}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                <View style={{ gap: 8 }}>
                  {tickets.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setSelected(t)}
                      style={[
                        styles.listItem,
                        {
                          borderColor:
                            selected?.id === t.id ? "#c7d2fe" : border,
                          backgroundColor:
                            selected?.id === t.id
                              ? theme === "dark"
                                ? "#0b1220"
                                : "#eef2ff"
                              : "transparent",
                          flexDirection: isSmallScreen ? "column" : "row",
                          alignItems: isSmallScreen ? "flex-start" : "center",
                          gap: isSmallScreen ? 8 : 10,
                        },
                      ]}
                    >
                      <View
                        style={{
                          flex: 1,
                          minWidth: isSmallScreen ? "100%" : 0,
                        }}
                      >
                        <Text
                          style={{
                            color: text,
                            fontWeight: "700",
                            fontSize: isSmallScreen ? 14 : 15,
                          }}
                        >
                          {t.title}
                        </Text>
                        <Text
                          style={{
                            color: icon as any,
                            fontSize: isSmallScreen ? 12 : 13,
                          }}
                        >
                          {t.category} •{" "}
                          {new Date(
                            t.createdAt || t.created_at || Date.now(),
                          ).toLocaleDateString()}
                        </Text>
                      </View>
                      <StatusChip
                        status={(t.status || "submitted").toLowerCase()}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Details */}
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
            {!selected ? (
              <Text style={{ color: icon as any }}>
                Select a ticket to view details.
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    flexDirection: isSmallScreen ? "column" : "row",
                    alignItems: isSmallScreen ? "flex-start" : "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: text }]}>
                      {selected.title}
                    </Text>
                    <Text
                      style={{
                        color: icon as any,
                        fontSize: isSmallScreen ? 12 : 13,
                      }}
                    >
                      {selected.category} • Opened{" "}
                      {new Date(
                        selected.createdAt || selected.created_at || Date.now(),
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                  <StatusChip
                    status={(selected.status || "submitted").toLowerCase()}
                  />
                </View>

                <View>
                  <Text
                    style={{ color: text, fontWeight: "700", marginBottom: 6 }}
                  >
                    Description
                  </Text>
                  <Text style={{ color: icon as any, fontSize: 14 }}>
                    {selected.description || "—"}
                  </Text>
                </View>
                <View>
                  <Text
                    style={{ color: text, fontWeight: "700", marginBottom: 6 }}
                  >
                    Comments
                  </Text>
                  <View style={{ gap: 8 }}>
                    {(selected.comments || []).map((c: any) => {
                      const mine = c.userId === user?.id;
                      return (
                        <View
                          key={c.id}
                          style={{
                            alignSelf: mine ? "flex-end" : "flex-start",
                            maxWidth: "90%",
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: mine
                              ? "#2563EB"
                              : theme === "dark"
                                ? "#0B0B0B"
                                : "#F3F4F6",
                          }}
                        >
                          {!mine ? (
                            <Text
                              style={{
                                color: theme === "dark" ? "#ddd" : "#111",
                                fontWeight: "700",
                                fontSize: 14,
                              }}
                            >
                              {c.user.role || "User"}
                            </Text>
                          ) : null}
                          <Text
                            style={{
                              color: mine ? "#fff" : text,
                              fontSize: 14,
                            }}
                          >
                            {c.text}
                          </Text>
                          <Text
                            style={{
                              color: mine ? "#e5e7eb" : (icon as any),
                              fontSize: 11,
                              marginTop: 4,
                            }}
                          >
                            {new Date(
                              c.at || c.createdAt || Date.now(),
                            ).toLocaleTimeString()}
                          </Text>
                        </View>
                      );
                    })}
                    {(selected.comments || []).length === 0 ? (
                      <Text style={{ color: icon as any, fontSize: 14 }}>
                        No messages yet.
                      </Text>
                    ) : null}

                    <View
                      style={{
                        flexDirection: isSmallScreen ? "column" : "row",
                        gap: 8,
                      }}
                    >
                      <TextInput
                        ref={commentInputRef}
                        placeholder="Write a message…"
                        placeholderTextColor={icon as any}
                        value={message}
                        onChangeText={setMessage}
                        onSubmitEditing={addComment}
                        onFocus={scrollToCommentInput}
                        style={[
                          styles.input,
                          {
                            flex: 1,
                            color: text,
                            borderColor: border,
                            backgroundColor:
                              theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                          },
                        ]}
                      />
                      <TouchableOpacity
                        onPress={addComment}
                        style={[
                          styles.btn,
                          styles.btnOutline,
                          { borderColor: border },
                        ]}
                      >
                        <Feather name="send" size={16} color={icon as any} />
                        <Text
                          style={{
                            color: icon as any,
                            fontWeight: "700",
                            fontSize: 14,
                          }}
                        >
                          Send
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text
                      style={{
                        color: icon as any,
                        fontSize: 12,
                        lineHeight: 16,
                      }}
                    >
                      You can also attach images above; they'll be stored inline
                      as data URLs.
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Category Picker Modal */}
        <Modal
          visible={categoryPickerOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setCategoryPickerOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setCategoryPickerOpen(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.modalCard,
                {
                  backgroundColor: card,
                  borderColor: border,
                  width: dimensions.width - 40,
                  maxWidth: 400,
                  maxHeight: dimensions.height * 0.7,
                },
              ]}
            >
              <Text
                style={[styles.cardTitle, { color: text, marginBottom: 16 }]}
              >
                Select Category
              </Text>
              <ScrollView
                style={{ flexGrow: 0 }}
                showsVerticalScrollIndicator={false}
              >
                {categoryOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      setCategory(option);
                      setCategoryPickerOpen(false);
                    }}
                    style={[
                      styles.categoryOption,
                      {
                        borderColor: border,
                        backgroundColor:
                          category === option
                            ? theme === "dark"
                              ? "#1a1a2e"
                              : "#f0f4ff"
                            : "transparent",
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
                          option === "Electrical"
                            ? "zap"
                            : option === "Plumbing"
                              ? "droplet"
                              : option === "Carpentry"
                                ? "tool"
                                : option === "Cleaning"
                                  ? "refresh-cw"
                                  : option === "Security"
                                    ? "shield"
                                    : "settings"
                        }
                        size={18}
                        color={
                          category === option
                            ? theme === "dark"
                              ? "#60a5fa"
                              : "#2563eb"
                            : (icon as any)
                        }
                      />
                      <Text
                        style={{
                          color:
                            category === option
                              ? theme === "dark"
                                ? "#60a5fa"
                                : "#2563eb"
                              : text,
                          fontWeight: category === option ? "700" : "400",
                          fontSize: 16,
                        }}
                      >
                        {option}
                      </Text>
                    </View>
                    {category === option && (
                      <Feather
                        name="check"
                        size={18}
                        color={theme === "dark" ? "#60a5fa" : "#2563eb"}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                onPress={() => setCategoryPickerOpen(false)}
                style={[
                  styles.btn,
                  styles.btnOutline,
                  {
                    marginTop: 16,
                    borderColor: border,
                    justifyContent: "center",
                  },
                ]}
              >
                <Text style={{ color: icon as any, fontWeight: "700" }}>
                  Close
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
    borderRadius: 12,
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
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    fontSize: 16,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btnPrimary: { backgroundColor: "#2563EB" },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1 },
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
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryOption: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
