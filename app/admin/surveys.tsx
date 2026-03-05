// @ts-nocheck
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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
import { getCommunityId, getToken, getEnabledFeatures } from "@/lib/auth";
import { config } from "@/lib/config";

// --- Helpers ---
function surveyStatus(survey) {
  const now = Date.now();
  const start = survey.startDate ? new Date(survey.startDate).getTime() : 0;
  const endDay = survey.endDate ? new Date(survey.endDate) : null;
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

// --- Survey Card (Admin) ---
function SurveyCard({
  survey,
  isDark,
  textColor,
  muted,
  tint,
  borderCol,
  onViewResults,
  onDelete,
}) {
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const st = surveyStatus(survey);
  const dl = daysLeft(survey.endDate);
  const qCount = survey.questions?.length ?? survey.questionCount ?? 0;
  const rCount = survey.responseCount ?? 0;
  const isActive = st.label === "Active";

  return (
    <View
      style={[
        styles.surveyCard,
        { backgroundColor: cardBg, borderColor: borderCol },
      ]}
    >
      {/* Active pulse strip */}
      {isActive && (
        <View
          style={[
            styles.activePulse,
            { backgroundColor: isDark ? "#002A1A" : "#D1FAE5" },
          ]}
        >
          <View style={styles.pulseDot} />
          <Text style={styles.pulseText}>
            Survey open{dl ? ` · ${dl}` : ""}
          </Text>
        </View>
      )}

      <View style={styles.surveyBody}>
        {/* Title row */}
        <View style={styles.surveyTitleRow}>
          <View
            style={[
              styles.surveyIconWrap,
              { backgroundColor: isDark ? "#0A1E40" : "#DBEAFE" },
            ]}
          >
            <Feather name="clipboard" size={17} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.surveyTitle, { color: textColor }]}
              numberOfLines={2}
            >
              {survey.title}
            </Text>
            {survey.description ? (
              <Text
                style={[styles.surveyDesc, { color: muted }]}
                numberOfLines={1}
              >
                {survey.description}
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

        {/* Stats row */}
        <View style={[styles.statsRow, { borderColor: borderCol }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statItemValue, { color: textColor }]}>
              {qCount}
            </Text>
            <Text style={[styles.statItemLabel, { color: muted }]}>
              Questions
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: borderCol }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statItemValue, { color: textColor }]}>
              {rCount}
            </Text>
            <Text style={[styles.statItemLabel, { color: muted }]}>
              Responses
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: borderCol }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statItemValue, { color: st.color }]}>
              {st.label}
            </Text>
            <Text style={[styles.statItemLabel, { color: muted }]}>Status</Text>
          </View>
        </View>

        {/* Admin action buttons */}
        <View style={styles.surveyActions}>
          <TouchableOpacity
            onPress={() => onViewResults(survey.id)}
            style={[
              styles.actionBtnMain,
              {
                backgroundColor: isDark ? "#0A1E40" : "#DBEAFE",
                borderColor: "#3B82F620",
              },
            ]}
          >
            <Feather name="bar-chart-2" size={14} color="#3B82F6" />
            <Text style={[styles.actionBtnMainText, { color: "#3B82F6" }]}>
              View Results
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(survey.id)}
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

