// @ts-nocheck
import React, { useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAppContext } from "@/contexts/AppContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchResidentMaintenance,
  createResidentMaintenanceTicket,
  addResidentMaintenanceComment,
} from "@/lib/queries/resident";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const STATUS_CONF = {
  SUBMITTED: { color: "#3B82F6", label: "SBMT" },
  OPEN: { color: "#F59E0B", label: "OPEN" },
  IN_PROGRESS: { color: "#8B5CF6", label: "PROG" },
  RESOLVED: { color: "#10B981", label: "RESV" },
  CANCELLED: { color: "#EF4444", label: "CNCL" },
  CLOSED: { color: "#94A3B8", label: "CLSD" },
};
const CATEGORIES = [
  "General",
  "Electrical",
  "Plumbing",
  "Carpentry",
  "Cleaning",
  "Security",
];

export default function Maintenance() {
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

  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [titleErr, setTitleErr] = useState("");
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { user, token } = useAppContext();
  const queryClient = useQueryClient();
  const maintenanceKey = queryKeys.resident.maintenance(
    user?.id ?? "",
    user?.communityId ?? "",
  );

  const {
    data: tickets = [],
    isLoading: loading,
    refetch: load,
  } = useQuery({
    queryKey: maintenanceKey,
    queryFn: () =>
      fetchResidentMaintenance(token, user!.id, user!.communityId as string),
    enabled: !!user?.id && !!user?.communityId,
    staleTime: 5 * 60 * 1000,
  });

  const submitMutation = useMutation({
    mutationFn: (payload: object) =>
      createResidentMaintenanceTicket(token, payload),
    onSuccess: (newTicket) => {
      setTitle("");
      setCategory("General");
      setDesc("");
      setShowNew(false);
      showSuccess("Ticket created!");
      queryClient.invalidateQueries({ queryKey: maintenanceKey });
    },
    onError: (e: any) =>
      showError(e?.response?.data?.error || "Failed to create ticket"),
    onSettled: () => setSubmitting(false),
  });

  const commentMutation = useMutation({
    mutationFn: ({
      ticketId,
      payload,
    }: {
      ticketId: string;
      payload: object;
    }) => addResidentMaintenanceComment(token, ticketId, payload),
    onSuccess: (newComment) => {
      const updated = {
        ...selected,
        comments: [...(selected.comments || []), newComment],
      };
      setSelected(updated);
      setComment("");
    },
    onError: () => showError("Failed to add comment"),
    onSettled: () => setAddingComment(false),
  });

  const submitTicket = () => {
    if (!title.trim()) {
      setTitleErr("Title is required");
      return;
    }
    setTitleErr("");
    setSubmitting(true);
    submitMutation.mutate({
      userId: user?.id,
      communityId: user?.communityId,
      title: title.trim(),
      category,
      description: desc.trim(),
    });
  };

  const addComment = () => {
    if (!selected || !comment.trim()) return;
    setAddingComment(true);
    commentMutation.mutate({
      ticketId: selected.id,
      payload: { userId: user?.id, name: user?.name, text: comment.trim() },
    });
  };
  const fmt = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const activeTickets = tickets.filter(
    (t) => !["RESOLVED", "CANCELLED", "CLOSED"].includes(t.status),
  );
  const closedTickets = tickets.filter((t) =>
    ["RESOLVED", "CANCELLED", "CLOSED"].includes(t.status),
  );

  const TicketItem = ({ item }) => {
    const sc = STATUS_CONF[item.status] || STATUS_CONF.SUBMITTED;
    return (
      <Pressable
        onPress={() => {
          setSelected(item);
          setShowDetail(true);
        }}
        style={({ pressed }) => ({
          backgroundColor: cardBg,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: selected?.id === item.id ? tint + "60" : borderCol,
          padding: 14,
          opacity: pressed ? 0.85 : 1,
          marginBottom: 8,
        })}
      >
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: sc.color + "1A",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
            }}
          >
            <Feather name="tool" size={17} color={sc.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: text,
                  flex: 1,
                  marginRight: 8,
                }}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: sc.color + "20",
                }}
              >
                <Text
                  style={{ fontSize: 10, fontWeight: "700", color: sc.color }}
                >
                  {sc.label}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
              {item.category} · {fmt(item.createdAt)}
            </Text>
            {item.comments?.length > 0 && (
              <Text style={{ fontSize: 11, color: tint, marginTop: 2 }}>
                {item.comments.length} comment
                {item.comments.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
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
              Maintenance
            </Text>
            <Text style={{ fontSize: 12, color: muted }}>
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowNew(true)}
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
              New
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={tint} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {tickets.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 50, gap: 8 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#8B5CF615",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="tool" size={24} color="#8B5CF6" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>
                No Tickets
              </Text>
              <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
                Submit a maintenance request to get started.
              </Text>
              <Pressable
                onPress={() => setShowNew(true)}
                style={{
                  marginTop: 4,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: tint,
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}
                >
                  Create Ticket
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {activeTickets.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: muted,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    Active ({activeTickets.length})
                  </Text>
                  {activeTickets.map((t) => (
                    <TicketItem key={t.id} item={t} />
                  ))}
                </View>
              )}
              {closedTickets.length > 0 && (
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: muted,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    Closed ({closedTickets.length})
                  </Text>
                  {closedTickets.map((t) => (
                    <TicketItem key={t.id} item={t} />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* New ticket modal */}
      <Modal
        visible={showNew}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNew(false)}
      >
        <KeyboardAvoidingView
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          behavior={Platform.select({ ios: "padding", android: "height" })}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: insets.bottom + 20,
              gap: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
                New Request
              </Text>
              <Pressable
                onPress={() => setShowNew(false)}
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
            <View>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 5,
                }}
              >
                Title *
              </Text>
              <TextInput
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  if (titleErr) setTitleErr("");
                }}
                placeholder="Describe the issue briefly"
                placeholderTextColor={muted}
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: titleErr ? "#EF4444" : borderCol,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: text,
                }}
              />
              {!!titleErr && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
                  <Feather name="alert-circle" size={12} color="#EF4444" />
                  <Text style={{ fontSize: 12, color: "#EF4444" }}>{titleErr}</Text>
                </View>
              )}
            </View>
            <View>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: category === c ? tint : fieldBg,
                      borderWidth: 1,
                      borderColor: category === c ? tint : borderCol,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: category === c ? "#fff" : muted,
                      }}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 5,
                }}
              >
                Description
              </Text>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="Additional details (optional)"
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
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
              />
            </View>
            <Pressable
              onPress={submitTicket}
              disabled={submitting}
              style={({ pressed }) => ({
                backgroundColor: pressed || submitting ? tint + "CC" : tint,
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
              })}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}
                >
                  Submit Request
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail modal */}
      <Modal
        visible={showDetail && !!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetail(false)}
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
              maxHeight: "88%",
              paddingBottom: insets.bottom + 16,
            }}
          >
            {/* Modal header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: borderCol,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: text,
                  flex: 1,
                  marginRight: 12,
                }}
                numberOfLines={1}
              >
                {selected?.title}
              </Text>
              <Pressable
                onPress={() => setShowDetail(false)}
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
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {/* Info chips */}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {selected &&
                  (() => {
                    const sc =
                      STATUS_CONF[selected.status] || STATUS_CONF.SUBMITTED;
                    return (
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                          backgroundColor: sc.color + "20",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: sc.color,
                          }}
                        >
                          {sc.label}
                        </Text>
                      </View>
                    );
                  })()}
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: tint + "18",
                  }}
                >
                  <Text
                    style={{ fontSize: 12, fontWeight: "600", color: tint }}
                  >
                    {selected?.category}
                  </Text>
                </View>
              </View>
              {selected?.description && (
                <View
                  style={{
                    backgroundColor: fieldBg,
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 13, color: text, lineHeight: 20 }}>
                    {selected.description}
                  </Text>
                </View>
              )}
              {/* Comments */}
              <Text style={{ fontSize: 13, fontWeight: "700", color: muted }}>
                Comments ({selected?.comments?.length || 0})
              </Text>
              {(selected?.comments || []).map((c, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: fieldBg,
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: tint,
                      marginBottom: 3,
                    }}
                  >
                    {c.user?.role === "ADMIN"
                      ? "Admin"
                      : c.user?.name || c.name || "User"}
                  </Text>
                  <Text style={{ fontSize: 13, color: text }}>{c.text}</Text>
                </View>
              ))}
              {/* Add comment */}
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}
              >
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Add a comment…"
                  placeholderTextColor={muted}
                  style={{
                    flex: 1,
                    backgroundColor: fieldBg,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: borderCol,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: text,
                  }}
                />
                <Pressable
                  onPress={addComment}
                  disabled={addingComment || !comment.trim()}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: tint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {addingComment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="send" size={16} color="#fff" />
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
