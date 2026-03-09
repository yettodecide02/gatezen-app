// @ts-nocheck
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ConfirmModal from "@/components/ConfirmModal";
import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { useAppContext } from "@/contexts/AppContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchAdminElectionPolls,
  createAdminElectionPoll,
  deleteAdminElectionPoll,
} from "@/lib/queries/admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// --- Helpers ---
function pollStatus(poll) {
  const now = Date.now();
  const start = poll.startDate ? new Date(poll.startDate).getTime() : 0;
  const endDay = poll.endDate ? new Date(poll.endDate) : null;
  if (endDay) endDay.setHours(23, 59, 59, 999);
  const end = endDay ? endDay.getTime() : Infinity;
  if (now < start)
    return {
      label: "Upcoming",
      color: "#8B5CF6",
      bg: "#EDE9FE",
      darkBg: "#1E1040",
    };
  if (now > end)
    return {
      label: "Closed",
      color: "#64748B",
      bg: "#F3F4F6",
      darkBg: "#1C1C2E",
    };
  return {
    label: "Active",
    color: "#10B981",
    bg: "#D1FAE5",
    darkBg: "#002A1A",
  };
}
function daysLeft(endDate) {
  if (!endDate) return null;
  const d = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  return d > 0 ? (d === 1 ? "1 day left" : `${d} days left`) : null;
}

const CANDIDATE_COLORS = [
  "#6366F1",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

// --- Result Bar ---
function ResultBar({
  candidate,
  totalVotes,
  isWinner,
  isDark,
  textColor,
  muted,
  idx,
}) {
  const pct =
    totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0;
  const col = CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];

  return (
    <View style={styles.resultRow}>
      <View style={styles.resultTopRow}>
        <View style={styles.resultNameRow}>
          {isWinner && <Feather name="award" size={12} color="#F59E0B" />}
          <Text
            style={[styles.resultName, { color: textColor }]}
            numberOfLines={1}
          >
            {candidate.name}
          </Text>
        </View>
        <Text
          style={[styles.resultPct, { color: isWinner ? "#F59E0B" : muted }]}
        >
          {pct}%
        </Text>
      </View>
      <View
        style={[
          styles.barBg,
          { backgroundColor: isDark ? "#252525" : "#F1F5F9" },
        ]}
      >
        <View
          style={[styles.barFill, { backgroundColor: col, width: `${pct}%` }]}
        />
      </View>
      <Text style={[styles.resultVotes, { color: muted }]}>
        {candidate.votes} vote{candidate.votes !== 1 ? "s" : ""}
      </Text>
    </View>
  );
}

