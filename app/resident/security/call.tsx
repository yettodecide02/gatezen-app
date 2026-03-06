// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import axios from "axios";

import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { getCommunityId, getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { generateCallId } from "@/lib/intercom";

const AVATAR_COLORS = [
  "#6366F1", "#3B82F6", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
];
function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function getInitials(name = "") {
  return (
    name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"
  );
}

function navigateToCall(opts: {
  callType: "R2G" | "R2R";
  peerId: string;
  peerName: string;
  peerUnit?: string;
  peerBlock?: string;
}) {
  router.push({
    pathname: "/intercom/call",
    params: {
      mode: "outgoing",
      callId: generateCallId(),
      callType: opts.callType,
      peerId: opts.peerId,
      peerName: opts.peerName,
      peerUnit: opts.peerUnit ?? "",
      peerBlock: opts.peerBlock ?? "",
    },
  });
}

export default function ResidentIntercom() {
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

  const { toast, showError, hideToast } = useToast();

  const [gatekeeper, setGatekeeper] = useState<{ id: string; name: string } | null>(null);
  const [loadingGK, setLoadingGK] = useState(true);
  const [residents, setResidents] = useState<any[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const loadData = useCallback(async () => {
    const [token, communityId] = await Promise.all([getToken(), getCommunityId()]);
    if (!communityId) return;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Fetch on-duty gatekeeper
    setLoadingGK(true);
    axios
      .get(`${config.backendUrl}/intercom/gatekeeper`, {
        params: { communityId },
        headers,
      })
      .then((res) => {
        const gk = res.data?.gatekeeper ?? res.data;
        if (gk?.id && gk?.name) setGatekeeper(gk);
      })
      .catch(() => setGatekeeper(null))
      .finally(() => setLoadingGK(false));

    // Fetch resident directory for R2R
    setLoadingRes(true);
    axios
      .get(`${config.backendUrl}/resident/directory`, {
        params: { communityId },
        headers,
      })
      .then((res) => {
        const raw = res.data?.residents ?? res.data?.data ?? res.data ?? [];
        setResidents(Array.isArray(raw) ? raw : []);
      })
      .catch(() => showError("Failed to load residents."))
      .finally(() => {
        setLoadingRes(false);
        setRefreshing(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter residents for R2R (exclude self)
  const filtered = useMemo(() => {
    if (!query.trim()) return residents;
    const q = query.toLowerCase();
    return residents.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        String(r.unitNumber ?? r.unit?.number ?? "").includes(q),
    );
  }, [residents, query]);

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
            e-Intercom
          </Text>
          <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>
            In-app calling
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={tint}
          />
        }
        contentContainerStyle={{ padding: 16, gap: 20 }}
      >
        {/* ── R2G: Call Gatekeeper ─────────────────────────────────── */}
        <View>
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
            Call Gatekeeper
          </Text>

          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: borderCol,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#3B82F620",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="shield" size={22} color="#3B82F6" />
            </View>

            <View style={{ flex: 1 }}>
              {loadingGK ? (
                <ActivityIndicator size="small" color={tint} />
              ) : gatekeeper ? (
                <>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: text }}>
                    {gatekeeper.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                    On-duty gatekeeper
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 14, color: muted }}>
                  No gatekeeper available
                </Text>
              )}
            </View>

            {gatekeeper && (
              <Pressable
                onPress={() =>
                  navigateToCall({
                    callType: "R2G",
                    peerId: gatekeeper.id,
                    peerName: gatekeeper.name,
                  })
                }
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#10B98115",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Feather name="phone" size={20} color="#10B981" />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── R2R: Call a Resident ─────────────────────────────────── */}
        <View>
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
            Call a Resident
          </Text>

          {/* Search */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: fieldBg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: borderCol,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 12,
            }}
          >
            <Feather name="search" size={15} color={muted} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: text }}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or unit…"
              placeholderTextColor={muted}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <Feather name="x-circle" size={15} color={muted} />
              </Pressable>
            )}
          </View>

          {loadingRes ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator color={tint} />
            </View>
          ) : filtered.length === 0 ? (
            <View
              style={{
                padding: 32,
                alignItems: "center",
                backgroundColor: cardBg,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: borderCol,
                gap: 8,
              }}
            >
              <Feather name="users" size={28} color={muted} style={{ opacity: 0.4 }} />
              <Text style={{ fontSize: 14, color: muted }}>No residents found</Text>
            </View>
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
              {filtered.map((r, idx) => {
                const unit = r.unitNumber ?? r.unit?.number;
                const block = r.blockName ?? r.block?.name;
                const color = avatarColor(r.name ?? "");
                return (
                  <Pressable
                    key={r.id ?? r.email ?? idx}
                    onPress={() =>
                      navigateToCall({
                        callType: "R2R",
                        peerId: r.id,
                        peerName: r.name ?? "Resident",
                        peerUnit: unit ?? "",
                        peerBlock: block ?? "",
                      })
                    }
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      gap: 12,
                      borderTopWidth: idx > 0 ? 1 : 0,
                      borderTopColor: borderCol,
                      backgroundColor: pressed
                        ? isDark ? "#222" : "#F8FAFC"
                        : "transparent",
                    })}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: color + "20",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color }}>
                        {getInitials(r.name ?? "")}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: text }}>
                        {r.name ?? "Resident"}
                      </Text>
                      {(block || unit) && (
                        <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                          {[block ? `Block ${block}` : null, unit ? `Unit ${unit}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      )}
                    </View>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#10B98115",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="phone" size={16} color="#10B981" />
                    </View>
                  </Pressable>
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
