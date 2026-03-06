// @ts-nocheck
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { useAppContext } from "@/contexts/AppContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchResidentMeetings,
  rsvpResidentMeeting,
} from "@/lib/queries/resident";

const RSVP_OPTIONS = [
  { key: "GOING", label: "Going", icon: "check-circle", color: "#10B981" },
  { key: "NOT_GOING", label: "Not Going", icon: "x-circle", color: "#EF4444" },
  { key: "MAYBE", label: "Maybe", icon: "help-circle", color: "#F59E0B" },
];

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

export default function CommunityMeetings() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const { toast, showError, showSuccess, hideToast } = useToast();
  const { user, token } = useAppContext();
  const queryClient = useQueryClient();
  const meetingsKey = queryKeys.resident.meetings(user?.communityId ?? "");

  const [tab, setTab] = React.useState<"upcoming" | "past">("upcoming");
  const [rsvping, setRsvping] = React.useState<string | null>(null);

  const {
    data: meetings = [],
    isLoading: loading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: meetingsKey,
    queryFn: () =>
      fetchResidentMeetings(token, user!.communityId as string, user!.id),
    enabled: !!user?.communityId,
    staleTime: 10 * 60 * 1000,
  });
  const refreshing = isFetching && !loading;

  const rsvpMutation = useMutation({
    mutationFn: ({
      meetingId,
      response,
    }: {
      meetingId: string;
      response: string;
    }) =>
      rsvpResidentMeeting(token, meetingId, {
        response,
        userId: user?.id,
        communityId: user?.communityId,
      }),
    onSuccess: () => {
      showSuccess("RSVP saved.");
      queryClient.invalidateQueries({ queryKey: meetingsKey });
    },
    onError: () => showError("Failed to update RSVP."),
    onSettled: () => setRsvping(null),
  });

  const handleRsvp = (meetingId: string, response: string) => {
    setRsvping(meetingId + response);
    rsvpMutation.mutate({ meetingId, response });
  };
  const { upcoming, past } = useMemo(() => {
    const u: any[] = [],
      p: any[] = [];
    meetings.forEach((m) => {
      (isUpcoming(m.scheduledAt ?? m.startTime ?? m.date) ? u : p).push(m);
    });
    u.sort(
      (a, b) =>
        new Date(a.scheduledAt ?? a.startTime ?? a.date).getTime() -
        new Date(b.scheduledAt ?? b.startTime ?? b.date).getTime(),
    );
    p.sort(
      (a, b) =>
        new Date(b.scheduledAt ?? b.startTime ?? b.date).getTime() -
        new Date(a.scheduledAt ?? a.startTime ?? a.date).getTime(),
    );
    return { upcoming: u, past: p };
  }, [meetings]);

  const displayList = tab === "upcoming" ? upcoming : past;

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
          gap: 12,
        }}
      >
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
            {upcoming.length} upcoming
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: borderCol,
        }}
      >
        {(
          [
            ["upcoming", "Upcoming"],
            ["past", "Past"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: tab === key ? tint : "transparent",
              borderWidth: 1,
              borderColor: tab === key ? tint : borderCol,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: tab === key ? "#fff" : muted,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
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
          {displayList.length === 0 ? (
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
                No {tab} meetings
              </Text>
            </View>
          ) : (
            displayList.map((m) => {
              const dateStr = m.scheduledAt ?? m.startTime ?? m.date;
              const myRsvp = m.myRsvp ?? m.userRsvp;
              const goingCount = m.rsvpCounts?.GOING ?? m.goingCount ?? 0;
              const totalCount = m.rsvpCounts
                ? Object.values(m.rsvpCounts as Record<string, number>).reduce(
                    (a, b) => a + b,
                    0,
                  )
                : goingCount;
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
                  {/* Top accent */}
                  <View style={{ height: 4, backgroundColor: tint }} />
                  <View style={{ padding: 16, gap: 12 }}>
                    {/* Title + datetime */}
                    <View style={{ gap: 4 }}>
                      <Text
                        style={{ fontSize: 17, fontWeight: "700", color: text }}
                      >
                        {m.title}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Feather name="clock" size={12} color={muted} />
                        <Text style={{ fontSize: 12, color: muted }}>
                          {dateStr ? fmtDateTime(dateStr) : "TBD"}
                        </Text>
                      </View>
                      {m.location && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Feather name="map-pin" size={12} color={muted} />
                          <Text style={{ fontSize: 12, color: muted }}>
                            {m.location}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Description */}
                    {m.description && (
                      <Text
                        style={{ fontSize: 13, color: muted, lineHeight: 18 }}
                      >
                        {m.description}
                      </Text>
                    )}

                    {/* Agenda */}
                    {m.agenda &&
                      Array.isArray(m.agenda) &&
                      m.agenda.length > 0 && (
                        <View style={{ gap: 6 }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: muted,
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                            }}
                          >
                            Agenda
                          </Text>
                          {m.agenda.map((item: string, i: number) => (
                            <View
                              key={i}
                              style={{ flexDirection: "row", gap: 8 }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: tint,
                                  fontWeight: "700",
                                }}
                              >
                                {i + 1}.
                              </Text>
                              <Text
                                style={{ fontSize: 13, color: muted, flex: 1 }}
                              >
                                {item}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                    {/* RSVP counts */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Feather name="users" size={13} color={muted} />
                      <Text style={{ fontSize: 12, color: muted }}>
                        {goingCount} going
                        {totalCount > 0 ? ` of ${totalCount} responded` : ""}
                      </Text>
                    </View>

                    {/* RSVP buttons — only for upcoming */}
                    {isUpcoming(dateStr) && (
                      <View>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: muted,
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                            marginBottom: 8,
                          }}
                        >
                          Your RSVP
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {RSVP_OPTIONS.map((opt) => {
                            const isSelected =
                              myRsvp?.toUpperCase() === opt.key;
                            const isLoading = rsvping === m.id + opt.key;
                            return (
                              <Pressable
                                key={opt.key}
                                onPress={() => handleRsvp(m.id, opt.key)}
                                disabled={!!rsvping}
                                style={{
                                  flex: 1,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 5,
                                  paddingVertical: 9,
                                  borderRadius: 10,
                                  borderWidth: 1.5,
                                  borderColor: isSelected
                                    ? opt.color
                                    : borderCol,
                                  backgroundColor: isSelected
                                    ? opt.color + "20"
                                    : "transparent",
                                }}
                              >
                                {isLoading ? (
                                  <ActivityIndicator
                                    size="small"
                                    color={opt.color}
                                  />
                                ) : (
                                  <>
                                    <Feather
                                      name={opt.icon}
                                      size={14}
                                      color={isSelected ? opt.color : muted}
                                    />
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        fontWeight: "700",
                                        color: isSelected ? opt.color : muted,
                                      }}
                                    >
                                      {opt.label}
                                    </Text>
                                  </>
                                )}
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Past: show user's RSVP */}
                    {!isUpcoming(dateStr) && myRsvp && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: muted }}>
                          Your response:
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color:
                              RSVP_OPTIONS.find(
                                (o) => o.key === myRsvp?.toUpperCase(),
                              )?.color ?? muted,
                          }}
                        >
                          {RSVP_OPTIONS.find(
                            (o) => o.key === myRsvp?.toUpperCase(),
                          )?.label ?? myRsvp}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