// --- Poll Card (Admin) ---
function PollCard({
  poll,
  isDark,
  textColor,
  muted,
  tint,
  borderCol,
  onViewResults,
  onDelete,
}) {
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const [expanded, setExpanded] = useState(false);
  const st = pollStatus(poll);
  const dl = daysLeft(poll.endDate);
  const isActive = st.label === "Active";
  const totalVotes = (poll.candidates || []).reduce(
    (s, c) => s + (c.votes || 0),
    0,
  );
  const maxVotes = Math.max(
    ...(poll.candidates || []).map((c) => c.votes || 0),
    0,
  );

  return (
    <View
      style={[
        styles.pollCard,
        { backgroundColor: cardBg, borderColor: borderCol },
      ]}
    >
      {/* Active strip */}
      {isActive && (
        <View
          style={[
            styles.activePulse,
            { backgroundColor: isDark ? "#002A1A" : "#D1FAE5" },
          ]}
        >
          <View style={styles.pulseDot} />
          <Text style={styles.pulseText}>
            Voting open{dl ? ` · ${dl}` : ""}
          </Text>
        </View>
      )}

      <View style={styles.pollBody}>
        {/* Header */}
        <View style={styles.pollTitleRow}>
          <View
            style={[
              styles.pollIconWrap,
              { backgroundColor: isDark ? "#1E1040" : "#EDE9FE" },
            ]}
          >
            <Feather name="check-square" size={17} color={tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.pollTitle, { color: textColor }]}
              numberOfLines={2}
            >
              {poll.title}
            </Text>
            {poll.description ? (
              <Text
                style={[styles.pollDesc, { color: muted }]}
                numberOfLines={1}
              >
                {poll.description}
              </Text>
            ) : null}
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: isDark ? st.darkBg : st.bg },
            ]}
          >
            <Text style={[styles.statusPillText, { color: st.color }]}>
              {st.label.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.pollStats, { borderColor: borderCol }]}>
          <View style={styles.pollStatItem}>
            <Text style={[styles.pollStatValue, { color: textColor }]}>
              {poll.candidates?.length ?? 0}
            </Text>
            <Text style={[styles.pollStatLabel, { color: muted }]}>
              Candidates
            </Text>
          </View>
          <View
            style={[styles.pollStatDivider, { backgroundColor: borderCol }]}
          />
          <View style={styles.pollStatItem}>
            <Text style={[styles.pollStatValue, { color: textColor }]}>
              {totalVotes}
            </Text>
            <Text style={[styles.pollStatLabel, { color: muted }]}>
              Total Votes
            </Text>
          </View>
          <View
            style={[styles.pollStatDivider, { backgroundColor: borderCol }]}
          />
          <View style={styles.pollStatItem}>
            <Text style={[styles.pollStatValue, { color: st.color }]}>
              {st.label}
            </Text>
            <Text style={[styles.pollStatLabel, { color: muted }]}>Status</Text>
          </View>
        </View>

        {/* Results (always visible to admin) */}
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={styles.expandRow}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Feather name="bar-chart-2" size={13} color={tint} />
              <Text style={[styles.expandText, { color: tint }]}>Results</Text>
            </View>
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={muted}
            />
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={[styles.resultsWrap, { borderColor: borderCol }]}>
            {(poll.candidates || []).map((c, i) => (
              <ResultBar
                key={c.id || i}
                candidate={c}
                totalVotes={totalVotes}
                isWinner={c.votes === maxVotes && maxVotes > 0}
                isDark={isDark}
                textColor={textColor}
                muted={muted}
                idx={i}
              />
            ))}
          </View>
        )}

        {/* Admin action buttons */}
        <View style={styles.pollActions}>
          <TouchableOpacity
            onPress={() => onViewResults(poll.id)}
            style={[
              styles.actionBtnMain,
              {
                backgroundColor: isDark ? "#1E1040" : "#EDE9FE",
                borderColor: "#8B5CF620",
              },
            ]}
          >
            <Feather name="bar-chart-2" size={14} color={tint} />
            <Text style={[styles.actionBtnMainText, { color: tint }]}>
              View Results
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(poll.id)}
            style={[
              styles.actionBtnSq,
              { backgroundColor: "#FEE2E218", borderColor: "#FEE2E2" },
            ]}
          >
            <Feather name="trash-2" size={14} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// --- Create Poll Modal ---
