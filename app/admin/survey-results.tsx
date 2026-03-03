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

// ─── Helpers ────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function surveyStatus(survey) {
  const now = Date.now();
  const start = survey.startDate ? new Date(survey.startDate).getTime() : 0;
  const endDay = survey.endDate ? new Date(survey.endDate) : null;
  if (endDay) endDay.setHours(23, 59, 59, 999);
  const end = endDay ? endDay.getTime() : Infinity;
  if (now < start) return { label: "Upcoming", color: "#8B5CF6" };
  if (now > end) return { label: "Closed", color: "#64748B" };
  return { label: "Active", color: "#10B981" };
}

// ─── Aggregate answers per question ─────────────────────────

function aggregateAnswers(questions, responses) {
  const map = {};
  for (const q of questions) {
    map[q.id] = { question: q, answers: [] };
  }
  for (const r of responses) {
    if (!r.answers) continue;
    const answersObj =
      typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers;
    for (const [qId, ans] of Object.entries(answersObj)) {
      if (map[qId])
        map[qId].answers.push({
          value: ans,
          respondent: r.user?.name || "Anonymous",
        });
    }
  }
  return Object.values(map);
}

// ─── Bar component ───────────────────────────────────────────

function OptionBar({ label, count, total, color, isDark, textColor, muted }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={barStyles.row}>
      <View style={barStyles.labelRow}>
        <Text style={[barStyles.label, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[barStyles.pct, { color: muted }]}>
          {count} · {pct}%
        </Text>
      </View>
      <View
        style={[
          barStyles.track,
          { backgroundColor: isDark ? "#252525" : "#F1F5F9" },
        ]}
      >
        <View
          style={[barStyles.fill, { backgroundColor: color, width: `${pct}%` }]}
        />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { marginBottom: 10 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  label: { fontSize: 13, fontWeight: "500", flex: 1, marginRight: 8 },
  pct: { fontSize: 12, fontWeight: "600" },
  track: { height: 10, borderRadius: 5, overflow: "hidden" },
  fill: { height: 10, borderRadius: 5, minWidth: 4 },
});

// ─── Question Result Card ────────────────────────────────────

function QuestionCard({
  item,
  isDark,
  textColor,
  muted,
  borderCol,
  tint,
  index,
}) {
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const { question: q, answers } = item;
  const total = answers.length;

  const COLORS = [
    "#6366F1",
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
  ];

  // Aggregate for choice-based questions
  function getCounts(opts) {
    const counts = {};
    for (const o of opts) counts[o] = 0;
    for (const a of answers) {
      const v = String(a.value);
      if (counts[v] !== undefined) counts[v]++;
      else counts[v] = (counts[v] || 0) + 1;
    }
    return counts;
  }

  const renderBody = () => {
    if (q.type === "MULTIPLE_CHOICE") {
      const opts = q.options || [];
      const counts = getCounts(opts);
      return (
        <View style={{ gap: 4 }}>
          {opts.map((opt, i) => (
            <OptionBar
              key={i}
              label={opt}
              count={counts[opt] || 0}
              total={total}
              color={COLORS[i % COLORS.length]}
              isDark={isDark}
              textColor={textColor}
              muted={muted}
            />
          ))}
        </View>
      );
    }

    if (q.type === "YES_NO") {
      const yesCount = answers.filter(
        (a) => String(a.value).toLowerCase() === "yes",
      ).length;
      const noCount = answers.filter(
        (a) => String(a.value).toLowerCase() === "no",
      ).length;
      return (
        <View style={{ gap: 4 }}>
          <OptionBar
            label="Yes"
            count={yesCount}
            total={total}
            color="#10B981"
            isDark={isDark}
            textColor={textColor}
            muted={muted}
          />
          <OptionBar
            label="No"
            count={noCount}
            total={total}
            color="#EF4444"
            isDark={isDark}
            textColor={textColor}
            muted={muted}
          />
        </View>
      );
    }

    if (q.type === "RATING") {
      const numAnswers = answers
        .map((a) => Number(a.value))
        .filter((v) => !isNaN(v));
      const avg =
        numAnswers.length > 0
          ? (numAnswers.reduce((s, v) => s + v, 0) / numAnswers.length).toFixed(
              1,
            )
          : "—";
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const v of numAnswers) {
        if (dist[v] !== undefined) dist[v]++;
      }
      return (
        <View>
          <View style={rStyles.avgRow}>
            <Feather name="star" size={22} color="#F59E0B" />
            <Text style={[rStyles.avgNum, { color: textColor }]}>{avg}</Text>
            <Text style={[rStyles.avgOf, { color: muted }]}>/ 5</Text>
          </View>
          <View style={{ gap: 4, marginTop: 10 }}>
            {[5, 4, 3, 2, 1].map((star) => (
              <OptionBar
                key={star}
                label={`${star} ★`}
                count={dist[star]}
                total={total}
                color="#F59E0B"
                isDark={isDark}
                textColor={textColor}
                muted={muted}
              />
            ))}
          </View>
        </View>
      );
    }

    if (q.type === "TEXT") {
      if (answers.length === 0) {
        return (
          <Text style={{ fontSize: 13, color: muted, fontStyle: "italic" }}>
            No responses yet
          </Text>
        );
      }
      return (
        <View style={{ gap: 8 }}>
          {answers.map((a, i) => (
            <View
              key={i}
              style={[
                tStyles.textBubble,
                {
                  backgroundColor: isDark ? "#252525" : "#F8FAFC",
                  borderColor: borderCol,
                },
              ]}
            >
              <Text style={[tStyles.textAnswer, { color: textColor }]}>
                {String(a.value)}
              </Text>
              {a.respondent !== "Anonymous" && (
                <Text style={[tStyles.textRespondent, { color: muted }]}>
                  — {a.respondent}
                </Text>
              )}
            </View>
          ))}
        </View>
      );
    }

    return null;
  };

  const typeIcon = {
    MULTIPLE_CHOICE: "list",
    YES_NO: "toggle-left",
    RATING: "star",
    TEXT: "edit-3",
  };
  const typeLabel = {
    MULTIPLE_CHOICE: "Multiple Choice",
    YES_NO: "Yes / No",
    RATING: "Rating",
    TEXT: "Open Text",
  };

  return (
    <View
      style={[
        styles.qCard,
        { backgroundColor: cardBg, borderColor: borderCol },
      ]}
    >
      {/* Question header */}
      <View style={styles.qHeader}>
        <View style={[styles.qNumBadge, { backgroundColor: tint + "20" }]}>
          <Text style={[styles.qNumText, { color: tint }]}>Q{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.qText, { color: textColor }]}>{q.question}</Text>
          <View
            style={[
              styles.qTypePill,
              { backgroundColor: isDark ? "#252525" : "#F1F5F9" },
            ]}
          >
            <Feather
              name={typeIcon[q.type] || "circle"}
              size={10}
              color={muted}
            />
            <Text style={[styles.qTypeText, { color: muted }]}>
              {typeLabel[q.type] || q.type}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.respCountBadge,
            { backgroundColor: isDark ? "#252525" : "#F1F5F9" },
          ]}
        >
          <Text style={[styles.respCountText, { color: muted }]}>
            {total} resp.
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.qDivider, { backgroundColor: borderCol }]} />

      {/* Body */}
      {total === 0 ? (
        <View style={styles.noResp}>
          <Feather
            name="inbox"
            size={20}
            color={muted}
            style={{ opacity: 0.5 }}
          />
          <Text style={{ fontSize: 13, color: muted, fontStyle: "italic" }}>
            No responses yet
          </Text>
        </View>
      ) : (
        renderBody()
      )}
    </View>
  );
}

