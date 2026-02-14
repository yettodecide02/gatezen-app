// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import axios from "axios";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";

const STATUS_LABEL: any = {
  pending: "Pending",
  cancelled: "Cancelled",
  checked_in: "Checked In",
  checked_out: "Checked Out",
};

function StatusChip({ status }: any) {
  const key = (status || "pending").toLowerCase();
  const map: any = {
    pending: {
      bg: "#fffbeb",
      clr: "#92400e",
      br: "#fde68a",
      icon: <Feather name="clock" size={14} color="#92400e" />,
    },
    cancelled: {
      bg: "#fef2f2",
      clr: "#991b1b",
      br: "#fecaca",
      icon: <Feather name="x-circle" size={14} color="#991b1b" />,
    },
    checked_in: {
      bg: "#eff6ff",
      clr: "#1e40af",
      br: "#bfdbfe",
      icon: <Feather name="log-in" size={14} color="#1e40af" />,
    },
    checked_out: {
      bg: "#f3f4f6",
      clr: "#374151",
      br: "#d1d5db",
      icon: <Feather name="log-out" size={14} color="#374151" />,
    },
  };
  const s = map[key] || map.pending;
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
      <Text style={{ color: s.clr, fontWeight: "700" }}>
        {STATUS_LABEL[key] || status}
      </Text>
    </View>
  );
}

export default function GatekeeperVisitorsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  // Backend
  const backendUrl = config.backendUrl;

  // Auth
  const [user, setUserState] = useState<any>(null);
  const [token, setTokenState] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        setTokenState(t);
        setUserState(u || { id: "g1", name: "Gatekeeper", role: "GATEKEEPER" });
      } catch {
        setUserState({ id: "g1", name: "Gatekeeper", role: "GATEKEEPER" });
      }
    })();
  }, []);

  // Data
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/gatekeeper`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setVisitors(list);
    } catch (e) {
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const updateVisitorStatus = useCallback(
    async (visitorId: string, newStatus: string) => {
      try {
        const res = await axios.post(
          `${backendUrl}/gatekeeper`,
          { id: visitorId, status: newStatus },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );
        const updated = res.data;
        setVisitors((prev) =>
          prev.map((v) => (v.id === visitorId ? updated : v)),
        );
        showToast(`Visitor ${newStatus}`);
      } catch (e: any) {
        Alert.alert("Error", e?.response?.data?.error || "Failed to update");
      }
    },
    [backendUrl, token, showToast],
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top + 16 }}>
      {toast ? (
        <View
          style={{
            position: "absolute",
            top: insets.top + 20,
            alignSelf: "center",
            backgroundColor: theme === "dark" ? "#0B0B0B" : "#111827",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            zIndex: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>{toast}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 100, // Space for floating nav bar
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ color: text, fontSize: 24, fontWeight: "800" }}>
              Visitor Management
            </Text>
            <Text style={{ color: icon as any, fontSize: 14, marginTop: 2 }}>
              Monitor and manage visitor access
            </Text>
          </View>
          <TouchableOpacity
            onPress={load}
            style={[
              styles.refreshBtn,
              {
                borderColor: border,
                backgroundColor: theme === "dark" ? "#1F1F1F" : "#F9FAFB",
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={icon as any} />
            ) : (
              <Feather name="refresh-cw" size={20} color={icon as any} />
            )}
          </TouchableOpacity>
        </View>

        {/* Visitors List */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Text style={[styles.cardTitle, { color: text }]}>
            Today's Visitors
          </Text>
          {loading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : visitors.length === 0 ? (
            <Text style={{ color: icon as any }}>No visitors today.</Text>
          ) : (
            <View style={{ gap: 16 }}>
              {visitors.map((visitor) => (
                <View
                  key={visitor.id}
                  style={[
                    styles.visitorCard,
                    {
                      borderColor: border,
                      backgroundColor: theme === "dark" ? "#1A1A1A" : "#FAFAFA",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: theme === "dark" ? 0.3 : 0.1,
                      shadowRadius: 6,
                      elevation: 3,
                    },
                  ]}
                >
                  {/* Header Row */}
                  <View style={styles.visitorHeader}>
                    {/* Name & Status Section */}
                    <View style={styles.nameSection}>
                      <Text style={[styles.visitorName, { color: text }]}>
                        {visitor.name}
                      </Text>
                      <StatusChip status={visitor.status?.toLowerCase()} />
                    </View>

                    {/* Action Buttons Section */}
                    <View style={styles.actionSection}>
                      {visitor.status === "pending" ? (
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            onPress={() =>
                              updateVisitorStatus(visitor.id, "checked_in")
                            }
                            style={[styles.actionBtn, styles.approveBtn]}
                          >
                            <Feather name="check" size={16} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              updateVisitorStatus(visitor.id, "cancelled")
                            }
                            style={[styles.actionBtn, styles.rejectBtn]}
                          >
                            <Feather name="x" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : visitor.status === "checked_in" ? (
                        <TouchableOpacity
                          onPress={() =>
                            updateVisitorStatus(visitor.id, "checked_out")
                          }
                          style={[styles.checkoutBtn, { borderColor: border }]}
                        >
                          <Feather name="log-out" size={16} color={text} />
                          <Text style={[styles.checkoutText, { color: text }]}>
                            Check Out
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* Details Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <Feather name="user" size={14} color={icon as any} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.detailLabel, { color: icon as any }]}
                        >
                          Visiting
                        </Text>
                        <Text style={[styles.detailValue, { color: text }]}>
                          {visitor.hostName || "Unknown Host"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <Feather name="home" size={14} color={icon as any} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.detailLabel, { color: icon as any }]}
                        >
                          Unit
                        </Text>
                        <Text style={[styles.detailValue, { color: text }]}>
                          {visitor.unitNumber || "—"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <Feather
                          name="clipboard"
                          size={14}
                          color={icon as any}
                        />
                      </View>
                      <View style={{ flex: 1 }} key={visitor.id + "-type"}>
                        <Text
                          style={[styles.detailLabel, { color: icon as any }]}
                        >
                          Type
                        </Text>
                        <Text style={[styles.detailValue, { color: text }]}>
                          {visitor.type || "General visit"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }} key={visitor.id + "-purpose"}>
                        <Text
                          style={[styles.detailLabel, { color: icon as any }]}
                        >
                          Purpose
                        </Text>
                        <Text style={[styles.detailValue, { color: text }]}>
                          {visitor.purpose || "General visit"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <Feather name="clock" size={14} color={icon as any} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.detailLabel, { color: icon as any }]}
                        >
                          Expected Time
                        </Text>
                        <Text style={[styles.detailValue, { color: text }]}>
                          {new Date(
                            visitor.visitDate || visitor.createdAt,
                          ).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  btnPrimary: { backgroundColor: "#2563EB" },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1 },
  visitorCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  visitorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    minHeight: 60, // Increased height for name + status
  },
  nameSection: {
    flex: 1,
    gap: 8,
    justifyContent: "flex-start",
  },
  visitorName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
    lineHeight: 24,
  },
  actionSection: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  approveBtn: {
    backgroundColor: "#10B981",
  },
  rejectBtn: {
    backgroundColor: "#EF4444",
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  checkoutText: {
    fontWeight: "700",
    fontSize: 14,
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
});
