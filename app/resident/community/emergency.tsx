// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  Vibration,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";

import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { getCommunityId, getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";

type AlertStatus = "idle" | "confirming" | "sending" | "active";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmergencySOS() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const { toast, showError, showSuccess, hideToast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("idle");
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const [token, communityId] = await Promise.all([getToken(), getCommunityId()]);
      const u = user ?? (await getUser());
      if (!u?.id || !communityId) return;
      setLoadingHistory(true);
      const res = await axios.get(`${config.backendUrl}/emergency/alerts`, {
        params: { communityId, userId: u.id },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const raw = res.data?.alerts ?? res.data ?? [];
      setHistory(Array.isArray(raw) ? raw.slice(0, 10) : []);
    } catch {
      // history is non-critical — fail silently
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) loadHistory();
    }, [user, loadHistory]),
  );

  const sendSOS = async () => {
    setAlertStatus("sending");
    Vibration.vibrate([0, 200, 100, 200]);
    try {
      const [token, communityId] = await Promise.all([getToken(), getCommunityId()]);
      const res = await axios.post(
        `${config.backendUrl}/emergency/sos`,
        {
          communityId,
          userId: user?.id,
          userName: user?.name ?? "Resident",
          unitNumber: user?.unitNumber ?? user?.unit?.number ?? "",
          blockName: user?.blockName ?? user?.block?.name ?? "",
          message: "SOS — Immediate assistance required",
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      setActiveAlertId(res.data?.id ?? res.data?.alertId ?? null);
      setAlertStatus("active");
      showSuccess("SOS alert sent to admin and gatekeeper.");
      loadHistory();
    } catch {
      showError("Failed to send alert. Please call emergency services directly.");
      setAlertStatus("idle");
    }
  };

  const cancelSOS = async () => {
    if (!activeAlertId) {
      setAlertStatus("idle");
      return;
    }
    try {
      const token = await getToken();
      await axios.patch(
        `${config.backendUrl}/emergency/alerts/${activeAlertId}/cancel`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      showSuccess("Alert cancelled.");
    } catch {
      // cancel failure is non-critical
    } finally {
      setAlertStatus("idle");
      setActiveAlertId(null);
      loadHistory();
    }
  };

  const isActive = alertStatus === "active";
  const isSending = alertStatus === "sending";

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
            Emergency SOS
          </Text>
          <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>
            Alerts admin &amp; gatekeeper instantly
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 24,
          gap: 24,
          alignItems: "center",
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* User info chip */}
        {user && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: isDark ? "#1A1A1A" : "#F8FAFC",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: borderCol,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Feather name="user" size={14} color={muted} />
            <Text style={{ fontSize: 13, color: text, fontWeight: "600" }}>
              {user.name ?? "Resident"}
            </Text>
            {(user.blockName || user.block?.name || user.unitNumber || user.unit?.number) && (
              <>
                <Text style={{ color: muted }}>·</Text>
                <Text style={{ fontSize: 13, color: muted }}>
                  {[
                    user.blockName ?? user.block?.name
                      ? `Block ${user.blockName ?? user.block?.name}`
                      : null,
                    user.unitNumber ?? user.unit?.number
                      ? `Unit ${user.unitNumber ?? user.unit?.number}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </Text>
              </>
            )}
          </View>
        )}

        {/* SOS Button */}
        <View style={{ alignItems: "center", gap: 16 }}>
          <Pressable
            onPress={isActive ? cancelSOS : sendSOS}
            disabled={isSending}
            style={({ pressed }) => ({
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: isActive
                ? "#EF4444"
                : isSending
                  ? "#EF444480"
                  : "#EF4444",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#EF4444",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isActive ? 0.6 : 0.3,
              shadowRadius: isActive ? 30 : 12,
              elevation: 12,
              opacity: pressed ? 0.85 : 1,
              borderWidth: 4,
              borderColor: isActive ? "#fff" : "transparent",
            })}
          >
            {isSending ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Feather
                  name={isActive ? "x-circle" : "alert-octagon"}
                  size={52}
                  color="#fff"
                />
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "900",
                    color: "#fff",
                    marginTop: 8,
                    letterSpacing: 2,
                  }}
                >
                  {isActive ? "CANCEL" : "SOS"}
                </Text>
              </>
            )}
          </Pressable>

          <Text
            style={{
              fontSize: 13,
              color: isActive ? "#EF4444" : muted,
              textAlign: "center",
              fontWeight: isActive ? "700" : "400",
              maxWidth: 260,
            }}
          >
            {isSending
              ? "Sending alert…"
              : isActive
                ? "Alert is ACTIVE — admin and gatekeeper notified"
                : "Press to alert admin and gatekeeper immediately"}
          </Text>

          {alertStatus === "confirming" && (
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 8,
              }}
            >
              <Pressable
                onPress={() => setAlertStatus("idle")}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: borderCol,
                }}
              >
                <Text style={{ color: muted, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={sendSOS}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: "#EF4444",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Confirm</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Emergency contacts info */}
        <View
          style={{
            width: "100%",
            backgroundColor: cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: borderCol,
            padding: 16,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1 }}>
            What happens when you press SOS
          </Text>
          {[
            { icon: "bell", label: "Admin receives push notification instantly" },
            { icon: "shield", label: "On-duty gatekeeper is alerted" },
            { icon: "clock", label: "Timestamp and your unit info are logged" },
          ].map((item) => (
            <View key={item.icon} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: "#EF444415",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={item.icon} size={15} color="#EF4444" />
              </View>
              <Text style={{ fontSize: 13, color: muted, flex: 1 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Alert History */}
        <View style={{ width: "100%" }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: muted,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Recent Alerts
          </Text>
          {loadingHistory ? (
            <ActivityIndicator color="#EF4444" />
          ) : history.length === 0 ? (
            <Text style={{ fontSize: 13, color: muted, textAlign: "center", paddingVertical: 12 }}>
              No recent alerts
            </Text>
          ) : (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: borderCol,
                overflow: "hidden",
              }}
            >
              {history.map((a, idx) => {
                const isCancelled = a.status?.toUpperCase() === "CANCELLED";
                return (
                  <View
                    key={a.id ?? idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      gap: 12,
                      borderTopWidth: idx > 0 ? 1 : 0,
                      borderTopColor: borderCol,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: isCancelled ? "#94A3B815" : "#EF444415",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather
                        name={isCancelled ? "x-circle" : "alert-octagon"}
                        size={16}
                        color={isCancelled ? "#94A3B8" : "#EF4444"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: text }}>
                        SOS Alert
                      </Text>
                      <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                        {a.createdAt ? fmtTime(a.createdAt) : "—"}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: isCancelled ? "#94A3B815" : "#EF444415",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: isCancelled ? "#94A3B8" : "#EF4444",
                        }}
                      >
                        {isCancelled ? "CANCELLED" : "SENT"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
