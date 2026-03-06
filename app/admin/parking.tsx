// @ts-nocheck
import React, { useState } from "react";
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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { useAppContext } from "@/contexts/AppContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchAdminParking,
  createAdminParkingSpot,
  toggleAdminParkingSpot,
  deleteAdminParkingSpot,
} from "@/lib/queries/admin";

const SPOT_TYPES = ["2W", "4W", "EV"];
const TYPE_CFG = {
  "2W": { label: "2-Wheeler", color: "#10B981" },
  "4W": { label: "4-Wheeler", color: "#3B82F6" },
  EV: { label: "EV", color: "#8B5CF6" },
};

export default function AdminParking() {
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

  const { token, communityId } = useAppContext();
  const queryClient = useQueryClient();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // Form
  const [spotNumber, setSpotNumber] = useState("");
  const [spotType, setSpotType] = useState("4W");
  const [floor, setFloor] = useState("");
  const [block, setBlock] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");

  const {
    data: spotsRaw = [],
    isLoading: loading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.parking(communityId ?? ""),
    queryFn: () => fetchAdminParking(token, communityId),
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000,
  });
  const spots = Array.isArray(spotsRaw?.spots)
    ? spotsRaw.spots
    : Array.isArray(spotsRaw)
      ? spotsRaw
      : [];
  const refreshing = isFetching && !loading;

  const createMutation = useMutation({
    mutationFn: (payload) => createAdminParkingSpot(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.parking(communityId ?? ""),
      });
      showSuccess("Spot added.");
      setShowModal(false);
      resetForm();
    },
    onError: (e) =>
      showError(e?.response?.data?.error ?? "Failed to add spot."),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }) =>
      toggleAdminParkingSpot(token, id, isAvailable),
    onMutate: ({ id }) => setToggling(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.parking(communityId ?? ""),
      }),
    onError: () => showError("Failed to update."),
    onSettled: () => setToggling(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAdminParkingSpot(token, id),
    onMutate: (id) => setDeleting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.parking(communityId ?? ""),
      });
      showSuccess("Spot removed.");
    },
    onError: () => showError("Failed to delete."),
    onSettled: () => setDeleting(null),
  });

  const resetForm = () => {
    setSpotNumber("");
    setSpotType("4W");
    setFloor("");
    setBlock("");
    setPricePerDay("");
  };

  const handleAdd = () => {
    if (!spotNumber.trim()) {
      showError("Spot number is required.");
      return;
    }
    createMutation.mutate({
      communityId,
      spotNumber: spotNumber.trim(),
      spotType,
      floor: floor.trim() || null,
      block: block.trim() || null,
      pricePerDay: pricePerDay ? Number(pricePerDay) : null,
      isAvailable: true,
    });
  };

  const handleToggle = (id: string, current: boolean) => {
    toggleMutation.mutate({ id, isAvailable: !current });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const available = spots.filter((s) => s.isAvailable !== false).length;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: 14,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: borderCol,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
              Parking Spots
            </Text>
            <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>
              {available}/{spots.length} available
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setShowModal(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: tint,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
            Add Spot
          </Text>
        </Pressable>
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
              onRefresh={() => refetch()}
              tintColor={tint}
            />
          }
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            paddingBottom: insets.bottom + 24,
          }}
        >
          {spots.length === 0 ? (
            <View
              style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}
            >
              <Feather
                name="map-pin"
                size={32}
                color={muted}
                style={{ opacity: 0.3 }}
              />
              <Text style={{ fontSize: 15, color: muted }}>
                No parking spots configured
              </Text>
              <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
                Add spots so residents can book them.
              </Text>
            </View>
          ) : (
            spots.map((s) => {
              const tc = TYPE_CFG[s.spotType] ?? TYPE_CFG["4W"];
              const isAvail = s.isAvailable !== false;
              return (
                <View
                  key={s.id}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: borderCol,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: tc.color + "18",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="map-pin" size={20} color={tc.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 15, fontWeight: "700", color: text }}
                    >
                      Spot {s.spotNumber}
                    </Text>
                    <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                      {tc.label}
                      {s.floor ? ` · Floor ${s.floor}` : ""}
                      {s.block ? ` · Block ${s.block}` : ""}
                      {s.pricePerDay ? ` · ₹${s.pricePerDay}/day` : ""}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleToggle(s.id, isAvail)}
                    disabled={toggling === s.id}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: isAvail ? "#10B98120" : "#94A3B820",
                    }}
                  >
                    {toggling === s.id ? (
                      <ActivityIndicator size="small" color={muted} />
                    ) : (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: isAvail ? "#10B981" : "#94A3B8",
                        }}
                      >
                        {isAvail ? "OPEN" : "CLOSED"}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: "#EF444415",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {deleting === s.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add Spot Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowModal(false);
          resetForm();
        }}
      >
        <View style={{ flex: 1, backgroundColor: bg }}>
          <View
            style={{
              paddingTop: 20,
              paddingBottom: 14,
              paddingHorizontal: 20,
              borderBottomWidth: 1,
              borderBottomColor: borderCol,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
              Add Parking Spot
            </Text>
            <Pressable
              onPress={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              <Feather name="x" size={22} color={text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {[
              ["Spot Number *", spotNumber, setSpotNumber, "e.g. A-01", false],
              ["Floor", floor, setFloor, "e.g. B1, Ground", false],
              ["Block / Zone", block, setBlock, "e.g. Block A", false],
              [
                "Price per Day (₹)",
                pricePerDay,
                setPricePerDay,
                "e.g. 50",
                true,
              ],
            ].map(([label, val, setter, ph, numeric]) => (
              <View key={label} style={{ gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {label}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: fieldBg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: borderCol,
                    padding: 12,
                    fontSize: 14,
                    color: text,
                  }}
                  value={val}
                  onChangeText={setter}
                  placeholder={ph}
                  placeholderTextColor={muted}
                  keyboardType={numeric ? "numeric" : "default"}
                />
              </View>
            ))}

            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Type
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {SPOT_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setSpotType(t)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor:
                        spotType === t ? TYPE_CFG[t].color : borderCol,
                      backgroundColor:
                        spotType === t
                          ? TYPE_CFG[t].color + "15"
                          : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: spotType === t ? TYPE_CFG[t].color : muted,
                      }}
                    >
                      {TYPE_CFG[t].label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={handleAdd}
              disabled={createMutation.isPending}
              style={{
                marginTop: 8,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: tint,
                alignItems: "center",
                opacity: createMutation.isPending ? 0.7 : 1,
              }}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}
                >
                  Add Spot
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
