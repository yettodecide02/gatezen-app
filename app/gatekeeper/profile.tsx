// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";

export default function GatekeeperProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  // Backend
  const backendUrl =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    process.env.EXPO_BACKEND_URL ||
    "http://localhost:3000";

  // Auth
  const [user, setUserState] = useState<any>(null);
  const [token, setTokenState] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

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

  const loadStats = useCallback(async () => {
    if (!token) return;

    setLoadingStats(true);
    try {
      const res = await axios.get(`${backendUrl}/gatekeeper/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data.today);
    } catch (e) {
      // Handle error silently, show default values
    } finally {
      setLoadingStats(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    if (token) {
      loadStats();
    }
  }, [token, loadStats]);

  const handleLogout = useCallback(async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove(["token", "user"]);
            router.replace("/login");
          } catch (e) {
            console.warn("Logout error", e);
          }
        },
      },
    ]);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top + 16 }}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 100, // Space for floating nav bar
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <Text style={{ color: text, fontSize: 24, fontWeight: "800" }}>
            Profile
          </Text>
          <Text style={{ color: icon as any, fontSize: 14, marginTop: 2 }}>
            Manage your gatekeeper account
          </Text>
        </View>

        {/* Profile Info */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <View style={{ alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#2563EB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="shield" size={32} color="#fff" />
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: text, fontSize: 20, fontWeight: "800" }}>
                {user?.name || "Gatekeeper"}
              </Text>
              <Text style={{ color: icon as any, fontSize: 14 }}>
                Security Personnel
              </Text>
              <Text style={{ color: icon as any, fontSize: 12, marginTop: 4 }}>
                ID: {user?.id || "GK001"}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <Text style={[styles.cardTitle, { color: text }]}>
              Today's Summary
            </Text>
            <TouchableOpacity onPress={loadStats} disabled={loadingStats}>
              {loadingStats ? (
                <ActivityIndicator size="small" color={icon as any} />
              ) : (
                <Feather name="refresh-cw" size={16} color={icon as any} />
              )}
            </TouchableOpacity>
          </View>

          {loadingStats ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator size="large" color={icon as any} />
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#10B981",
                      fontSize: 24,
                      fontWeight: "800",
                    }}
                  >
                    {stats?.checkedIn || 0}
                  </Text>
                  <Text style={{ color: icon as any, fontSize: 12 }}>
                    Checked In
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#F59E0B",
                      fontSize: 24,
                      fontWeight: "800",
                    }}
                  >
                    {stats?.pending || 0}
                  </Text>
                  <Text style={{ color: icon as any, fontSize: 12 }}>
                    Pending
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#6B7280",
                      fontSize: 24,
                      fontWeight: "800",
                    }}
                  >
                    {stats?.checkedOut || 0}
                  </Text>
                  <Text style={{ color: icon as any, fontSize: 12 }}>
                    Checked Out
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: border,
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{ color: text, fontSize: 20, fontWeight: "800" }}
                  >
                    {stats?.total || 0}
                  </Text>
                  <Text style={{ color: icon as any, fontSize: 12 }}>
                    Total Visitors
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Text style={[styles.cardTitle, { color: text }]}>Actions</Text>
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={[
                styles.actionItem,
                { borderBottomColor: border, borderBottomWidth: 1 },
              ]}
            >
              <Feather name="settings" size={20} color={icon as any} />
              <Text style={{ color: text, fontWeight: "600", flex: 1 }}>
                Settings
              </Text>
              <Feather name="chevron-right" size={16} color={icon as any} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionItem,
                { borderBottomColor: border, borderBottomWidth: 1 },
              ]}
            >
              <Feather name="help-circle" size={20} color={icon as any} />
              <Text style={{ color: text, fontWeight: "600", flex: 1 }}>
                Help & Support
              </Text>
              <Feather name="chevron-right" size={16} color={icon as any} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionItem,
                { borderBottomColor: border, borderBottomWidth: 1 },
              ]}
            >
              <Feather name="shield" size={20} color={icon as any} />
              <Text style={{ color: text, fontWeight: "600", flex: 1 }}>
                Security Guidelines
              </Text>
              <Feather name="chevron-right" size={16} color={icon as any} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.actionItem}>
              <Feather name="log-out" size={20} color="#EF4444" />
              <Text style={{ color: "#EF4444", fontWeight: "600", flex: 1 }}>
                Logout
              </Text>
              <Feather name="chevron-right" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Info */}
        <View style={{ alignItems: "center", paddingTop: 16 }}>
          <Text style={{ color: icon as any, fontSize: 12 }}>
            GateZen Gatekeeper v1.0.0
          </Text>
          <Text style={{ color: icon as any, fontSize: 10, marginTop: 4 }}>
            Security & Visitor Management
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
  },
});
