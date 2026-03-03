// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { getToken } from "@/lib/auth";
import { config } from "@/lib/config";

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function pollStatus(poll) {
  const now = Date.now();
  const start = poll.startDate ? new Date(poll.startDate).getTime() : 0;
  const endDay = poll.endDate ? new Date(poll.endDate) : null;
  if (endDay) endDay.setHours(23, 59, 59, 999);
  const end = endDay ? endDay.getTime() : Infinity;
  if (now < start) return { label: "Upcoming", color: "#8B5CF6" };
  if (now > end) return { label: "Closed", color: "#64748B" };
  return { label: "Active", color: "#10B981" };
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

// ─── Result Bar ───────────────────────────────────────────────

function ResultBar({
  candidate,
  totalVotes,
  isWinner,
  idx,
  isDark,
  textColor,
  muted,
}) {
  const pct =
    totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0;
  const col = CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];

  return (
    <View style={barStyles.row}>
      <View style={barStyles.topRow}>
        <View style={barStyles.nameRow}>
          {isWinner && <Feather name="award" size={13} color="#F59E0B" />}
          <Text
            style={[barStyles.name, { color: textColor }]}
            numberOfLines={1}
          >
            {candidate.name}
          </Text>
          {candidate.description ? (
            <Text style={[barStyles.desc, { color: muted }]} numberOfLines={1}>
              · {candidate.description}
            </Text>
          ) : null}
        </View>
        <Text style={[barStyles.pct, { color: isWinner ? "#F59E0B" : muted }]}>
          {candidate.votes} · {pct}%
        </Text>
      </View>
      <View
        style={[
          barStyles.track,
          { backgroundColor: isDark ? "#252525" : "#F1F5F9" },
        ]}
      >
        <View
          style={[barStyles.fill, { backgroundColor: col, width: `${pct}%` }]}
        />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { marginBottom: 14 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  name: { fontSize: 14, fontWeight: "600" },
  desc: { fontSize: 12 },
  pct: { fontSize: 13, fontWeight: "700" },
  track: { height: 12, borderRadius: 6, overflow: "hidden" },
  fill: { height: 12, borderRadius: 6, minWidth: 4 },
});

// ─── Voter Row ────────────────────────────────────────────────

function VoterRow({ voter, color, isDark, textColor, muted, borderCol }) {
  const initials = voter.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[vStyles.row, { borderBottomColor: borderCol }]}>
      <View style={[vStyles.avatar, { backgroundColor: color + "25" }]}>
        <Text style={[vStyles.initials, { color }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[vStyles.name, { color: textColor }]}>{voter.name}</Text>
        {voter.block || voter.unit ? (
          <Text style={[vStyles.unit, { color: muted }]}>
            {[
              voter.block && `Block ${voter.block}`,
              voter.unit && `Unit ${voter.unit}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : (
          <Text style={[vStyles.unit, { color: muted }]}>{voter.email}</Text>
        )}
      </View>
      <View style={[vStyles.votedBadge, { backgroundColor: color + "15" }]}>
        <Feather name="check" size={10} color={color} />
        <Text style={[vStyles.votedText, { color }]}>Voted</Text>
      </View>
    </View>
  );
}

const vStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 12, fontWeight: "800" },
  name: { fontSize: 13, fontWeight: "600" },
  unit: { fontSize: 11, marginTop: 1 },
  votedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  votedText: { fontSize: 10, fontWeight: "700" },
});

// ─── Main Screen ──────────────────────────────────────────────

export default function PollResults() {
  const { id } = useLocalSearchParams();
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const insets = useSafeAreaInsets();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  // view: "results" | "residents"
  const [view, setView] = useState("results");
  // For resident view: which candidate is selected (null = all)
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const { toast, showError, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => {
    if (id) fetchPoll();
  }, [id]);

  const fetchPoll = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${url}/admin/polls/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPoll(res.data?.data ?? res.data);
    } catch (e) {
      showError("Failed to load poll results.");
    } finally {
      setLoading(false);
    }
  };

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
        <ActivityIndicator size="large" color={tint} />
        <Text style={{ fontSize: 14, color: muted, marginTop: 12 }}>
          Loading results…
        </Text>
      </View>
    );
  }

  if (!poll) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          },
        ]}
      >
        <Feather
          name="alert-circle"
          size={32}
          color={muted}
          style={{ opacity: 0.5 }}
        />
        <Text style={{ fontSize: 14, color: muted }}>Poll not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: tint, fontSize: 14, fontWeight: "600" }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const candidates = poll.candidates ?? [];
  const totalVotes =
    poll.totalVotes ?? candidates.reduce((s, c) => s + (c.votes || 0), 0);
  const maxVotes = Math.max(...candidates.map((c) => c.votes || 0), 0);
  const st = pollStatus(poll);

  // Build resident list for "residents" view
  // Either all voters flattened, or just for the selected candidate
  const allVoters = candidates.flatMap((c, idx) =>
    (c.voters || []).map((v) => ({
      ...v,
      candidateId: c.id,
      candidateName: c.name,
      color: CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length],
    })),
  );
  const displayedVoters = selectedCandidate
    ? allVoters.filter((v) => v.candidateId === selectedCandidate)
    : allVoters;

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
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: borderCol }]}
        >
          <Feather name="arrow-left" size={18} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.headerTitle, { color: textColor }]}
            numberOfLines={1}
          >
            Poll Results
          </Text>
          <Text style={[styles.headerSub, { color: muted }]}>
            {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          </Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: st.color + "20" }]}
        >
          <View style={[styles.statusDot, { backgroundColor: st.color }]} />
          <Text style={[styles.statusLabel, { color: st.color }]}>
            {st.label}
          </Text>
        </View>
      </View>

      {/* View toggle tabs */}
      <View
        style={[
          styles.viewToggle,
          { backgroundColor: bg, borderBottomColor: borderCol },
        ]}
      >
        {[
          { key: "results", label: "Results", icon: "bar-chart-2" },
          { key: "residents", label: "Resident-wise", icon: "users" },
        ].map((t) => {
          const active = view === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setView(t.key)}
              style={[
                styles.viewTab,
                active && {
                  borderBottomColor: tint,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Feather name={t.icon} size={14} color={active ? tint : muted} />
              <Text
                style={[styles.viewTabText, { color: active ? tint : muted }]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Poll info card */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            <View
              style={[styles.infoIconWrap, { backgroundColor: tint + "15" }]}
            >
              <Feather name="check-square" size={20} color={tint} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.infoTitle, { color: textColor }]}>
                {poll.title}
              </Text>
              {poll.description ? (
                <Text style={[styles.infoDesc, { color: muted }]}>
                  {poll.description}
                </Text>
              ) : null}
              <View style={styles.infoMeta}>
                <Feather name="calendar" size={11} color={muted} />
                <Text style={[styles.infoMetaText, { color: muted }]}>
                  {formatDate(poll.startDate)} → {formatDate(poll.endDate)}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats strip */}
          <View
            style={[
              styles.statsStrip,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
          >
            {[
              {
                icon: "users",
                label: "Total Votes",
                value: totalVotes,
                color: tint,
              },
              {
                icon: "check-circle",
                label: "Candidates",
                value: candidates.length,
                color: "#3B82F6",
              },
              {
                icon: "award",
                label: "Leading",
                value:
                  candidates
                    .find((c) => c.votes === maxVotes)
                    ?.name?.split(" ")[0] || "—",
                color: "#F59E0B",
              },
            ].map((s, i) => (
              <View
                key={i}
                style={[
                  styles.statItem,
                  i < 2 && { borderRightWidth: 1, borderRightColor: borderCol },
                ]}
              >
                <Feather name={s.icon} size={14} color={s.color} />
                <Text
                  style={[styles.statValue, { color: textColor }]}
                  numberOfLines={1}
                >
                  {s.value}
                </Text>
                <Text style={[styles.statLabel, { color: muted }]}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>

          {/* ── RESULTS VIEW ── */}
          {view === "results" && (
            <View
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardIconWrap,
                    { backgroundColor: tint + "15" },
                  ]}
                >
                  <Feather name="bar-chart-2" size={15} color={tint} />
                </View>
                <Text style={[styles.cardTitle, { color: textColor }]}>
                  Vote Distribution
                </Text>
                <Text style={[styles.cardCount, { color: muted }]}>
                  {candidates.length} candidates
                </Text>
              </View>

              {totalVotes === 0 ? (
                <View style={styles.empty}>
                  <Feather
                    name="inbox"
                    size={28}
                    color={muted}
                    style={{ opacity: 0.4 }}
                  />
                  <Text style={{ fontSize: 13, color: muted }}>
                    No votes cast yet
                  </Text>
                </View>
              ) : (
                candidates
                  .slice()
                  .sort((a, b) => (b.votes || 0) - (a.votes || 0))
                  .map((c, idx) => (
                    <ResultBar
                      key={c.id}
                      candidate={c}
                      totalVotes={totalVotes}
                      isWinner={c.votes === maxVotes && maxVotes > 0}
                      idx={candidates.findIndex((x) => x.id === c.id)}
                      isDark={isDark}
                      textColor={textColor}
                      muted={muted}
                    />
                  ))
              )}
            </View>
          )}

          {/* ── RESIDENT-WISE VIEW ── */}
          {view === "residents" && (
            <View style={{ gap: 10 }}>
              {/* Candidate filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View
                  style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedCandidate(null)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor:
                          selectedCandidate === null
                            ? tint
                            : isDark
                              ? "#1A1A1A"
                              : "#F8FAFC",
                        borderColor:
                          selectedCandidate === null ? tint : borderCol,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: selectedCandidate === null ? "#fff" : muted },
                      ]}
                    >
                      All ({allVoters.length})
                    </Text>
                  </TouchableOpacity>
                  {candidates.map((c, idx) => {
                    const col = CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];
                    const isSelected = selectedCandidate === c.id;
                    const voterCount = (c.voters || []).length;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() =>
                          setSelectedCandidate(isSelected ? null : c.id)
                        }
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: isSelected
                              ? col
                              : isDark
                                ? "#1A1A1A"
                                : "#F8FAFC",
                            borderColor: isSelected ? col : borderCol,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.filterDot,
                            { backgroundColor: isSelected ? "#fff" : col },
                          ]}
                        />
                        <Text
                          style={[
                            styles.filterChipText,
                            { color: isSelected ? "#fff" : textColor },
                          ]}
                        >
                          {c.name.split(" ")[0]} ({voterCount})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Voter list card */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: cardBg, borderColor: borderCol },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.cardIconWrap,
                      { backgroundColor: isDark ? "#0A1E40" : "#DBEAFE" },
                    ]}
                  >
                    <Feather name="users" size={15} color="#3B82F6" />
                  </View>
                  <Text style={[styles.cardTitle, { color: textColor }]}>
                    {selectedCandidate
                      ? `Voted for ${candidates.find((c) => c.id === selectedCandidate)?.name}`
                      : "All Voters"}
                  </Text>
                  <Text style={[styles.cardCount, { color: muted }]}>
                    {displayedVoters.length} resident
                    {displayedVoters.length !== 1 ? "s" : ""}
                  </Text>
                </View>

                {displayedVoters.length === 0 ? (
                  <View style={styles.empty}>
                    <Feather
                      name="inbox"
                      size={28}
                      color={muted}
                      style={{ opacity: 0.4 }}
                    />
                    <Text style={{ fontSize: 13, color: muted }}>
                      {allVoters.length === 0
                        ? "No votes cast yet"
                        : "No voters for this candidate"}
                    </Text>
                  </View>
                ) : (
                  <View>
                    {displayedVoters.map((voter, i) => (
                      <VoterRow
                        key={voter.id + "-" + i}
                        voter={voter}
                        color={voter.color}
                        isDark={isDark}
                        textColor={textColor}
                        muted={muted}
                        borderCol={borderCol}
                      />
                    ))}
                    {/* Remove border from last item */}
                    <View style={{ height: 1 }} />
                  </View>
                )}
              </View>

              {/* Per-candidate breakdown cards */}
              {!selectedCandidate && candidates.length > 0 && (
                <View style={{ gap: 10 }}>
                  <Text style={[styles.sectionLabel, { color: muted }]}>
                    PER CANDIDATE BREAKDOWN
                  </Text>
                  {candidates
                    .slice()
                    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
                    .map((c, sortIdx) => {
                      const origIdx = candidates.findIndex(
                        (x) => x.id === c.id,
                      );
                      const col =
                        CANDIDATE_COLORS[origIdx % CANDIDATE_COLORS.length];
                      const voters = c.voters || [];
                      const pct =
                        totalVotes > 0
                          ? Math.round((c.votes / totalVotes) * 100)
                          : 0;
                      const isWinner = c.votes === maxVotes && maxVotes > 0;
                      return (
                        <View
                          key={c.id}
                          style={[
                            styles.candidateBreakCard,
                            { backgroundColor: cardBg, borderColor: borderCol },
                          ]}
                        >
                          {/* Candidate header */}
                          <View style={styles.candidateBreakHeader}>
                            <View
                              style={[
                                styles.candidateColorDot,
                                { backgroundColor: col },
                              ]}
                            />
                            <View style={{ flex: 1 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                {isWinner && (
                                  <Feather
                                    name="award"
                                    size={12}
                                    color="#F59E0B"
                                  />
                                )}
                                <Text
                                  style={[
                                    styles.candidateName,
                                    { color: textColor },
                                  ]}
                                >
                                  {c.name}
                                </Text>
                              </View>
                              {c.description ? (
                                <Text
                                  style={[
                                    styles.candidateDesc,
                                    { color: muted },
                                  ]}
                                >
                                  {c.description}
                                </Text>
                              ) : null}
                            </View>
                            <View
                              style={[
                                styles.voteBadge,
                                { backgroundColor: col + "20" },
                              ]}
                            >
                              <Text
                                style={[styles.voteBadgeText, { color: col }]}
                              >
                                {c.votes} vote{c.votes !== 1 ? "s" : ""} · {pct}
                                %
                              </Text>
                            </View>
                          </View>

                          {/* Mini bar */}
                          <View
                            style={[
                              styles.miniTrack,
                              {
                                backgroundColor: isDark ? "#252525" : "#F1F5F9",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.miniFill,
                                { backgroundColor: col, width: `${pct}%` },
                              ]}
                            />
                          </View>

                          {/* Voters */}
                          {voters.length === 0 ? (
                            <Text
                              style={[styles.noVotersText, { color: muted }]}
                            >
                              No votes yet
                            </Text>
                          ) : (
                            <View style={styles.voterChips}>
                              {voters.map((v) => (
                                <View
                                  key={v.id}
                                  style={[
                                    styles.voterChip,
                                    {
                                      backgroundColor: col + "15",
                                      borderColor: col + "30",
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.voterChipText,
                                      { color: textColor },
                                    ]}
                                  >
                                    {v.name}
                                    {v.block || v.unit ? (
                                      <Text
                                        style={{ color: muted, fontSize: 10 }}
                                      >
                                        {" "}
                                        (
                                        {[
                                          v.block && `Blk ${v.block}`,
                                          v.unit && `${v.unit}`,
                                        ]
                                          .filter(Boolean)
                                          .join(" ")}
                                        )
                                      </Text>
                                    ) : null}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

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
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 12, fontWeight: "600" },
  viewToggle: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  viewTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  viewTabText: { fontSize: 13, fontWeight: "600" },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  infoIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  infoDesc: { fontSize: 13, lineHeight: 18 },
  infoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  infoMetaText: { fontSize: 12 },
  statsStrip: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "500" },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  cardCount: { fontSize: 12, fontWeight: "500" },
  empty: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 4,
  },
  candidateBreakCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  candidateBreakHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  candidateColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  candidateName: { fontSize: 14, fontWeight: "700" },
  candidateDesc: { fontSize: 12, marginTop: 2 },
  voteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  voteBadgeText: { fontSize: 11, fontWeight: "700" },
  miniTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  miniFill: { height: 8, borderRadius: 4, minWidth: 4 },
  noVotersText: { fontSize: 12, fontStyle: "italic" },
  voterChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  voterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  voterChipText: { fontSize: 12, fontWeight: "500" },
});
