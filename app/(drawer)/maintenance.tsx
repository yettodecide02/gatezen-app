// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

const STATUS_LABEL: any = {
  submitted: "Submitted",
  in_progress: "In Progress",
  resolved: "Resolved",
};

function StatusChip({ status }: any) {
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
  };
  const key = (status || "submitted").toLowerCase();
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
      <Text style={{ color: s.clr, fontWeight: "600" }}>
        {STATUS_LABEL[key] || status}
      </Text>
    </View>
  );
}

export default function Maintenance() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // new ticket
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [desc, setDesc] = useState("");
  const [newImages, setNewImages] = useState<any[]>([]); // [{ uri, kind: 'local'|'remote', name?, mimeType? }]
  const [attaching, setAttaching] = useState(false);
  const MAX_IMAGES = 5;

  // comments
  const [message, setMessage] = useState("");
  const user = useMemo(() => ({ id: "u1", name: "Admin" }), []);

  const backendUrl =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    process.env.EXPO_BACKEND_URL ||
    "http://localhost:4000";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/maintenance`, {
        params: { userId: user.id },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setTickets(list);
      setSelected(
        (prev) =>
          (prev
            ? list.find((t: any) => t.id === prev.id) || list[0]
            : list[0]) || null
      );
    } catch (err) {
      console.warn("Failed to load maintenance tickets:", err);
      setTickets([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, user.id]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const submitTicket = useCallback(async () => {
    try {
      let staged = [...newImages];
      if (staged.length > MAX_IMAGES) {
        staged = staged.slice(0, MAX_IMAGES);
        Alert.alert(
          "Image limit",
          `Only the first ${MAX_IMAGES} images will be submitted.`
        );
      }
      const images: string[] = [];
      for (const item of staged) {
        const uri = typeof item === "string" ? item : item?.uri;
        const kind =
          typeof item === "object"
            ? item?.kind
            : uri?.startsWith("http")
            ? "remote"
            : "local";
        if (!uri) continue;
        if (kind === "remote" || uri.startsWith("http")) {
          images.push(uri);
        } else {
          try {
            const mime =
              (typeof item === "object" && item?.mimeType) || "image/jpeg";
            const b64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            images.push(`data:${mime};base64,${b64}`);
          } catch (e) {
            console.warn("Failed to read file for new ticket:", e);
          }
        }
      }
      const payload = {
        userId: user.id,
        title,
        category,
        description: desc,
        images,
      };
      const res = await axios.post(`${backendUrl}/maintenance`, payload);
      const t = res.data;
      setTitle("");
      setCategory("General");
      setDesc("");
      setNewImages([]);
      setTickets((prev) => [t, ...prev]);
      setSelected(t);
    } catch (err) {
      console.warn("Failed to submit maintenance ticket:", err);
    }
  }, [backendUrl, user.id, title, category, desc, newImages]);

  const handlePickImage = useCallback(async () => {
    try {
      // Enforce limit before opening picker
      const currentCount = selected
        ? selected.images?.length || 0
        : newImages.length;
      if (currentCount >= MAX_IMAGES) {
        Alert.alert(
          "Limit reached",
          `You can attach up to ${MAX_IMAGES} images.`
        );
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
      const picked = {
        uri: a.uri,
        name: a.fileName || "image.jpg",
        mimeType: a.mimeType || "image/jpeg",
        kind: "local",
      };
      if (!selected) {
        setNewImages((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, picked];
        });
        return;
      }
      setAttaching(true);
      try {
        const count = selected.images?.length || 0;
        if (count >= MAX_IMAGES) {
          Alert.alert(
            "Limit reached",
            `This ticket already has ${count} images (max ${MAX_IMAGES}).`
          );
          return;
        }
        const b64 = await FileSystem.readAsStringAsync(a.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await axios.post(`${backendUrl}/maintenance/${selected.id}/images`, {
          imageData: `data:${picked.mimeType};base64,${b64}`,
          fileName: picked.name,
          mimeType: picked.mimeType,
        });
        setSelected((s: any) => {
          if (!s) return s;
          const next = [...(s.images || [])];
          if (next.length < MAX_IMAGES) next.push(picked.uri);
          return { ...s, images: next };
        });
        setTickets((prev) =>
          prev.map((t) => {
            if (t.id !== selected.id) return t;
            const next = [...(t.images || [])];
            if (next.length < MAX_IMAGES) next.push(picked.uri);
            return { ...t, images: next };
          })
        );
      } catch (err) {
        console.warn("Failed to attach picked image:", err);
      } finally {
        setAttaching(false);
      }
    } catch (err) {
      console.warn("Image picker failed:", err);
    }
  }, [selected, backendUrl]);

  // file picking removed (images only)

  const removeStaged = useCallback((index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addComment = useCallback(async () => {
    if (!selected || !message.trim()) return;
    try {
      const res = await axios.post(
        `${backendUrl}/maintenance/${selected.id}/comments`,
        { userId: user.id, name: user.name, text: message.trim() }
      );
      const c = res.data;
      setTickets((prev) =>
        prev.map((t: any) =>
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
    } catch (err) {
      console.warn("Failed to add comment:", err);
    }
  }, [backendUrl, selected, message, user.id, user.name]);

  const changeStatus = useCallback(
    async (next: "submitted" | "in_progress" | "resolved") => {
      if (!selected) return;
      try {
        const res = await axios.patch(
          `${backendUrl}/maintenance/${selected.id}/status`,
          { status: next }
        );
        const updated = res.data;
        setTickets((prev) =>
          prev.map((t: any) => (t.id === updated.id ? updated : t))
        );
        setSelected(updated);
      } catch (err) {
        console.warn("Failed to change ticket status:", err);
      }
    },
    [backendUrl, selected]
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top + 8 }}>
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
              style={[
                styles.textarea,
                {
                  color: text,
                  borderColor: border,
                  backgroundColor: theme === "dark" ? "#0B0B0B" : "#F9FAFB",
                },
              ]}
              multiline
              numberOfLines={4}
            />
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <TouchableOpacity
                onPress={handlePickImage}
                disabled={
                  attaching ||
                  (selected
                    ? (selected.images?.length || 0) >= MAX_IMAGES
                    : newImages.length >= MAX_IMAGES)
                }
                style={[styles.btnOutline, { borderColor: border }]}
              >
                <Feather name="image" size={16} color={icon as any} />
                <Text style={{ color: text, marginLeft: 6 }}>Pick Image</Text>
              </TouchableOpacity>
            </View>
            {!!newImages.length && (
              <View style={{ marginTop: 6 }}>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  {newImages.map((item, i) => {
                    const uri = typeof item === "string" ? item : item.uri;
                    const mime =
                      typeof item === "object" ? item.mimeType : undefined;
                    const isImg =
                      (mime ? mime.startsWith("image/") : true) ||
                      (uri || "").startsWith("http");
                    return (
                      <View key={i} style={{ alignItems: "center" }}>
                        <View style={{ position: "relative" }}>
                          {isImg ? (
                            <Image
                              source={{ uri }}
                              style={{
                                width: 90,
                                height: 70,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: border,
                              }}
                            />
                          ) : (
                            <View
                              style={{
                                borderWidth: 1,
                                borderColor: border,
                                borderRadius: 8,
                                padding: 10,
                              }}
                            >
                              <Feather
                                name="file"
                                size={16}
                                color={icon as any}
                              />
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => removeStaged(i)}
                            style={{
                              position: "absolute",
                              top: -6,
                              right: -6,
                              backgroundColor:
                                theme === "dark" ? "#111111" : "#ffffff",
                              borderWidth: 1,
                              borderColor: border,
                              borderRadius: 999,
                              padding: 4,
                            }}
                          >
                            <Feather name="x" size={12} color={icon as any} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            <TouchableOpacity onPress={submitTicket} style={styles.btnPrimary}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={{ color: "#fff", marginLeft: 6, fontWeight: "700" }}>
                Submit Request
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Text style={[styles.cardTitle, { color: text }]}>My Tickets</Text>
          {loading ? (
            <ActivityIndicator />
          ) : tickets.length === 0 ? (
            <Text style={{ color: icon }}>No requests yet.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {tickets.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSelected(t)}
                  style={[
                    styles.item,
                    {
                      borderColor: selected?.id === t.id ? "#c7d2fe" : border,
                      backgroundColor:
                        selected?.id === t.id
                          ? theme === "dark"
                            ? "#0b1220"
                            : "#eef2ff"
                          : theme === "dark"
                          ? "#0B0B0B"
                          : "#F9FAFB",
                    },
                  ]}
                >
                  <Text style={[styles.itemTitle, { color: text }]}>
                    {t.title}
                  </Text>
                  <Text style={{ color: icon, marginBottom: 6 }}>
                    {t.category} • {new Date(t.createdAt).toLocaleString()}
                  </Text>
                  <StatusChip status={t.status} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          {!selected ? (
            <Text style={{ color: icon }}>
              Select a ticket to view details.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text
                    style={[styles.itemTitle, { color: text, marginBottom: 4 }]}
                  >
                    {selected.title}
                  </Text>
                  <Text style={{ color: icon }}>
                    {selected.category} • Opened{" "}
                    {new Date(selected.createdAt).toLocaleString()}
                  </Text>
                </View>
                <StatusChip status={selected.status} />
              </View>

              <View>
                <Text style={[styles.sectionTitle, { color: text }]}>
                  Description
                </Text>
                <Text style={{ color: text, marginTop: 6 }}>
                  {selected.description || "—"}
                </Text>
              </View>

              <View>
                <Text style={[styles.sectionTitle, { color: text }]}>
                  Images
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  {(selected.images || []).map((src: string, i: number) => (
                    <TouchableOpacity key={i}>
                      <Image
                        source={{ uri: src }}
                        style={{
                          width: 120,
                          height: 100,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: border,
                        }}
                      />
                    </TouchableOpacity>
                  ))}
                  {(!selected.images || selected.images.length === 0) && (
                    <Text style={{ color: icon }}>No images</Text>
                  )}
                </View>
              </View>

              <View>
                <Text style={[styles.sectionTitle, { color: text }]}>
                  Timeline
                </Text>
                <View style={{ marginTop: 8, gap: 8 }}>
                  {(selected.history || []).map((h: any) => (
                    <View
                      key={h.id}
                      style={{
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: border,
                        paddingTop: 8,
                      }}
                    >
                      <StatusChip status={h.status} />
                      <Text style={{ color: icon, marginTop: 4 }}>
                        {new Date(h.at).toLocaleString()}
                      </Text>
                      {!!h.note && (
                        <Text style={{ color: text, marginTop: 4 }}>
                          {h.note}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => changeStatus("in_progress")}
                  disabled={
                    selected.status === "in_progress" ||
                    selected.status === "resolved"
                  }
                  style={[
                    styles.btnOutline,
                    {
                      borderColor: border,
                      opacity:
                        selected.status === "in_progress" ||
                        selected.status === "resolved"
                          ? 0.6
                          : 1,
                    },
                  ]}
                >
                  <Text style={{ color: text }}>Start Progress</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => changeStatus("resolved")}
                  disabled={selected.status === "resolved"}
                  style={[
                    styles.btnOutline,
                    {
                      borderColor: border,
                      opacity: selected.status === "resolved" ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: text }}>Mark Resolved</Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={[styles.sectionTitle, { color: text }]}>
                  Comments
                </Text>
                <View style={{ gap: 10, marginTop: 10 }}>
                  {(selected.comments || []).map((c: any) => {
                    const mine = c.userId === user.id;
                    return (
                      <View
                        key={c.id}
                        style={[
                          styles.bubble,
                          mine && styles.bubbleMe,
                          {
                            borderColor: border,
                            backgroundColor:
                              theme === "dark"
                                ? mine
                                  ? "#0b1220"
                                  : "#0B0B0B"
                                : mine
                                ? "#eef2ff"
                                : "#F9FAFB",
                          },
                        ]}
                      >
                        {!mine && (
                          <Text
                            style={{
                              color: icon,
                              marginBottom: 4,
                              fontWeight: "600",
                            }}
                          >
                            {c.name || "User"}
                          </Text>
                        )}
                        <Text style={{ color: text }}>{c.text}</Text>
                        <Text
                          style={{ color: icon, marginTop: 4, fontSize: 12 }}
                        >
                          {new Date(c.at).toLocaleTimeString()}
                        </Text>
                      </View>
                    );
                  })}
                  {(!selected.comments || selected.comments.length === 0) && (
                    <Text style={{ color: icon }}>No messages yet.</Text>
                  )}

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
                      style={styles.btnOutline}
                    >
                      <Feather name="send" size={16} color={icon as any} />
                      <Text style={{ color: text, marginLeft: 6 }}>Send</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: icon, fontSize: 12 }}>
                    Use the image picker to attach up to {MAX_IMAGES} images.
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
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 14, fontWeight: "700" },
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
    textAlignVertical: "top",
  },
  item: { borderWidth: 1, borderRadius: 10, padding: 12 },
  itemTitle: { fontSize: 14, fontWeight: "700" },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnOutline: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bubble: { borderWidth: 1, borderRadius: 12, padding: 10 },
  bubbleMe: { alignSelf: "flex-end" },
});
