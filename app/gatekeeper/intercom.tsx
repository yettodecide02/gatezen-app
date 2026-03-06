// @ts-nocheck
import React, { useMemo, useState } from "react";
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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { useAppContext } from "@/contexts/AppContext";
import { queryKeys } from "@/lib/queryKeys";
import { fetchGatekeeperDirectory } from "@/lib/queries/gatekeeper";
import { generateCallId } from "@/lib/intercom";

const AVATAR_COLORS = [
  "#6366F1",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];
function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function getInitials(name = "") {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default function GatekeeperIntercom() {
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
  const [query, setQuery] = useState("");

  const { user, token } = useAppContext();
  const communityId = user?.communityId ?? "";

  const {
    data: residents = [],
    isLoading: loading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: queryKeys.gatekeeper.directory(communityId),
    queryFn: () => fetchGatekeeperDirectory(token, communityId),
    enabled: !!communityId,
    staleTime: 10 * 60 * 1000,
  });
  const refreshing = isFetching && !loading;
  const handleRefresh = () => refetch();

  const filtered = useMemo(() => {
    if (!query.trim()) return residents;
    const q = query.toLowerCase();
    return residents.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        String(r.unitNumber ?? r.unit?.number ?? "").includes(q) ||
        (r.blockName ?? r.block?.name ?? "").toLowerCase().includes(q),
    );
  }, [residents, query]);

  const handleCall = (resident: any) => {
    const unit = resident.unitNumber ?? resident.unit?.number ?? "";
    const block = resident.blockName ?? resident.block?.name ?? "";
    router.push({
      pathname: "/intercom/call",
      params: {
        mode: "outgoing",
        callId: generateCallId(),
        callType: "G2R",
        peerId: resident.id,
        peerName: resident.name ?? "Resident",
        peerUnit: unit,
        peerBlock: block,
      },
    });
  };

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
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: text }}>
          e-Intercom
        </Text>
        <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
          {residents.length} resident{residents.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Search */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: borderCol,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: fieldBg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: query ? tint : borderCol,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Feather name="search" size={15} color={muted} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: text }}
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, unit or block…"
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
              onRefresh={handleRefresh}
              tintColor={tint}
            />
          }
          contentContainerStyle={{ padding: 16, gap: 8 }}
        >
          {filtered.length === 0 ? (
            <View
              style={{
                padding: 40,
                alignItems: "center",
                backgroundColor: cardBg,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: borderCol,
                gap: 10,
              }}
            >
              <Feather
                name="users"
                size={32}
                color={muted}
                style={{ opacity: 0.3 }}
              />
              <Text style={{ fontSize: 15, fontWeight: "600", color: text }}>
                No residents found
              </Text>
              <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
                {query
                  ? `No results for "${query}"`
                  : "The directory is empty."}
              </Text>
            </View>
          ) : (
            filtered.map((r, idx) => {
              const unit = r.unitNumber ?? r.unit?.number;
              const block = r.blockName ?? r.block?.name;
              const color = avatarColor(r.name ?? "");
              return (
                <View
                  key={r.id ?? r.email ?? idx}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: borderCol,
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    gap: 12,
                  }}
                >
                  {/* Avatar */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: color + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color }}>
                      {getInitials(r.name ?? "")}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: "600", color: text }}
                      numberOfLines={1}
                    >
                      {r.name ?? "Resident"}
                    </Text>
                    {(block || unit) && (
                      <Text
                        style={{ fontSize: 12, color: muted, marginTop: 2 }}
                      >
                        {[
                          block ? `Block ${block}` : null,
                          unit ? `Unit ${unit}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    )}
                  </View>

                  {/* Call button */}
                  <Pressable
                    onPress={() => handleCall(r)}
                    style={({ pressed }) => ({
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "#10B98115",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Feather name="phone" size={18} color="#10B981" />
                  </Pressable>
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