function CreatePollModal({
  visible,
  onClose,
  onSubmit,
  theme,
  textColor,
  tint,
  muted,
  borderCol,
}) {
  const isDark = theme === "dark";
  const inputBg = isDark ? "#252525" : "#F8FAFC";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const sheetBg = isDark ? "#141414" : "#FFFFFF";

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [candidates, setCandidates] = useState([
    { id: 1, name: "", description: "" },
    { id: 2, name: "", description: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addCandidate = () =>
    setCandidates((cs) => [
      ...cs,
      { id: Date.now(), name: "", description: "" },
    ]);
  const removeCandidate = (id) =>
    setCandidates((cs) => cs.filter((c) => c.id !== id));
  const updateCandidate = (id, field, val) =>
    setCandidates((cs) =>
      cs.map((c) => (c.id === id ? { ...c, [field]: val } : c)),
    );

  const handleClose = () => {
    setTitle("");
    setDesc("");
    setEndDate(new Date());
    setShowDatePicker(false);
    setError("");
    setCandidates([
      { id: 1, name: "", description: "" },
      { id: 2, name: "", description: "" },
    ]);
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Poll title is required");
      return;
    }
    if (!endDate) {
      setError("End date is required");
      return;
    }
    if (candidates.some((c) => !c.name.trim())) {
      setError("All candidates must have a name");
      return;
    }
    if (candidates.length < 2) {
      setError("At least 2 candidates are required");
      return;
    }

    // Clean up candidates for backend - remove frontend id
    const cleanedCandidates = candidates.map((c) => ({
      name: c.name.trim(),
      description: c.description?.trim() || null,
    }));

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: desc.trim(),
        startDate: new Date().toISOString(),
        endDate: (() => {
          const d = new Date(endDate);
          d.setHours(23, 59, 59, 999);
          return d.toISOString();
        })(),
        candidates: cleanedCandidates,
      });
      handleClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create poll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%" }}
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: sheetBg, maxHeight: "92%" },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View
              style={[styles.sheetHeader, { borderBottomColor: borderCol }]}
            >
              <View style={styles.sheetHeaderLeft}>
                <View
                  style={[
                    styles.sheetIconWrap,
                    { backgroundColor: "#8B5CF615" },
                  ]}
                >
                  <Feather name="check-square" size={18} color={tint} />
                </View>
                <Text style={[styles.sheetTitle, { color: textColor }]}>
                  Create Poll
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.sheetCloseBtn, { borderColor: borderCol }]}
                onPress={handleClose}
              >
                <Feather name="x" size={18} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetBody}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {!!error && (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: muted }]}>
                  POLL TITLE
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      borderColor: inputBorder,
                      color: textColor,
                    },
                  ]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Committee Chair Election 2025"
                  placeholderTextColor={muted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: muted }]}>
                  DESCRIPTION (optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      borderColor: inputBorder,
                      color: textColor,
                    },
                  ]}
                  value={desc}
                  onChangeText={setDesc}
                  placeholder="Brief description of this election"
                  placeholderTextColor={muted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: muted }]}>
                  CLOSE DATE *
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS === "android") {
                      DateTimePickerAndroid.open({
                        value: endDate,
                        mode: "date",
                        minimumDate: new Date(),
                        onChange: (_, date) => {
                          if (date) setEndDate(date);
                        },
                      });
                    } else {
                      setShowDatePicker(true);
                    }
                  }}
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      borderColor: inputBorder,
                    },
                  ]}
                >
                  <Text style={{ color: textColor, fontSize: 14 }}>
                    {endDate.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.divider, { backgroundColor: borderCol }]} />
              <Text
                style={[styles.inputLabel, { color: muted, marginBottom: 12 }]}
              >
                CANDIDATES
              </Text>

              {candidates.map((c, i) => {
                const col = CANDIDATE_COLORS[i % CANDIDATE_COLORS.length];
                return (
                  <View
                    key={c.id}
                    style={[
                      styles.candidateBlock,
                      {
                        backgroundColor: isDark ? "#111111" : "#F8FAFC",
                        borderColor: borderCol,
                      },
                    ]}
                  >
                    <View style={styles.candidateBlockHeader}>
                      <View
                        style={[
                          styles.candidateBlockNum,
                          { backgroundColor: col + "20" },
                        ]}
                      >
                        <Text
                          style={[styles.candidateBlockNumText, { color: col }]}
                        >
                          #{i + 1}
                        </Text>
                      </View>
                      {candidates.length > 2 && (
                        <TouchableOpacity onPress={() => removeCandidate(c.id)}>
                          <Feather name="trash-2" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: muted }]}>
                        NAME *
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: isDark ? "#1A1A1A" : "#fff",
                            borderColor: inputBorder,
                            color: textColor,
                          },
                        ]}
                        value={c.name}
                        onChangeText={(v) => updateCandidate(c.id, "name", v)}
                        placeholder="Candidate name"
                        placeholderTextColor={muted}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: muted }]}>
                        BIO / DESCRIPTION (optional)
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: isDark ? "#1A1A1A" : "#fff",
                            borderColor: inputBorder,
                            color: textColor,
                          },
                        ]}
                        value={c.description}
                        onChangeText={(v) =>
                          updateCandidate(c.id, "description", v)
                        }
                        placeholder="Brief bio"
                        placeholderTextColor={muted}
                      />
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity
                onPress={addCandidate}
                style={[
                  styles.addCandidateBtn,
                  { borderColor: "#8B5CF650", backgroundColor: "#8B5CF610" },
                ]}
              >
                <Feather name="plus-circle" size={15} color={tint} />
                <Text style={[styles.addCandidateText, { color: tint }]}>
                  Add Candidate
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={[styles.sheetFooter, { borderTopColor: borderCol }]}>
              <TouchableOpacity
                style={[
                  styles.btnOutline,
                  {
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0",
                  },
                ]}
                onPress={handleClose}
              >
                <Text style={[styles.btnOutlineText, { color: muted }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  {
                    backgroundColor: tint,
                    flex: 1.5,
                    opacity: loading || !title.trim() ? 0.5 : 1,
                  },
                ]}
                onPress={handleSubmit}
                disabled={loading || !title.trim()}
              >
                <Text style={styles.btnPrimaryText}>
                  {loading ? "Creating..." : "Create Poll"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Date Picker — iOS: bottom-sheet spinner */}
        {Platform.OS === "ios" && (
          <Modal visible={showDatePicker} transparent animationType="slide">
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  backgroundColor: sheetBg,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: borderCol,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: textColor,
                    }}
                  >
                    Select End Date
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Feather name="x" size={20} color={textColor} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={endDate}
                  onChange={(_event, date) => {
                    if (date) setEndDate(date);
                  }}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  textColor={textColor}
                />
                <View
                  style={{
                    paddingHorizontal: 20,
                    paddingBottom: 20,
                    paddingTop: 10,
                    gap: 10,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      backgroundColor: tint,
                      paddingVertical: 13,
                      borderRadius: 12,
                      alignItems: "center",
                    }}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}
                    >
                      Confirm
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

