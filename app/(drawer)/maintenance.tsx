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
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";

const STATUS_LABEL: any = {
  submitted: "Submitted",
  in_progress: "In Progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
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
      <Text style={{ color: s.clr, fontWeight: "700" }}>
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

  // New ticket
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [desc, setDesc] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]); // list of data URLs or http URLs
  const MAX_IMAGES = 5;

  // Comments
  const [message, setMessage] = useState("");

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
    [token]
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
          (prev ? list.find((t: any) => t.id === prev.id) : list[0]) || null
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

  const pickImage = useCallback(async () => {
    try {
      if (newImages.length >= MAX_IMAGES) {
        Alert.alert("Limit", `You can attach up to ${MAX_IMAGES} images.`);
        return;
      }
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      const mime = a.mimeType || "image/jpeg";
      const b64 = await FileSystem.readAsStringAsync(a.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataUrl = `data:${mime};base64,${b64}`;
      setNewImages((prev) =>
        prev.length < MAX_IMAGES ? [...prev, dataUrl] : prev
      );
    } catch (e) {
      console.warn("Image pick failed", e);
    }
  }, [newImages.length]);

  const removeNewImage = (idx: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitTicket = useCallback(async () => {
    if (!title.trim()) return;
    if (!user?.id || !user?.communityId) return;
    try {
      const payload = {
        userId: user.id,
        communityId: user.communityId,
        title: title.trim(),
        category: category.trim() || "General",
        description: desc.trim(),
        images: newImages, // data URLs or http URLs
      };
      const res = await axios.post(
        `${backendUrl}/resident/maintenance`,
        payload,
        {
          headers: authHeaders,
        }
      );
      const t = res.data;
      setTitle("");
      setCategory("General");
      setDesc("");
      setNewImages([]);
      setTickets((prev) => [t, ...prev]);
      setSelected(t);
      showToast("Ticket created");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.error || "Failed to submit");
    }
  }, [
    backendUrl,
    authHeaders,
    user?.id,
    user?.communityId,
    title,
    category,
    desc,
    newImages,
    showToast,
  ]);

  const addComment = useCallback(async () => {
    if (!selected || !message.trim()) return;
    try {
      const res = await axios.post(
        `${backendUrl}/resident/maintenance/${selected.id}/comments`,
        { userId: user?.id, name: user?.name, text: message.trim() },
        { headers: authHeaders }
      );
      const c = res.data;
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? { ...t, comments: [...(t.comments || []), c] }
            : t
        )
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

  const changeStatus = useCallback(
    async (next: "submitted" | "in_progress" | "resolved") => {
      if (!selected || !user?.communityId) return;
      try {
        const res = await axios.patch(
          `${backendUrl}/resident/maintenance/${selected.id}/status`,
          { status: next, communityId: user.communityId },
          { headers: authHeaders }
        );
        const updated = res.data;
        setTickets((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        setSelected(updated);
      } catch (e) {
        Alert.alert("Error", "Failed to change status");
      }
    },
    [backendUrl, authHeaders, selected, user?.communityId]
  );

  const attachImageToSelected = useCallback(async () => {
    if (!selected) return;
    if (newImages.length === 0) return;
    // Attach the first staged image as example
    const imageUrl = newImages[0];
    try {
      await axios.post(
        `${backendUrl}/resident/maintenance/${selected.id}/images`,
        { imageUrl },
        { headers: authHeaders }
      );
      // Reflect in UI
      setSelected((s: any) => ({
        ...s,
        images: [...(s?.images || []), imageUrl],
      }));
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? { ...t, images: [...(t.images || []), imageUrl] }
            : t
        )
      );
      // remove from staged
      setNewImages((prev) => prev.slice(1));
      showToast("Image attached");
    } catch (e) {
      Alert.alert("Error", "Failed to attach image");
    }
  }, [backendUrl, authHeaders, selected, newImages, showToast]);

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
            <Feather name="tool" size={16} color={icon as any} />
          </View>
          <Text style={{ color: text, fontSize: 18, fontWeight: "800" }}>
            Maintenance
          </Text>
        </View>

        {/* New Request */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Text style={[styles.cardTitle, { color: text }]}>New Request</Text>
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
            <TextInput
              placeholder="Category (e.g., Plumbing)"
              placeholderTextColor={icon as any}
              value={category}
              onChangeText={setCategory}
              style={[
                styles.input,
                {
                  color: text,
                  borderColor: border,
                  backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                },
              ]}
            />
            <TextInput
              placeholder="Describe the issue in detail…"
              placeholderTextColor={icon as any}
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={4}
              style={[
                styles.textarea,
                {
                  color: text,
                  borderColor: border,
                  backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                },
              ]}
            />

            {/* Staged images */}
            {newImages.length > 0 ? (
              <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                {newImages.map((u, i) => (
                  <View key={i} style={{ alignItems: "center" }}>
                    <Image
                      source={{ uri: u }}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: border,
                      }}
                    />
                    <TouchableOpacity onPress={() => removeNewImage(i)}>
                      <Text style={{ color: icon as any, marginTop: 4 }}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={pickImage}
                style={[styles.btn, styles.btnOutline, { borderColor: border }]}
              >
                <Feather name="image" size={16} color={icon as any} />
                <Text style={{ color: icon as any, fontWeight: "700" }}>
                  Add Image
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitTicket}
                style={[styles.btn, styles.btnPrimary]}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Submit Request
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* My Tickets */}
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
            <Text style={[styles.cardTitle, { color: text }]}>My Tickets</Text>
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
                <ActivityIndicator />
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
          {loading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : tickets.length === 0 ? (
            <Text style={{ color: icon as any }}>No requests yet.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {tickets.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSelected(t)}
                  style={[
                    styles.listItem,
                    {
                      borderColor: selected?.id === t.id ? "#c7d2fe" : border,
                      backgroundColor:
                        selected?.id === t.id
                          ? theme === "dark"
                            ? "#0b1220"
                            : "#eef2ff"
                          : "transparent",
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: text, fontWeight: "700" }}>
                      {t.title}
                    </Text>
                    <Text style={{ color: icon as any }}>
                      {t.category} •{" "}
                      {new Date(
                        t.createdAt || t.created_at || Date.now()
                      ).toLocaleString()}
                    </Text>
                  </View>
                  <StatusChip
                    status={(t.status || "submitted").toLowerCase()}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Details */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          {!selected ? (
            <Text style={{ color: icon as any }}>
              Select a ticket to view details.
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
                  <Text style={[styles.cardTitle, { color: text }]}>
                    {selected.title}
                  </Text>
                  <Text style={{ color: icon as any }}>
                    {selected.category} • Opened{" "}
                    {new Date(
                      selected.createdAt || selected.created_at || Date.now()
                    ).toLocaleString()}
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
                <Text style={{ color: icon as any }}>
                  {selected.description || "—"}
                </Text>
              </View>

              {/* Images */}
              <View>
                <Text
                  style={{ color: text, fontWeight: "700", marginBottom: 6 }}
                >
                  Images
                </Text>
                {selected.images?.length ? (
                  <ScrollView horizontal contentContainerStyle={{ gap: 10 }}>
                    {(selected.images || []).map((src: string, i: number) => (
                      <Image
                        key={i}
                        source={{ uri: src }}
                        style={{
                          width: 120,
                          height: 100,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: border,
                        }}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={{ color: icon as any }}>No images</Text>
                )}

                {newImages.length > 0 ? (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    <Text style={{ color: icon as any }}>
                      Staged to attach:
                    </Text>
                    <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                      {newImages.map((u, i) => (
                        <Image
                          key={i}
                          source={{ uri: u }}
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: border,
                          }}
                        />
                      ))}
                    </ScrollView>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        onPress={pickImage}
                        style={[
                          styles.btn,
                          styles.btnOutline,
                          { borderColor: border },
                        ]}
                      >
                        <Feather name="image" size={16} color={icon as any} />
                        <Text style={{ color: icon as any, fontWeight: "700" }}>
                          Add More
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={attachImageToSelected}
                        style={[styles.btn, styles.btnPrimary]}
                      >
                        <Feather name="paperclip" size={16} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
                          Attach
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickImage}
                    style={[
                      styles.btn,
                      styles.btnOutline,
                      { borderColor: border, marginTop: 8 },
                    ]}
                  >
                    <Feather name="image" size={16} color={icon as any} />
                    <Text style={{ color: icon as any, fontWeight: "700" }}>
                      Add Image
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick actions */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => changeStatus("cancelled")}
                  disabled={selected.status === "cancelled"}
                  style={[
                    styles.btn,
                    styles.btnOutline,
                    {
                      borderColor: border,
                      opacity: selected.status === "cancelled" ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: icon as any, fontWeight: "700" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => changeStatus("resolved")}
                  disabled={selected.status === "resolved"}
                  style={[
                    styles.btn,
                    styles.btnOutline,
                    {
                      borderColor: border,
                      opacity: selected.status === "resolved" ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: icon as any, fontWeight: "700" }}>
                    Mark Resolved
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Comments */}
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
                            }}
                          >
                            {c.name || "User"}
                          </Text>
                        ) : null}
                        <Text style={{ color: mine ? "#fff" : text }}>
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
                            c.at || c.createdAt || Date.now()
                          ).toLocaleTimeString()}
                        </Text>
                      </View>
                    );
                  })}
                  {(selected.comments || []).length === 0 ? (
                    <Text style={{ color: icon as any }}>No messages yet.</Text>
                  ) : null}

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      placeholder="Write a message…"
                      placeholderTextColor={icon as any}
                      value={message}
                      onChangeText={setMessage}
                      onSubmitEditing={addComment}
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
                      <Text style={{ color: icon as any, fontWeight: "700" }}>
                        Send
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: icon as any, fontSize: 12 }}>
                    You can also attach images above; they’ll be stored inline
                    as data URLs.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
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
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    textAlignVertical: "top",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
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
});
