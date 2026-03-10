// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useAppContext } from "@/contexts/AppContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchGatekeeperPackages,
  fetchGatekeeperResidents,
  createGatekeeperPackage,
  updateGatekeeperPackage,
} from "@/lib/queries/gatekeeper";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const PKG_STATUS = {
  pending: { color: "#F59E0B", label: "PNDG" },
  collected: { color: "#10B981", label: "CLTD" },
  picked: { color: "#10B981", label: "CLTD" },
};

const EMPTY_ARRAY: any[] = [];

export default function GatekeeperPackages() {
  const router = useRouter();
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const fieldBg = isDark ? "#111111" : "#F8FAFC";

  const { toast, showError, showSuccess, hideToast } = useToast();
  const { user, token, enabledFeatures } = useAppContext();
  const queryClient = useQueryClient();
  const communityId = user?.communityId ?? "";

  const [allPackages, setAllPackages] = useState([]);
  const [packages, setPackages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showResPicker, setShowResPicker] = useState(false);
  const [newPkg, setNewPkg] = useState({ userId: "", name: "", image: "" });
  const [selectedBlock, setSelectedBlock] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editPkg, setEditPkg] = useState({
    id: "",
    userId: "",
    name: "",
    image: "",
  });
  const [showImageSource, setShowImageSource] = useState(false);
  const [updating2, setUpdating2] = useState(false);
  const [resSearch, setResSearch] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [editNameErr, setEditNameErr] = useState("");
  const imageCallbackRef = useRef(null);

  // Feature guard
  useEffect(() => {
    if (
      enabledFeatures.length > 0 &&
      !enabledFeatures.includes("DELIVERY_MANAGEMENT")
    ) {
      router.replace("/gatekeeper");
    }
  }, [enabledFeatures]);

  const packagesKey = queryKeys.gatekeeper.packages(communityId);
  const residentsKey = queryKeys.gatekeeper.residents(communityId);

  const { data: rawPackages = EMPTY_ARRAY, isLoading: loading } = useQuery({
    queryKey: packagesKey,
    queryFn: () => fetchGatekeeperPackages(token, communityId),
    enabled: !!communityId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: residents = EMPTY_ARRAY } = useQuery({
    queryKey: residentsKey,
    queryFn: () => fetchGatekeeperResidents(token, communityId),
    enabled: !!communityId,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    setAllPackages(rawPackages);
    setPackages(rawPackages);
    const uniqueBlocks = [
      ...new Set(
        rawPackages.map((p: any) => p.user?.unit?.block?.name).filter(Boolean),
      ),
    ];
    setBlocks(uniqueBlocks as string[]);
  }, [rawPackages]);

  useEffect(() => {
    if (!selectedBlock) {
      setPackages(allPackages);
      return;
    }
    setPackages(
      allPackages.filter(
        (p: any) => p.user?.unit?.block?.name === selectedBlock,
      ),
    );
  }, [selectedBlock, allPackages]);

  const createMutation = useMutation({
    mutationFn: (payload: object) => createGatekeeperPackage(token, payload),
    onSuccess: () => {
      showSuccess("Package logged!");
      setNewPkg({ userId: "", name: "", image: "" });
      setNameErr("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: packagesKey });
    },
    onError: () => showError("Failed to create package"),
    onSettled: () => setSubmitting(false),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: object }) =>
      updateGatekeeperPackage(token, id, payload),
    onSuccess: () => {
      showSuccess("Package updated!");
      setEditNameErr("");
      setShowEdit(false);
      queryClient.invalidateQueries({ queryKey: packagesKey });
    },
    onError: () => showError("Failed to update package"),
    onSettled: () => setUpdating2(false),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateGatekeeperPackage(token, id, { status }),
    onSuccess: (_data: any, vars: any) => {
      showSuccess(`Marked as ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: packagesKey });
    },
    onError: () => showError("Failed to update status"),
    onSettled: () => setUpdating(null),
  });

  const openImagePicker = (callback) => {
    imageCallbackRef.current = callback;
    setShowImageSource(true);
  };

  const pickFromGallery = async () => {
    setShowImageSource(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showError("Gallery permission required");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      imageCallbackRef.current?.(base64);
    }
  };

  const pickFromCamera = async () => {
    setShowImageSource(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showError("Camera permission required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      imageCallbackRef.current?.(base64);
    }
  };

  const createPackage = () => {
    if (!newPkg.userId) {
      showError("Please select a resident");
      return;
    }
    if (!newPkg.image) {
      showError("Please upload an image");
      return;
    }
    if (!newPkg.name.trim()) {
      setNameErr("Package name is required");
      return;
    }
    setNameErr("");
    setSubmitting(true);
    createMutation.mutate({
      userId: newPkg.userId,
      communityId,
      image: newPkg.image,
      name: newPkg.name.trim(),
    });
  };

  const updatePackageDetails = () => {
    if (!editPkg.userId) {
      showError("Please select a resident");
      return;
    }
    if (!editPkg.name.trim()) {
      setEditNameErr("Package name is required");
      return;
    }
    setEditNameErr("");
    setUpdating2(true);
    editMutation.mutate({
      id: editPkg.id,
      payload: {
        userId: editPkg.userId,
        name: editPkg.name.trim(),
        image: editPkg.image || undefined,
      },
    });
  };

  const updateStatus = (id: string, status: string) => {
    setUpdating(id);
    statusMutation.mutate({ id, status });
  };

  const selectedResName =
    residents.find((r) => r.id === newPkg.userId)?.name || "";

  const filteredResidents = resSearch.trim()
    ? residents.filter((r) => {
        const q = resSearch.trim().toLowerCase();
        return (
          r.name?.toLowerCase().includes(q) ||
          r.unit?.number?.toString().toLowerCase().includes(q) ||
          r.unit?.block?.name?.toLowerCase().includes(q)
        );
      })
    : residents;

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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: text }}>
              Packages
            </Text>
            <Text style={{ fontSize: 13, color: muted }}>
              {packages.length} package{packages.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowCreate(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: tint,
            }}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>
              Log Package
            </Text>
          </Pressable>
        </View>
        {/* Block filter chips */}
        {blocks.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ gap: 6 }}
          >
            {["", ...blocks].map((b) => (
              <Pressable
                key={b || "__all"}
                onPress={() => setSelectedBlock(b)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: selectedBlock === b ? tint : borderCol,
                  backgroundColor:
                    selectedBlock === b ? tint + "18" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: selectedBlock === b ? tint : muted,
                  }}
                >
                  {b || "All Blocks"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={tint} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            paddingBottom: insets.bottom + 24,
          }}
        >
          {packages.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#F59E0B15",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="package" size={24} color="#F59E0B" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>
                No Packages
              </Text>
              <Text style={{ fontSize: 13, color: muted }}>
                No package records found.
              </Text>
            </View>
          ) : (
            packages.map((p) => {
              const key = (p.status || "pending").toLowerCase();
              const sc = PKG_STATUS[key] || PKG_STATUS.pending;
              const resident = p.user;
              return (
                <View
                  key={p.id}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: borderCol,
                    overflow: "hidden",
                  }}
                >
                  <View style={{ flexDirection: "row", padding: 14, gap: 10 }}>
                    {p.image ? (
                      <Image
                        source={{ uri: p.image }}
                        style={{ width: 48, height: 48, borderRadius: 10 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 10,
                          backgroundColor: "#F59E0B18",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="package" size={20} color="#F59E0B" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: text,
                          }}
                        >
                          {p.name || "Package"}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                            backgroundColor: sc.color + "20",
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
                      {resident && (
                        <Text
                          style={{ fontSize: 12, color: muted, marginTop: 2 }}
                        >
                          {resident.name}
                          {resident.unit?.number
                            ? ` · Unit ${resident.unit.number}`
                            : ""}
                          {resident.unit?.block?.name
                            ? ` · ${resident.unit.block.name}`
                            : ""}
                        </Text>
                      )}
                      {p.createdAt && (
                        <Text style={{ fontSize: 11, color: muted }}>
                          {new Date(p.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 14,
                      paddingBottom: 12,
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        setEditPkg({
                          id: p.id,
                          userId: p.user?.id || "",
                          name: p.name || "",
                          image: p.image || "",
                        });
                        setShowEdit(true);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: borderCol,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: muted,
                        }}
                      >
                        Edit
                      </Text>
                    </Pressable>
                    {key === "pending" && (
                      <Pressable
                        onPress={() => updateStatus(p.id, "collected")}
                        disabled={updating === p.id}
                        style={{
                          flex: 2,
                          paddingVertical: 9,
                          borderRadius: 10,
                          backgroundColor: tint,
                          alignItems: "center",
                        }}
                      >
                        {updating === p.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: "#fff",
                            }}
                          >
                            Mark Collected
                          </Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Create modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <ScrollView
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "80%",
              paddingHorizontal: 20,
              paddingTop: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
                Log Incoming Package
              </Text>
              <Pressable
                onPress={() => setShowCreate(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: borderCol,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={16} color={text} />
              </Pressable>
            </View>

            {/* Resident picker */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              >
                Resident *
              </Text>
              <Pressable
                onPress={() => setShowResPicker(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: fieldBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: borderCol,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: selectedResName ? text : muted,
                  }}
                >
                  {selectedResName || "Select resident"}
                </Text>
                <Feather name="chevron-down" size={16} color={muted} />
              </Pressable>
            </View>

            {/* Package name */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              >
                Package Name *
              </Text>
              <TextInput
                value={newPkg.name}
                onChangeText={(v) => {
                  setNewPkg((prev) => ({ ...prev, name: v }));
                  if (nameErr) setNameErr("");
                }}
                placeholder="e.g. Amazon parcel"
                placeholderTextColor={muted}
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: nameErr ? "#EF4444" : borderCol,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: text,
                }}
              />
              {!!nameErr && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Feather name="alert-circle" size={12} color="#EF4444" />
                  <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "500" }}>{nameErr}</Text>
                </View>
              )}
            </View>

            {/* Image upload */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              >
                Package Photo *
              </Text>
              {newPkg.image ? (
                <View style={{ position: "relative" }}>
                  <Pressable
                    onPress={() =>
                      openImagePicker((b64) =>
                        setNewPkg((prev) => ({ ...prev, image: b64 })),
                      )
                    }
                  >
                    <Image
                      source={{ uri: newPkg.image }}
                      style={{ width: "100%", height: 140, borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setNewPkg((prev) => ({ ...prev, image: "" }))
                    }
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="x" size={14} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() =>
                    openImagePicker((b64) =>
                      setNewPkg((prev) => ({ ...prev, image: b64 })),
                    )
                  }
                  style={{
                    height: 100,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: borderCol,
                    borderStyle: "dashed",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Feather name="camera" size={20} color={muted} />
                  <Text style={{ fontSize: 12, color: muted }}>
                    Tap to upload photo
                  </Text>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={createPackage}
              disabled={submitting}
              style={({ pressed }) => ({
                backgroundColor: pressed || submitting ? tint + "CC" : tint,
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
                marginBottom: insets.bottom + 20,
              })}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}
                >
                  Log Package
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showResPicker}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setResSearch("");
          setShowResPicker(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
              maxHeight: "65%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
                Select Resident
              </Text>
              <Pressable
                onPress={() => {
                  setResSearch("");
                  setShowResPicker(false);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: borderCol,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={16} color={text} />
              </Pressable>
            </View>

            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: fieldBg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: borderCol,
                paddingHorizontal: 10,
                marginBottom: 10,
                gap: 8,
              }}
            >
              <Feather name="search" size={15} color={muted} />
              <TextInput
                value={resSearch}
                onChangeText={setResSearch}
                placeholder="Search by name or unit…"
                placeholderTextColor={muted}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  fontSize: 14,
                  color: text,
                }}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {resSearch.length > 0 && (
                <Pressable onPress={() => setResSearch("")}>
                  <Feather name="x-circle" size={15} color={muted} />
                </Pressable>
              )}
            </View>
            <FlatList
              data={filteredResidents}
              keyExtractor={(r) => r.id}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: borderCol }} />
              )}
              ListEmptyComponent={
                <Text
                  style={{
                    color: muted,
                    textAlign: "center",
                    paddingVertical: 20,
                  }}
                >
                  {resSearch.trim()
                    ? "No residents match your search"
                    : "No residents found"}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    if (showEdit) {
                      setEditPkg((prev) => ({ ...prev, userId: item.id }));
                    } else {
                      setNewPkg((prev) => ({ ...prev, userId: item.id }));
                    }
                    setResSearch("");
                    setShowResPicker(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 12,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: tint + "18",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, fontWeight: "700", color: tint }}
                    >
                      {(item.name || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, color: text, fontWeight: "500" }}
                    >
                      {item.name}
                    </Text>
                    {item.unit?.number && (
                      <Text style={{ fontSize: 11, color: muted }}>
                        Unit {item.unit.number}
                        {item.unit.block?.name
                          ? ` · ${item.unit.block.name}`
                          : ""}
                      </Text>
                    )}
                  </View>
                  {(showEdit ? editPkg.userId : newPkg.userId) === item.id && (
                    <Feather name="check" size={15} color={tint} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Edit Package Modal */}
      <Modal
        visible={showEdit}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEdit(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <ScrollView
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "80%",
              paddingHorizontal: 20,
              paddingTop: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
                Edit Package
              </Text>
              <Pressable
                onPress={() => setShowEdit(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: borderCol,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={16} color={text} />
              </Pressable>
            </View>

            {/* Resident picker */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              >
                Resident *
              </Text>
              <Pressable
                onPress={() => setShowResPicker(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: fieldBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: borderCol,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: residents.find((r) => r.id === editPkg.userId)?.name
                      ? text
                      : muted,
                  }}
                >
                  {residents.find((r) => r.id === editPkg.userId)?.name ||
                    "Select resident"}
                </Text>
                <Feather name="chevron-down" size={16} color={muted} />
              </Pressable>
            </View>

            {/* Package name */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              >
                Package Name *
              </Text>
              <TextInput
                value={editPkg.name}
                onChangeText={(v) => {
                  setEditPkg((prev) => ({ ...prev, name: v }));
                  if (editNameErr) setEditNameErr("");
                }}
                placeholder="e.g. Amazon parcel"
                placeholderTextColor={muted}
                style={{
                  backgroundColor: fieldBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: editNameErr ? "#EF4444" : borderCol,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: text,
                }}
              />
              {!!editNameErr && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Feather name="alert-circle" size={12} color="#EF4444" />
                  <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "500" }}>{editNameErr}</Text>
                </View>
              )}
            </View>

            {/* Image */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: muted,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              >
                Package Photo
              </Text>
              {editPkg.image ? (
                <View style={{ position: "relative" }}>
                  <Pressable
                    onPress={() =>
                      openImagePicker((b64) =>
                        setEditPkg((prev) => ({ ...prev, image: b64 })),
                      )
                    }
                  >
                    <Image
                      source={{ uri: editPkg.image }}
                      style={{ width: "100%", height: 140, borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setEditPkg((prev) => ({ ...prev, image: "" }))
                    }
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="x" size={14} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() =>
                    openImagePicker((b64) =>
                      setEditPkg((prev) => ({ ...prev, image: b64 })),
                    )
                  }
                  style={{
                    height: 100,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: borderCol,
                    borderStyle: "dashed",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Feather name="camera" size={20} color={muted} />
                  <Text style={{ fontSize: 12, color: muted }}>
                    Tap to change photo
                  </Text>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={updatePackageDetails}
              disabled={updating2}
              style={({ pressed }) => ({
                backgroundColor: pressed || updating2 ? tint + "CC" : tint,
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
                marginBottom: insets.bottom + 20,
              })}
            >
              {updating2 ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}
                >
                  Save Changes
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
      <Modal
        visible={showImageSource}
        animationType="fade"
        transparent
        onRequestClose={() => setShowImageSource(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowImageSource(false)}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: text,
                marginBottom: 4,
              }}
            >
              Select Photo
            </Text>
            <Pressable
              onPress={pickFromCamera}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                backgroundColor: fieldBg,
                borderRadius: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: tint + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="camera" size={18} color={tint} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: text }}>
                Take Photo
              </Text>
            </Pressable>
            <Pressable
              onPress={pickFromGallery}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                backgroundColor: fieldBg,
                borderRadius: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: tint + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="image" size={18} color={tint} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: text }}>
                Choose from Gallery
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowImageSource(false)}
              style={{ paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ fontSize: 14, color: muted, fontWeight: "600" }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