// --- Create Survey Modal ---
function CreateSurveyModal({
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
  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      question: "",
      type: "MULTIPLE_CHOICE",
      options: ["", ""],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const QTYPES = ["MULTIPLE_CHOICE", "YES_NO", "RATING", "TEXT"];
  const QTYPE_LABELS = {
    MULTIPLE_CHOICE: "Multiple Choice",
    YES_NO: "Yes / No",
    RATING: "Rating 1–5",
    TEXT: "Open Text",
  };
  const QTYPE_ICONS = {
    MULTIPLE_CHOICE: "list",
    YES_NO: "toggle-left",
    RATING: "star",
    TEXT: "edit-3",
  };

  const addQuestion = () =>
    setQuestions((qs) => [
      ...qs,
      {
        id: Date.now(),
        question: "",
        type: "MULTIPLE_CHOICE",
        options: ["", ""],
      },
    ]);
  const removeQuestion = (id) =>
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  const updateQuestion = (id, field, val) =>
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, [field]: val } : q)),
    );
  const updateOption = (qId, oIdx, val) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId
          ? { ...q, options: q.options.map((o, i) => (i === oIdx ? val : o)) }
          : q,
      ),
    );
  const addOption = (qId) =>
    setQuestions((qs) =>
      qs.map((q) => (q.id === qId ? { ...q, options: [...q.options, ""] } : q)),
    );
  const removeOption = (qId, oIdx) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId
          ? { ...q, options: q.options.filter((_, i) => i !== oIdx) }
          : q,
      ),
    );

  const handleClose = () => {
    setTitle("");
    setDesc("");
    setEndDate(new Date());
    setShowDatePicker(false);
    setError("");
    setQuestions([
      {
        id: Date.now(),
        question: "",
        type: "MULTIPLE_CHOICE",
        options: ["", ""],
      },
    ]);
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Survey title is required");
      return;
    }
    if (!endDate) {
      return;
    }

    // Clean up questions for backend
    const cleanedQuestions = questions.map((q) => {
      const cleaned = {
        question: q.question.trim(),
        type: q.type,
        options:
          q.type === "MULTIPLE_CHOICE"
            ? q.options.filter((o) => o.trim()).length > 0
              ? q.options.filter((o) => o.trim())
              : ["Option 1", "Option 2"]
            : null,
      };
      return cleaned;
    });

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
        questions: cleanedQuestions,
      });
      handleClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create survey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                    { backgroundColor: tint + "15" },
                  ]}
                >
                  <Feather name="clipboard" size={18} color={tint} />
                </View>
                <Text style={[styles.sheetTitle, { color: textColor }]}>
                  Create Survey
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
                  SURVEY TITLE
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
                  placeholder="e.g. Resident Satisfaction Survey"
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
                  placeholder="Brief description"
                  placeholderTextColor={muted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: muted }]}>
                  CLOSE DATE *
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
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

              {/* Questions */}
              <View style={[styles.divider, { backgroundColor: borderCol }]} />
              <Text
                style={[styles.inputLabel, { color: muted, marginBottom: 12 }]}
              >
                QUESTIONS
              </Text>

              {questions.map((q, qi) => (
                <View
                  key={q.id}
                  style={[
                    styles.questionBlock,
                    {
                      backgroundColor: isDark ? "#111111" : "#F8FAFC",
                      borderColor: borderCol,
                    },
                  ]}
                >
                  <View style={styles.questionBlockHeader}>
                    <View
                      style={[styles.qNum, { backgroundColor: tint + "20" }]}
                    >
                      <Text style={[styles.qNumText, { color: tint }]}>
                        Q{qi + 1}
                      </Text>
                    </View>
                    {questions.length > 1 && (
                      <TouchableOpacity onPress={() => removeQuestion(q.id)}>
                        <Feather name="trash-2" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark ? "#1A1A1A" : "#fff",
                        borderColor: inputBorder,
                        color: textColor,
                        marginBottom: 10,
                      },
                    ]}
                    value={q.question}
                    onChangeText={(v) => updateQuestion(q.id, "question", v)}
                    placeholder="Enter question text"
                    placeholderTextColor={muted}
                  />
                  {/* Question type */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 10 }}
                  >
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {QTYPES.map((t) => {
                        const active = q.type === t;
                        return (
                          <TouchableOpacity
                            key={t}
                            onPress={() => updateQuestion(q.id, "type", t)}
                            style={[
                              styles.qtypeChip,
                              {
                                backgroundColor: active
                                  ? tint + "20"
                                  : isDark
                                    ? "#252525"
                                    : "#F1F5F9",
                                borderColor: active ? tint : inputBorder,
                              },
                            ]}
                          >
                            <Feather
                              name={QTYPE_ICONS[t]}
                              size={10}
                              color={active ? tint : muted}
                            />
                            <Text
                              style={[
                                styles.qtypeText,
                                { color: active ? tint : muted },
                              ]}
                            >
                              {QTYPE_LABELS[t]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                  {/* Options for multiple choice */}
                  {q.type === "MULTIPLE_CHOICE" && (
                    <View style={{ gap: 6 }}>
                      {q.options.map((opt, oi) => (
                        <View key={oi} style={styles.optionRow}>
                          <TextInput
                            style={[
                              styles.optionInput,
                              {
                                backgroundColor: isDark ? "#1A1A1A" : "#fff",
                                borderColor: inputBorder,
                                color: textColor,
                              },
                            ]}
                            value={opt}
                            onChangeText={(v) => updateOption(q.id, oi, v)}
                            placeholder={`Option ${oi + 1}`}
                            placeholderTextColor={muted}
                          />
                          {q.options.length > 2 && (
                            <TouchableOpacity
                              onPress={() => removeOption(q.id, oi)}
                            >
                              <Feather
                                name="x-circle"
                                size={16}
                                color={muted}
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity
                        onPress={() => addOption(q.id)}
                        style={styles.addOptionBtn}
                      >
                        <Feather name="plus" size={13} color={tint} />
                        <Text style={[styles.addOptionText, { color: tint }]}>
                          Add option
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}

              <TouchableOpacity
                onPress={addQuestion}
                style={[
                  styles.addQuestionBtn,
                  { borderColor: tint + "50", backgroundColor: tint + "10" },
                ]}
              >
                <Feather name="plus-circle" size={15} color={tint} />
                <Text style={[styles.addQuestionText, { color: tint }]}>
                  Add Question
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
                  {loading ? "Creating..." : "Create Survey"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Date Picker — Android: native dialog rendered directly */}
        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={endDate}
            onChange={(_event, date) => {
              setShowDatePicker(false);
              if (date) setEndDate(date);
            }}
            mode="date"
            display="default"
            minimumDate={new Date()}
          />
        )}

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
export default function AdminSurveys() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const insets = useSafeAreaInsets();

  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { toast, showError, showSuccess, hideToast } = useToast();
  const url = config.backendUrl;

  useEffect(() => {
    getEnabledFeatures().then((feats) => {
      if (feats.length > 0 && !feats.includes("SURVEYS")) {
        router.replace("/admin");
      }
    });
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const [token, communityId] = await Promise.all([
        getToken(),
        getCommunityId(),
      ]);
      if (!communityId) {
        showError("Community information not found.");
        return;
      }
      const res = await axios.get(`${url}/admin/surveys`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { communityId },
      });
      const raw = res.data?.surveys ?? res.data?.data ?? res.data ?? [];
      setSurveys(Array.isArray(raw) ? raw : []);
    } catch (e) {
      showError("Failed to load surveys.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSurveys();
  };

  const handleCreate = async (data) => {
    const [token, communityId] = await Promise.all([
      getToken(),
      getCommunityId(),
    ]);
    if (!token) throw new Error("No token");
    await axios.post(
      `${url}/admin/surveys/`,
      { ...data, communityId },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    showSuccess("Survey created!");
    fetchSurveys();
  };

  const handleViewResults = (surveyId) => {
    router.push(`/admin/survey-results?id=${surveyId}`);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      await axios.delete(`${url}/admin/surveys/${deleteConfirmId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSurveys((prev) => prev.filter((s) => s.id !== deleteConfirmId));
      showSuccess("Survey deleted.");
    } catch (e) {
      showError("Failed to delete survey.");
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const tabs = [
    { key: "active", label: "Active", icon: "zap" },
    { key: "upcoming", label: "Upcoming", icon: "clock" },
    { key: "closed", label: "Closed", icon: "archive" },
    { key: "all", label: "All", icon: "grid" },
  ];

  const getFiltered = () => {
    if (activeTab === "all") return surveys;
    return surveys.filter(
      (s) => surveyStatus(s).label.toLowerCase() === activeTab,
    );
  };
  const filtered = getFiltered();

  const stats = {
    total: surveys.length,
    active: surveys.filter((s) => surveyStatus(s).label === "Active").length,
    upcoming: surveys.filter((s) => surveyStatus(s).label === "Upcoming")
      .length,
    closed: surveys.filter((s) => surveyStatus(s).label === "Closed").length,
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
        <Feather
          name="clipboard"
          size={32}
          color={tint}
          style={{ opacity: 0.5, marginBottom: 12 }}
        />
        <Text style={{ fontSize: 14, color: muted }}>Loading surveys...</Text>
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
              Surveys
            </Text>
            <Text style={[styles.headerSub, { color: muted }]}>
              {surveys.length} total
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
            onRefresh={handleRefresh}
            tintColor={tint}
          />
        }
      >
        <View style={styles.content}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {[
              {
                icon: "clipboard",
                label: "Total",
                value: stats.total,
                color: "#6366F1",
              },
              {
                icon: "zap",
                label: "Active",
                value: stats.active,
                color: "#10B981",
              },
              {
                icon: "clock",
                label: "Upcoming",
                value: stats.upcoming,
                color: "#8B5CF6",
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
                              : tint + "20",
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
                <Feather name="clipboard" size={16} color={tint} />
                <Text style={[styles.listHeaderTitle, { color: textColor }]}>
                  {activeTab === "all"
                    ? "All Surveys"
                    : `${tabs.find((t) => t.key === activeTab)?.label} Surveys`}
                </Text>
              </View>
              <Text style={[styles.listCount, { color: muted }]}>
                {filtered.length}
              </Text>
            </View>

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather
                  name="clipboard"
                  size={36}
                  color={muted}
                  style={{ opacity: 0.3 }}
                />
                <Text style={[styles.emptyText, { color: muted }]}>
                  No {activeTab} surveys
                </Text>
                {activeTab === "active" && (
                  <TouchableOpacity
                    style={[styles.emptyCreateBtn, { backgroundColor: tint }]}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <Feather name="plus" size={14} color="#fff" />
                    <Text style={styles.emptyCreateBtnText}>
                      Create First Survey
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {filtered.map((s) => (
                  <SurveyCard
                    key={s.id}
                    survey={s}
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

      <CreateSurveyModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        theme={theme}
        textColor={textColor}
        tint={tint}
        muted={muted}
        borderCol={borderCol}
      />

      <ConfirmModal
        visible={!!deleteConfirmId}
        title="Delete Survey"
        message="This will permanently delete the survey and all responses. This cannot be undone."
        confirmLabel="Delete"
        confirmColor="#EF4444"
        icon="trash-2"
        loading={deleting}
        onConfirm={confirmDelete}
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
  // Survey card
  surveyCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
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
  surveyBody: { padding: 14, gap: 12 },
  surveyTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  surveyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  surveyTitle: { fontSize: 14, fontWeight: "600" },
  surveyDesc: { fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusPillText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statItemValue: { fontSize: 18, fontWeight: "700" },
  statItemLabel: { fontSize: 11, fontWeight: "500" },
  statDivider: { width: 1 },
  surveyActions: { flexDirection: "row", gap: 8 },
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
  // Create modal
  questionBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  questionBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  qNum: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  qNumText: { fontSize: 12, fontWeight: "800" },
  qtypeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  qtypeText: { fontSize: 11, fontWeight: "600" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
  },
  addOptionText: { fontSize: 13, fontWeight: "600" },
  addQuestionBtn: {
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
  addQuestionText: { fontSize: 14, fontWeight: "600" },
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
