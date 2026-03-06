// @ts-nocheck
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";

import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { getCommunityId, getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";

const TASK_TYPES = [
  { key: "MAINTENANCE", label: "Maintenance", icon: "tool", color: "#8B5CF6" },
  { key: "CONTRACTOR",  label: "Contractor",  icon: "users", color: "#3B82F6" },
  { key: "SERVICE",     label: "Service",     icon: "settings", color: "#F59E0B" },
  { key: "CLEANING",   label: "Cleaning",    icon: "wind", color: "#14B8A6" },
  { key: "OTHER",       label: "Other",       icon: "more-horizontal", color: "#94A3B8" },
];

const STATUS_CFG = {
  PENDING:     { color: "#F59E0B", label: "Upcoming" },
  IN_PROGRESS: { color: "#3B82F6", label: "In Progress" },
  DONE:        { color: "#10B981", label: "Done" },
  CANCELLED:   { color: "#94A3B8", label: "Cancelled" },
};

function typeInfo(key = "OTHER") {
  return TASK_TYPES.find((t) => t.key === key) ?? TASK_TYPES[4];
}
function statusInfo(s = "PENDING") {
  return STATUS_CFG[s.toUpperCase()] ?? STATUS_CFG.PENDING;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function isOverdue(iso: string, status: string) {
  if (["DONE", "CANCELLED"].includes(status?.toUpperCase())) return false;
  return new Date(iso) < new Date();
}

export default function HomePlanner() {
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

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("MAINTENANCE");
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Filter
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "DONE">("ALL");

  const load = useCallback(async () => {
    try {
      const [token, communityId, user] = await Promise.all([getToken(), getCommunityId(), getUser()]);
      if (!user?.id || !communityId) return;
      const res = await axios.get(`${config.backendUrl}/home-planner`, {
        params: { communityId, userId: user.id },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const raw = res.data?.tasks ?? res.data ?? [];
      // Sort: upcoming first, then done
      const sorted = Array.isArray(raw) ? [...raw].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()) : [];
      setTasks(sorted);
    } catch { showError("Failed to load planner."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    if (filter === "ALL") return tasks;
    if (filter === "PENDING") return tasks.filter((t) => !["DONE", "CANCELLED"].includes(t.status?.toUpperCase()));
    return tasks.filter((t) => t.status?.toUpperCase() === "DONE");
  }, [tasks, filter]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setTaskType("MAINTENANCE"); setScheduledDate(new Date());
  };

  const handleAdd = async () => {
    if (!title.trim()) { showError("Please enter a title."); return; }
    setSaving(true);
    try {
      const [token, communityId, user] = await Promise.all([getToken(), getCommunityId(), getUser()]);
      await axios.post(`${config.backendUrl}/home-planner`,
        { communityId, userId: user?.id, title: title.trim(), description: description.trim(), taskType, scheduledDate: scheduledDate.toISOString() },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      showSuccess("Task added.");
      setShowModal(false); resetForm(); load();
    } catch (e) {
      showError(e?.response?.data?.error ?? "Failed to add task.");
    } finally { setSaving(false); }
  };

  const handleStatus = async (id: string, status: string) => {
    setActioning(id);
    try {
      const token = await getToken();
      await axios.patch(`${config.backendUrl}/home-planner/${id}`,
        { status },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      load();
    } catch { showError("Failed to update."); }
    finally { setActioning(null); }
  };

  const handleDelete = async (id: string) => {
    setActioning(id);
    try {
      const token = await getToken();
      await axios.delete(`${config.backendUrl}/home-planner/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      showSuccess("Task deleted.");
      load();
    } catch { showError("Failed to delete."); }
    finally { setActioning(null); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderCol, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
            <Feather name="arrow-left" size={18} color={text} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: text }}>Home Planner</Text>
            <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>{tasks.filter((t) => !["DONE","CANCELLED"].includes(t.status?.toUpperCase())).length} upcoming</Text>
          </View>
        </View>
        <Pressable onPress={() => setShowModal(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: tint, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Add</Text>
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        {(["ALL", "PENDING", "DONE"] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: filter === f ? tint : "transparent", borderWidth: 1, borderColor: filter === f ? tint : borderCol }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: filter === f ? "#fff" : muted }}>{f === "ALL" ? "All" : f === "PENDING" ? "Upcoming" : "Done"}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color={tint} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={tint} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
        >
          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
                <Feather name="calendar" size={32} color={tint} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>No tasks yet</Text>
              <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>Plan maintenance, contractor visits, and services.</Text>
            </View>
          ) : filtered.map((task) => {
            const ti = typeInfo(task.taskType);
            const si = statusInfo(task.status);
            const overdue = task.scheduledDate && isOverdue(task.scheduledDate, task.status);
            const isDone = task.status?.toUpperCase() === "DONE";
            return (
              <View key={task.id} style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: overdue ? "#EF444430" : borderCol, padding: 16, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: ti.color + "18", alignItems: "center", justifyContent: "center" }}>
                    <Feather name={ti.icon} size={20} color={ti.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: isDone ? muted : text, textDecorationLine: isDone ? "line-through" : "none" }}>
                        {task.title}
                      </Text>
                      <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: (overdue ? "#EF4444" : si.color) + "20" }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: overdue ? "#EF4444" : si.color }}>
                          {overdue ? "OVERDUE" : si.label.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {task.description ? <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>{task.description}</Text> : null}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
                      <Feather name="calendar" size={11} color={muted} />
                      <Text style={{ fontSize: 11, color: overdue ? "#EF4444" : muted }}>{task.scheduledDate ? fmtDate(task.scheduledDate) : "—"}</Text>
                      <Text style={{ color: muted }}>·</Text>
                      <Text style={{ fontSize: 11, color: ti.color }}>{ti.label}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => handleDelete(task.id)} disabled={actioning === task.id}
                    style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#EF444415", alignItems: "center", justifyContent: "center" }}
                  >
                    {actioning === task.id ? <ActivityIndicator size="small" color="#EF4444" /> : <Feather name="trash-2" size={13} color="#EF4444" />}
                  </Pressable>
                </View>

                {!isDone && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable onPress={() => handleStatus(task.id, "CANCELLED")} disabled={!!actioning}
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: borderCol, alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: muted }}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={() => handleStatus(task.id, "DONE")} disabled={!!actioning}
                      style={{ flex: 2, paddingVertical: 8, borderRadius: 10, backgroundColor: "#10B98115", alignItems: "center" }}
                    >
                      {actioning === task.id ? <ActivityIndicator size="small" color="#10B981" /> : <Text style={{ fontSize: 12, fontWeight: "700", color: "#10B981" }}>Mark Done</Text>}
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowModal(false); resetForm(); }}>
        <View style={{ flex: 1, backgroundColor: bg }}>
          <View style={{ paddingTop: 20, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderCol, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Add Task</Text>
            <Pressable onPress={() => { setShowModal(false); resetForm(); }}><Feather name="x" size={22} color={text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {/* Title */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Title *</Text>
              <TextInput style={{ backgroundColor: fieldBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 12, fontSize: 14, color: text }} value={title} onChangeText={setTitle} placeholder="e.g. Plumbing repair" placeholderTextColor={muted} />
            </View>

            {/* Description */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Description</Text>
              <TextInput style={{ backgroundColor: fieldBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 12, fontSize: 14, color: text, minHeight: 72, textAlignVertical: "top" }} value={description} onChangeText={setDescription} placeholder="Details…" placeholderTextColor={muted} multiline />
            </View>

            {/* Type */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Type</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {TASK_TYPES.map((t) => (
                  <Pressable key={t.key} onPress={() => setTaskType(t.key)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: taskType === t.key ? t.color : borderCol, backgroundColor: taskType === t.key ? t.color + "15" : "transparent" }}
                  >
                    <Feather name={t.icon} size={13} color={taskType === t.key ? t.color : muted} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: taskType === t.key ? t.color : muted }}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Date */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Scheduled Date</Text>
              <Pressable onPress={() => setShowDatePicker(true)} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: fieldBg, borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 12 }}>
                <Feather name="calendar" size={15} color={muted} />
                <Text style={{ fontSize: 14, color: text }}>{fmtDate(scheduledDate.toISOString())}</Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker value={scheduledDate} mode="date" minimumDate={new Date()}
                  onChange={(e, d) => { setShowDatePicker(false); if (e.type === "set" && d) setScheduledDate(d); }}
                />
              )}
            </View>

            <Pressable onPress={handleAdd} disabled={saving} style={{ marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: tint, alignItems: "center", opacity: saving ? 0.7 : 1 }}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Add Task</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
