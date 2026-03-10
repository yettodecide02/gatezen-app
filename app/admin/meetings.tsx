// @ts-nocheck
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { useAppContext } from "@/contexts/AppContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchAdminMeetings,
  createAdminMeeting,
  updateAdminMeeting,
  deleteAdminMeeting,
} from "@/lib/queries/admin";
import { config } from "@/lib/config";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUpcoming(iso: string) {
  return new Date(iso) >= new Date();
}

const RSVP_COLORS = {
  GOING: "#10B981",
  NOT_GOING: "#EF4444",
  MAYBE: "#F59E0B",
};

export default function AdminMeetings() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const fieldBg = isDark ? "#111111" : "#F8FAFC";

  const { toast, showError, showSuccess, hideToast } = useToast();
  const { user, token } = useAppContext();
  const queryClient = useQueryClient();
  const meetingsKey = queryKeys.admin.meetings(user?.communityId ?? "");

  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState<any | null>(null);
  const [rsvpMeetingId, setRsvpMeetingId] = useState<string | null>(null);
  const [rsvpData, setRsvpData] = useState<any[]>([]);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [titleErr, setTitleErr] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [scheduledAt, setScheduledAt] = useState(
    new Date(Date.now() + 86400000),
  );
  const [agendaText, setAgendaText] = useState(""); // newline-separated

  const {
    data: meetings = [],
    isLoading: loading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: meetingsKey,
    queryFn: () => fetchAdminMeetings(token, user!.communityId as string),
    enabled: !!user?.communityId,
    staleTime: 10 * 60 * 1000,
    select: (data) => {
      const raw = data?.meetings ?? data ?? [];
      return Array.isArray(raw) ? raw : [];
    },
  });
  const refreshing = isFetching && !loading;

  const saveMutation = useMutation({
    mutationFn: async (body: object) => {
      if (editMeeting) return updateAdminMeeting(token, editMeeting.id, body);
      return createAdminMeeting(token, body);
    },
    onSuccess: () => {
      showSuccess(editMeeting ? "Meeting updated." : "Meeting created.");
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: meetingsKey });
    },
    onError: (e: any) =>
      showError(e?.response?.data?.error ?? "Failed to save meeting."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminMeeting(token, id),
    onSuccess: () => {
      showSuccess("Meeting deleted.");
      queryClient.invalidateQueries({ queryKey: meetingsKey });
    },
    onError: () => showError("Failed to delete meeting."),
    onSettled: () => setDeleting(null),
  });

  const resetForm = () => {
    setTitle("");
    setTitleErr("");
    setDescription("");
    setLocation("");
    setScheduledAt(new Date(Date.now() + 86400000));
    setAgendaText("");
    setEditMeeting(null);
  };

  const openEdit = (m: any) => {
    setEditMeeting(m);
    setTitle(m.title ?? "");
    setDescription(m.description ?? "");
    setLocation(m.location ?? "");
    setScheduledAt(new Date(m.scheduledAt ?? m.startTime ?? m.date));
    setAgendaText(Array.isArray(m.agenda) ? m.agenda.join("\n") : "");
    setShowModal(true);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setTitleErr("Title is required");
      return;
    }
    setTitleErr("");
    const body = {
      communityId: user?.communityId,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      scheduledAt: scheduledAt.toISOString(),
      agenda: agendaText.trim()
        ? agendaText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };
    saveMutation.mutate(body);
  };

  const handleDelete = (id: string) => {
    setDeleting(id);
    deleteMutation.mutate(id);
  };

  const loadRsvps = async (id: string) => {
    setRsvpMeetingId(id);
    setRsvpLoading(true);
    try {
      const res = await axios.get(`${config.backendUrl}/meetings/${id}/rsvps`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const raw = res.data?.rsvps ?? res.data ?? [];
      setRsvpData(Array.isArray(raw) ? raw : []);
    } catch {
      showError("Failed to load RSVPs.");
      setRsvpData([]);
    } finally {
      setRsvpLoading(false);
    }
  };

  const upcoming = meetings.filter((m) =>
    isUpcoming(m.scheduledAt ?? m.startTime ?? m.date),
  );
  const past = meetings.filter(
    (m) => !isUpcoming(m.scheduledAt ?? m.startTime ?? m.date),
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: 14,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: borderCol,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: text }}>
              Meetings
            </Text>
            <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>
              {upcoming.length} upcoming · {past.length} past
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: tint,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
            New
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={tint} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refetch()}
              tintColor={tint}
            />
          }
          contentContainerStyle={{
            padding: 16,
            gap: 14,
            paddingBottom: insets.bottom + 24,
          }}
        >
          {meetings.length === 0 ? (
            <View
              style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}
            >
              <Feather
                name="users"
                size={32}
                color={muted}
                style={{ opacity: 0.3 }}
              />
              <Text style={{ fontSize: 15, color: muted }}>
                No meetings yet
              </Text>
              <Text style={{ fontSize: 13, color: muted }}>
                Tap "New" to schedule a meeting.
              </Text>
            </View>
          ) : (
            [...upcoming, ...past].map((m) => {
              const dateStr = m.scheduledAt ?? m.startTime ?? m.date;
              const upcoming_ = isUpcoming(dateStr);
              const goingCount = m.rsvpCounts?.GOING ?? m.goingCount ?? 0;
              const notGoingCount = m.rsvpCounts?.NOT_GOING ?? 0;
              const maybeCount = m.rsvpCounts?.MAYBE ?? 0;
              const totalRsvp = goingCount + notGoingCount + maybeCount;
              return (
                <View
                  key={m.id}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: borderCol,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 4,
                      backgroundColor: upcoming_ ? tint : muted,
                    }}
                  />
                  <View style={{ padding: 16, gap: 10 }}>
                    {/* Title + status */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: text,
                          }}
                        >
                          {m.title}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <Feather name="clock" size={11} color={muted} />
                          <Text style={{ fontSize: 12, color: muted }}>
                            {dateStr ? fmtDateTime(dateStr) : "TBD"}
                          </Text>
                        </View>
                        {m.location && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <Feather name="map-pin" size={11} color={muted} />
                            <Text style={{ fontSize: 12, color: muted }}>
                              {m.location}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                          backgroundColor: upcoming_
                            ? tint + "20"
                            : muted + "20",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: upcoming_ ? tint : muted,
                          }}
                        >
                          {upcoming_ ? "UPCOMING" : "PAST"}
                        </Text>
                      </View>
                    </View>

                    {m.description && (
                      <Text
                        style={{ fontSize: 13, color: muted, lineHeight: 18 }}
                        numberOfLines={2}
                      >
                        {m.description}
                      </Text>
                    )}

                    {/* Agenda */}
                    {m.agenda &&
                      Array.isArray(m.agenda) &&
                      m.agenda.length > 0 && (
                        <View style={{ gap: 4 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: muted,
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                            }}
                          >
                            Agenda
                          </Text>
                          {m.agenda
                            .slice(0, 3)
                            .map((item: string, i: number) => (
                              <View
                                key={i}
                                style={{ flexDirection: "row", gap: 6 }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: tint,
                                    fontWeight: "700",
                                  }}
                                >
                                  {i + 1}.
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: muted,
                                    flex: 1,
                                  }}
                                  numberOfLines={1}
                                >
                                  {item}
                                </Text>
                              </View>
                            ))}
                          {m.agenda.length > 3 && (
                            <Text style={{ fontSize: 11, color: muted }}>
                              +{m.agenda.length - 3} more
                            </Text>
                          )}
                        </View>
                      )}

                    {/* RSVP summary row */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {[
                        {
                          label: "Going",
                          count: goingCount,
                          color: RSVP_COLORS.GOING,
                        },
                        {
                          label: "No",
                          count: notGoingCount,
                          color: RSVP_COLORS.NOT_GOING,
                        },
                        {
                          label: "Maybe",
                          count: maybeCount,
                          color: RSVP_COLORS.MAYBE,
                        },
                      ].map((r) => (
                        <View
                          key={r.label}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: r.color,
                            }}
                          />
                          <Text style={{ fontSize: 11, color: muted }}>
                            {r.count} {r.label}
                          </Text>
                        </View>
                      ))}
                      {totalRsvp > 0 && (
                        <Pressable
                          onPress={() => loadRsvps(m.id)}
                          style={{ marginLeft: "auto" }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              color: tint,
                              fontWeight: "600",
                            }}
                          >
                            View RSVPs
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Actions */}
                    <View
                      style={{ flexDirection: "row", gap: 8, marginTop: 2 }}
                    >
                      <Pressable
                        onPress={() => openEdit(m)}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          paddingVertical: 9,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: tint + "40",
                        }}
                      >
                        <Feather name="edit-2" size={13} color={tint} />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: tint,
                          }}
                        >
                          Edit
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(m.id)}
                        disabled={deleting === m.id}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: "#EF444415",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {deleting === m.id ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Feather name="trash-2" size={14} color="#EF4444" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Create / Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowModal(false);
          resetForm();
        }}
      >
        <View style={{ flex: 1, backgroundColor: bg }}>
          <View
            style={{
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: 14,
              paddingHorizontal: 20,
              borderBottomWidth: 1,
              borderBottomColor: borderCol,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
              {editMeeting ? "Edit Meeting" : "New Meeting"}
            </Text>
            <Pressable
              onPress={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              <Feather name="x" size={22} color={text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {/* Title */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Title *
              </Text>
              <TextInput
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: titleErr ? "#EF4444" : borderCol,
                  padding: 12,
                  fontSize: 14,
                  color: text,
                }}
                value={title}
                onChangeText={(v) => { setTitle(v); if (titleErr) setTitleErr(""); }}
                placeholder="e.g. Monthly HOA Meeting"
                placeholderTextColor={muted}
              />
              {!!titleErr && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <Feather name="alert-circle" size={12} color="#EF4444" />
                  <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "500" }}>{titleErr}</Text>
                </View>
              )}
            </View>

            {/* Scheduled Date */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Date & Time *
              </Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS === "android") {
                    DateTimePickerAndroid.open({
                      value: scheduledAt,
                      mode: "datetime",
                      minimumDate: new Date(),
                      onChange: (e, d) => {
                        if (e.type === "set" && d) setScheduledAt(d);
                      },
                    });
                  } else {
                    setShowDatePicker(true);
                  }
                }}
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: borderCol,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Feather name="calendar" size={16} color={muted} />
                <Text style={{ fontSize: 14, color: text }}>
                  {fmtDateTime(scheduledAt.toISOString())}
                </Text>
              </Pressable>
            </View>

            {/* iOS inline date-time picker */}
            {Platform.OS === "ios" && showDatePicker && (
              <DateTimePicker
                value={scheduledAt}
                mode="datetime"
                display="spinner"
                minimumDate={new Date()}
                onChange={(e, d) => {
                  setShowDatePicker(false);
                  if (e.type === "set" && d) setScheduledAt(d);
                }}
              />
            )}

            {/* Location */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Location
              </Text>
              <TextInput
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: borderCol,
                  padding: 12,
                  fontSize: 14,
                  color: text,
                }}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Community Hall"
                placeholderTextColor={muted}
              />
            </View>

            {/* Description */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Description
              </Text>
              <TextInput
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: borderCol,
                  padding: 12,
                  fontSize: 14,
                  color: text,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional details about the meeting…"
                placeholderTextColor={muted}
                multiline
              />
            </View>

            {/* Agenda */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Agenda Items
              </Text>
              <Text style={{ fontSize: 11, color: muted }}>
                One item per line
              </Text>
              <TextInput
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: borderCol,
                  padding: 12,
                  fontSize: 14,
                  color: text,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
                value={agendaText}
                onChangeText={setAgendaText}
                placeholder={"Budget review\nElect committee members\nAOB"}
                placeholderTextColor={muted}
                multiline
              />
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saveMutation.isPending}
              style={{
                marginTop: 8,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: tint,
                alignItems: "center",
                opacity: saveMutation.isPending ? 0.7 : 1,
              }}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}
                >
                  {editMeeting ? "Save Changes" : "Create Meeting"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* RSVP Detail Sheet */}
      {rsvpMeetingId && (
        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: insets.bottom + 20,
              maxHeight: "70%",
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: text }}>
                RSVP Responses
              </Text>
              <Pressable
                onPress={() => {
                  setRsvpMeetingId(null);
                  setRsvpData([]);
                }}
              >
                <Feather name="x" size={20} color={text} />
              </Pressable>
            </View>
            {rsvpLoading ? (
              <ActivityIndicator color={tint} style={{ paddingVertical: 20 }} />
            ) : rsvpData.length === 0 ? (
              <Text
                style={{
                  color: muted,
                  textAlign: "center",
                  paddingVertical: 20,
                }}
              >
                No RSVPs yet
              </Text>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ gap: 8 }}
              >
                {rsvpData.map((r, i) => (
                  <View
                    key={r.id ?? i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 8,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: borderCol,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor:
                          RSVP_COLORS[r.response?.toUpperCase()] ?? muted,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 14, fontWeight: "600", color: text }}
                      >
                        {r.user?.name ?? r.userName ?? "Resident"}
                      </Text>
                      {r.user?.unitNumber && (
                        <Text style={{ fontSize: 11, color: muted }}>
                          Unit {r.user.unitNumber}
                          {r.user.blockName
                            ? ` · Block ${r.user.blockName}`
                            : ""}
                        </Text>
                      )}
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor:
                          (RSVP_COLORS[r.response?.toUpperCase()] ?? muted) +
                          "20",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color:
                            RSVP_COLORS[r.response?.toUpperCase()] ?? muted,
                        }}
                      >
                        {r.response ?? "—"}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