// --- Main Component ---
export default function AdminElectionPolls() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("active");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const { toast, showError, showSuccess, hideToast } = useToast();
  const { user, token } = useAppContext();
  const queryClient = useQueryClient();
  const pollsKey = queryKeys.admin.electionPolls(user?.communityId ?? "");

  const {
    data: polls = [],
    isLoading: loading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: pollsKey,
    queryFn: () => fetchAdminElectionPolls(token, user!.communityId as string),
    enabled: !!user?.communityId,
    staleTime: 5 * 60 * 1000,
    select: (data) => {
      const raw = data?.polls ?? data?.data ?? data ?? [];
      return Array.isArray(raw) ? raw : [];
    },
  });
  const refreshing = isFetching && !loading;

  const createMutation = useMutation({
    mutationFn: (data: object) =>
      createAdminElectionPoll(token, {
        ...data,
        communityId: user?.communityId,
      }),
    onSuccess: () => {
      showSuccess("Poll created!");
      queryClient.invalidateQueries({ queryKey: pollsKey });
    },
    onError: () => showError("Failed to create poll."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminElectionPoll(token, id),
    onSuccess: () => {
      showSuccess("Poll deleted.");
      queryClient.invalidateQueries({ queryKey: pollsKey });
    },
    onError: () => showError("Failed to delete poll."),
    onSettled: () => setDeleteConfirmId(null),
  });

  const handleViewResults = (pollId) => {
    router.push(`/admin/poll-results?id=${pollId}`);
  };

  const tabs = [
    { key: "active", label: "Active", icon: "zap" },
    { key: "upcoming", label: "Upcoming", icon: "clock" },
    { key: "closed", label: "Closed", icon: "archive" },
    { key: "all", label: "All", icon: "grid" },
  ];

  const getFiltered = () => {
    if (activeTab === "all") return polls;
    return polls.filter((p) => pollStatus(p).label.toLowerCase() === activeTab);
  };
  const filtered = getFiltered();

  const stats = {
    total: polls.length,
    active: polls.filter((p) => pollStatus(p).label === "Active").length,
    upcoming: polls.filter((p) => pollStatus(p).label === "Upcoming").length,
    closed: polls.filter((p) => pollStatus(p).label === "Closed").length,
  };
  const totalVotesCast = polls.reduce(
    (s, p) =>
      s + (p.candidates || []).reduce((ss, c) => ss + (c.votes || 0), 0),
    0,
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Feather
          name="check-square"
          size={32}
          color={tint}
          style={{ opacity: 0.5, marginBottom: 12 }}
        />
        <Text style={{ fontSize: 14, color: muted }}>Loading polls...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, 20),
            borderBottomColor: borderCol,
            backgroundColor: bg,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: borderCol }]}
          >
            <Feather name="arrow-left" size={18} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              Election Polls
            </Text>
            <Text style={[styles.headerSub, { color: muted }]}>
              {polls.length} poll{polls.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: tint }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Feather name="plus" size={16} color="#ffffff" />
          <Text style={styles.headerBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refetch()}
            tintColor={tint}
          />
        }
      >
        <View style={styles.content}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {[
              {
                icon: "check-square",
                label: "Total Polls",
                value: stats.total,
                color: tint,
              },
              {
                icon: "zap",
                label: "Active",
                value: stats.active,
                color: "#10B981",
              },
              {
                icon: "users",
                label: "Votes Cast",
                value: totalVotesCast,
                color: "#3B82F6",
              },
              {
                icon: "archive",
                label: "Closed",
                value: stats.closed,
                color: "#64748B",
              },
            ].map((s) => (
              <View
                key={s.label}
                style={[
                  styles.statCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                ]}
              >
                <View
                  style={[
                    styles.statIconWrap,
                    { backgroundColor: s.color + "1A" },
                  ]}
                >
                  <Feather name={s.icon} size={16} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: textColor }]}>
                  {s.value}
                </Text>
                <Text style={[styles.statLabel, { color: muted }]}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 4 }}
          >
            <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
              {tabs.map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: isActive ? tint : "transparent",
                        borderColor: isActive ? tint : borderCol,
                      },
                    ]}
                    onPress={() => setActiveTab(t.key)}
                  >
                    <Feather
                      name={t.icon}
                      size={12}
                      color={isActive ? "#fff" : muted}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        { color: isActive ? "#fff" : muted },
                      ]}
                    >
                      {t.label}
                    </Text>
                    {stats[t.key] > 0 && (
                      <View
                        style={[
                          styles.tabCount,
                          {
                            backgroundColor: isActive
                              ? "rgba(255,255,255,0.25)"
                              : "#8B5CF620",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabCountText,
                            { color: isActive ? "#fff" : tint },
                          ]}
                        >
                          {stats[t.key]}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* List */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View style={styles.listHeader}>
              <View style={styles.listHeaderLeft}>
                <Feather name="check-square" size={16} color={tint} />
                <Text style={[styles.listHeaderTitle, { color: textColor }]}>
                  {tabs.find((t) => t.key === activeTab)?.label} Polls
                </Text>
              </View>
              <Text style={[styles.listCount, { color: muted }]}>
                {filtered.length}
              </Text>
            </View>

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather
                  name="check-square"
                  size={36}
                  color={muted}
                  style={{ opacity: 0.3 }}
                />
                <Text style={[styles.emptyText, { color: muted }]}>
                  No {activeTab} polls
                </Text>
                {activeTab === "active" && (
                  <TouchableOpacity
                    style={[styles.emptyCreateBtn, { backgroundColor: tint }]}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <Feather name="plus" size={14} color="#fff" />
                    <Text style={styles.emptyCreateBtnText}>
                      Create First Poll
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {filtered.map((p) => (
                  <PollCard
                    key={p.id}
                    poll={p}
                    isDark={isDark}
                    textColor={textColor}
                    muted={muted}
                    tint={tint}
                    borderCol={borderCol}
                    onViewResults={handleViewResults}
                    onDelete={(id) => setDeleteConfirmId(id)}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <CreatePollModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        theme={theme}
        textColor={textColor}
        tint={tint}
        muted={muted}
        borderCol={borderCol}
      />

      <ConfirmModal
        visible={!!deleteConfirmId}
        title="Delete Poll"
        message="Are you sure you want to delete this poll? All votes will be permanently lost."
        confirmLabel="Delete"
        confirmColor="#EF4444"
        icon="trash-2"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  headerBtnText: { fontSize: 13, fontWeight: "600", color: "#ffffff" },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: { fontSize: 13, fontWeight: "600" },
  tabCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  tabCountText: { fontSize: 10, fontWeight: "700" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  listHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  listHeaderTitle: { fontSize: 15, fontWeight: "600" },
  listCount: { fontSize: 12, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 13 },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyCreateBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  // Poll card
  pollCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  activePulse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  pulseText: { fontSize: 12, fontWeight: "600", color: "#10B981" },
  pollBody: { padding: 14, gap: 12 },
  pollTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  pollIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pollTitle: { fontSize: 14, fontWeight: "600" },
  pollDesc: { fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusPillText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  pollStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  pollStatItem: { flex: 1, alignItems: "center", gap: 2 },
  pollStatValue: { fontSize: 18, fontWeight: "700" },
  pollStatLabel: { fontSize: 11, fontWeight: "500" },
  pollStatDivider: { width: 1 },
  expandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  expandText: { fontSize: 13, fontWeight: "600" },
  resultsWrap: { borderTopWidth: 1, paddingTop: 12, gap: 14 },
  resultRow: { gap: 5 },
  resultTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  resultName: { fontSize: 13, fontWeight: "600" },
  resultPct: { fontSize: 13, fontWeight: "700" },
  barBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4, minWidth: 4 },
  resultVotes: { fontSize: 10 },
  pollActions: { flexDirection: "row", gap: 8 },
  actionBtnMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnMainText: { fontSize: 13, fontWeight: "600" },
  actionBtnSq: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  // Create poll modal
  candidateBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  candidateBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  candidateBlockNum: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  candidateBlockNumText: { fontSize: 12, fontWeight: "800" },
  addCandidateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginBottom: 8,
  },
  addCandidateText: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 16 },
  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(150,150,150,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16 },
  sheetFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorBannerText: { fontSize: 13, color: "#991B1B", flex: 1 },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 7,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  btnPrimary: { paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  btnPrimaryText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  btnOutline: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  btnOutlineText: { fontSize: 14, fontWeight: "600" },
});
