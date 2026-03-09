// @ts-nocheck
import React, { useCallback, useState } from "react";
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
  fetchResidentVehicles,
  createResidentVehicle,
  deleteResidentVehicle,
} from "@/lib/queries/resident";

const VEHICLE_TYPES = ["CAR", "BIKE", "TRUCK", "SUV", "VAN", "OTHER"];

const STATUS_CONFIG = {
  PENDING: { color: "#F59E0B", bg: "#FEF3C7", label: "Pending" },
  APPROVED: { color: "#10B981", bg: "#D1FAE5", label: "Approved" },
  REJECTED: { color: "#EF4444", bg: "#FEE2E2", label: "Rejected" },
};

const VEHICLE_ICONS: Record<string, string> = {
  CAR: "truck",
  BIKE: "wind",
  TRUCK: "truck",
  SUV: "truck",
  VAN: "truck",
  OTHER: "truck",
};

function statusCfg(s = "PENDING") {
  return STATUS_CONFIG[s.toUpperCase()] ?? STATUS_CONFIG.PENDING;
}

export default function MyVehicles() {
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
  const { user, token } = useAppContext();
  const queryClient = useQueryClient();
  const vehiclesKey = queryKeys.resident.vehicles(
    user?.id ?? "",
    user?.communityId ?? "",
  );

  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState("CAR");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [plateErr, setPlateErr] = useState("");

  const {
    data: vehicles = [],
    isLoading: loading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: vehiclesKey,
    queryFn: () =>
      fetchResidentVehicles(token, user!.id, user!.communityId as string),
    enabled: !!user?.id && !!user?.communityId,
    staleTime: 5 * 60 * 1000,
  });
  const refreshing = isFetching && !loading;

  const addMutation = useMutation({
    mutationFn: (payload: object) => createResidentVehicle(token, payload),
    onSuccess: () => {
      showSuccess("Vehicle submitted for approval.");
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: vehiclesKey });
    },
    onError: (e: any) =>
      showError(e?.response?.data?.error ?? "Failed to add vehicle."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteResidentVehicle(token, id),
    onSuccess: () => {
      showSuccess("Vehicle removed.");
      queryClient.invalidateQueries({ queryKey: vehiclesKey });
    },
    onError: () => showError("Failed to remove vehicle."),
    onSettled: () => setDeleting(null),
  });

  const resetForm = () => {
    setPlate("");
    setVehicleType("CAR");
    setBrand("");
    setModel("");
    setColor("");
    setPlateErr("");
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
              My Vehicles
            </Text>
            <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>
              {vehicles.length} registered
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
            Add
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
            gap: 12,
            paddingBottom: insets.bottom + 24,
          }}
        >
          {vehicles.length === 0 ? (
            <View
              style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: tint + "15",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="truck" size={32} color={tint} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>
                No vehicles registered
              </Text>
              <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
                Add your vehicle to speed up gate entry.
              </Text>
              <Pressable
                onPress={() => setShowModal(true)}
                style={{
                  marginTop: 4,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: tint,
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}
                >
                  Add Vehicle
                </Text>
              </Pressable>
            </View>
          ) : (
            vehicles.map((v) => {
              const sc = statusCfg(v.status);
              return (
                <View
                  key={v.id}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: borderCol,
                    padding: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: tint + "15",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather
                        name={VEHICLE_ICONS[v.vehicleType] ?? "truck"}
                        size={22}
                        color={tint}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "800",
                            color: text,
                            letterSpacing: 0.5,
                          }}
                        >
                          {v.plateNumber}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: 6,
                            backgroundColor: sc.bg,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: sc.color,
                            }}
                          >
                            {sc.label}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{ fontSize: 12, color: muted, marginTop: 2 }}
                      >
                        {[v.vehicleType, v.brand, v.model, v.color]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setDeleting(v.id);
                        deleteMutation.mutate(v.id);
                      }}
                      disabled={deleting === v.id}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: "#EF444415",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {deleting === v.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Feather name="trash-2" size={15} color="#EF4444" />
                      )}
                    </Pressable>
                  </View>
                  {v.status?.toUpperCase() === "REJECTED" &&
                    v.rejectionReason && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#EF4444",
                          marginTop: 8,
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: borderCol,
                        }}
                      >
                        Rejected: {v.rejectionReason}
                      </Text>
                    )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
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
              Add Vehicle
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
            {/* Plate */}
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
                Plate Number *
              </Text>
              <TextInput
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: plateErr ? "#EF4444" : borderCol,
                  padding: 12,
                  fontSize: 16,
                  color: text,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
                value={plate}
                onChangeText={(v) => {
                  setPlate(v.toUpperCase());
                  if (plateErr) setPlateErr("");
                }}
                placeholder="e.g. TN01AB1234"
                placeholderTextColor={muted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {!!plateErr && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
                  <Feather name="alert-circle" size={12} color="#EF4444" />
                  <Text style={{ fontSize: 12, color: "#EF4444" }}>{plateErr}</Text>
                </View>
              )}
            </View>

            {/* Type */}
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
                Vehicle Type
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {VEHICLE_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setVehicleType(t)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: vehicleType === t ? tint : borderCol,
                      backgroundColor:
                        vehicleType === t ? tint + "15" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: vehicleType === t ? tint : muted,
                      }}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Brand */}
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
                Brand
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
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g. Maruti, Hyundai"
                placeholderTextColor={muted}
              />
            </View>

            {/* Model */}
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
                Model
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
                value={model}
                onChangeText={setModel}
                placeholder="e.g. Swift, Creta"
                placeholderTextColor={muted}
              />
            </View>

            {/* Color */}
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
                Color
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
                value={color}
                onChangeText={setColor}
                placeholder="e.g. White, Silver"
                placeholderTextColor={muted}
              />
            </View>

            <Pressable
              onPress={() => {
                if (!plate.trim()) {
                  setPlateErr("Plate number is required");
                  return;
                }
                addMutation.mutate({
                  communityId: user?.communityId,
                  userId: user?.id,
                  plateNumber: plate.trim().toUpperCase(),
                  vehicleType,
                  brand: brand.trim(),
                  model: model.trim(),
                  color: color.trim(),
                });
              }}
              disabled={addMutation.isPending}
              style={{
                marginTop: 8,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: tint,
                alignItems: "center",
                opacity: addMutation.isPending ? 0.7 : 1,
              }}
            >
              {addMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}
                >
                  Submit for Approval
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