const rStyles = StyleSheet.create({
  avgRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  avgNum: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  avgOf: { fontSize: 16, fontWeight: "500" },
});

const tStyles = StyleSheet.create({
  textBubble: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  textAnswer: { fontSize: 13, lineHeight: 19 },
  textRespondent: { fontSize: 11, fontStyle: "italic" },
});

// ─── Resident Card ─────────────────────────────────────────

function ResidentCard({
  response,
  questions,
  isDark,
  textColor,
  muted,
  borderCol,
  tint,
  cardBg,
}) {
  const answersObj = response.answers
    ? typeof response.answers === "string"
      ? JSON.parse(response.answers)
      : response.answers
    : {};
  const name = response.user?.name || "Anonymous";
  const unit = response.user?.unit;
  const unitLabel = unit
    ? `Block ${unit.block?.name} · Unit ${unit.number}`
    : null;
  const initials =
    name
      .split(" ")
      .map((w) => w[0] || "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const answeredCount = Object.keys(answersObj).length;

  return (
    <View
      style={[
        rcStyles.card,
        { backgroundColor: cardBg, borderColor: borderCol },
      ]}
    >
      <View style={rcStyles.topRow}>
        <View style={[rcStyles.avatar, { backgroundColor: tint + "20" }]}>
          <Text style={[rcStyles.avatarText, { color: tint }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[rcStyles.name, { color: textColor }]}>{name}</Text>
          {unitLabel ? (
            <Text style={[rcStyles.unitText, { color: muted }]}>
              {unitLabel}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            rcStyles.countBadge,
            { backgroundColor: isDark ? "#252525" : "#F1F5F9" },
          ]}
        >
          <Text style={[rcStyles.countText, { color: muted }]}>
            {answeredCount}/{questions.length} answered
          </Text>
        </View>
      </View>
      <View style={[rcStyles.divider, { backgroundColor: borderCol }]} />
      <View style={{ gap: 8 }}>
        {questions.map((q, i) => {
          const ans = answersObj[q.id];
          const hasAns = ans !== undefined && ans !== null && ans !== "";
          return (
            <View key={q.id} style={rcStyles.qRow}>
              <View style={[rcStyles.qNum, { backgroundColor: tint + "15" }]}>
                <Text style={[rcStyles.qNumText, { color: tint }]}>
                  Q{i + 1}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={[rcStyles.qText, { color: muted }]}
                  numberOfLines={1}
                >
                  {q.question}
                </Text>
                {hasAns ? (
                  <Text style={[rcStyles.ansText, { color: textColor }]}>
                    {String(ans)}
                  </Text>
                ) : (
                  <Text style={[rcStyles.noAns, { color: muted }]}>
                    Not answered
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const rcStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700" },
  name: { fontSize: 14, fontWeight: "700" },
  unitText: { fontSize: 12, marginTop: 2 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  countText: { fontSize: 11, fontWeight: "600" },
  divider: { height: 1 },
  qRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  qNum: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  qNumText: { fontSize: 10, fontWeight: "800" },
  qText: { fontSize: 11 },
  ansText: { fontSize: 13, fontWeight: "600" },
  noAns: { fontSize: 12, fontStyle: "italic" },
});

const tabStyles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 13, fontWeight: "600" },
});

// ─── Main Screen ─────────────────────────────────────────────

export default function SurveyResults() {
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

  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"results" | "residents">("results");
  const { toast, showError, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => {
    if (id) fetchSurvey();
  }, [id]);

  const fetchSurvey = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${url}/admin/surveys/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSurvey(res.data?.data ?? res.data);
    } catch (e) {
      showError("Failed to load survey results.");
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

  if (!survey) {
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
        <Text style={{ fontSize: 14, color: muted }}>Survey not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: tint, fontSize: 14, fontWeight: "600" }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const questions = survey.questions ?? [];
  const responses = survey.responses ?? [];
  const responseCount = survey._count?.responses ?? responses.length;
  const aggregated = aggregateAnswers(questions, responses);
  const st = surveyStatus(survey);

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
            Survey Results
          </Text>
          <Text style={[styles.headerSub, { color: muted }]}>
            {responseCount} response{responseCount !== 1 ? "s" : ""}
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

      {/* Tab toggle */}
      <View
        style={[
          tabStyles.tabRow,
          { borderBottomColor: borderCol, backgroundColor: bg },
        ]}
      >
        {(
          [
            { key: "results", label: "Results", icon: "bar-chart-2" },
            { key: "residents", label: "Residents", icon: "users" },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              tabStyles.tabBtn,
              view === tab.key && { borderBottomColor: tint },
            ]}
            onPress={() => setView(tab.key)}
          >
            <Feather
              name={tab.icon}
              size={14}
              color={view === tab.key ? tint : muted}
            />
            <Text
              style={[
                tabStyles.tabText,
                { color: view === tab.key ? tint : muted },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {view === "results" ? (
          <View style={styles.content}>
            {/* Survey info card */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <View
                style={[styles.infoIconWrap, { backgroundColor: tint + "15" }]}
              >
                <Feather name="clipboard" size={20} color={tint} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.infoTitle, { color: textColor }]}>
                  {survey.title}
                </Text>
                {survey.description ? (
                  <Text style={[styles.infoDesc, { color: muted }]}>
                    {survey.description}
                  </Text>
                ) : null}
                <View style={styles.infoMetaRow}>
                  <Feather name="calendar" size={11} color={muted} />
                  <Text style={[styles.infoMeta, { color: muted }]}>
                    {formatDate(survey.startDate)} →{" "}
                    {formatDate(survey.endDate)}
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
                  label: "Responses",
                  value: responseCount,
                  color: tint,
                },
                {
                  icon: "help-circle",
                  label: "Questions",
                  value: questions.length,
                  color: "#6366F1",
                },
                {
                  icon: "percent",
                  label: "Completion",
                  value: `${responseCount > 0 ? "100" : "0"}%`,
                  color: "#10B981",
                },
              ].map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.statItem,
                    i < 2 && {
                      borderRightWidth: 1,
                      borderRightColor: borderCol,
                    },
                  ]}
                >
                  <Feather name={s.icon} size={14} color={s.color} />
                  <Text style={[styles.statValue, { color: textColor }]}>
                    {s.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: muted }]}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Section title */}
            <Text style={[styles.sectionTitle, { color: muted }]}>
              QUESTION BREAKDOWN
            </Text>

            {/* Question cards */}
            {aggregated.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                ]}
              >
                <Feather
                  name="inbox"
                  size={28}
                  color={muted}
                  style={{ opacity: 0.4 }}
                />
                <Text style={{ fontSize: 14, color: muted }}>
                  No questions found
                </Text>
              </View>
            ) : (
              aggregated.map((item, idx) => (
                <QuestionCard
                  key={item.question.id}
                  item={item}
                  index={idx}
                  isDark={isDark}
                  textColor={textColor}
                  muted={muted}
                  borderCol={borderCol}
                  tint={tint}
                />
              ))
            )}
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={[styles.sectionTitle, { color: muted }]}>
              RESPONDENTS
            </Text>
            {responses.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                ]}
              >
                <Feather
                  name="inbox"
                  size={28}
                  color={muted}
                  style={{ opacity: 0.4 }}
                />
                <Text style={{ fontSize: 14, color: muted }}>
                  No responses yet
                </Text>
              </View>
            ) : (
              responses.map((r) => (
                <ResidentCard
                  key={r.id}
                  response={r}
                  questions={questions}
                  isDark={isDark}
                  textColor={textColor}
                  muted={muted}
                  borderCol={borderCol}
                  tint={tint}
                  cardBg={cardBg}
                />
              ))
            )}
          </View>
        )}
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
  infoMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  infoMeta: { fontSize: 12 },
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
  statValue: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "500" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: -4,
  },
  qCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  qHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  qNumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  qNumText: { fontSize: 12, fontWeight: "800" },
  qText: { fontSize: 14, fontWeight: "600", flex: 1, lineHeight: 20 },
  qTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 5,
  },
  qTypeText: { fontSize: 10, fontWeight: "600" },
  respCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  respCountText: { fontSize: 11, fontWeight: "600" },
  qDivider: { height: 1 },
  noResp: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
});
