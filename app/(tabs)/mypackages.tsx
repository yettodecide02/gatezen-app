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
  Image,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";

export default function ResidentPackagesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  const backendUrl = config.backendUrl;

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // Date picker states
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  useEffect(() => {
    (async () => {
      const [t, u] = await Promise.all([getToken(), getUser()]);
      setToken(t);
      setUser(u);
    })();
  }, []);

  useEffect(() => {
    if (token && user) {
      load();
    }
  }, [token, user]);

  const load = async () => {
    if (!token || !user) return;

    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${backendUrl}/resident/packages`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          communityId: user.communityId,
          userId: user.id,
          from: dateRange.from.toISOString().split("T")[0],
          to: dateRange.to.toISOString().split("T")[0],
        },
      });
      setPackages(res.data || []);
    } catch (err) {
      console.error("Error loading packages:", err);
      setError(err.response?.data?.error || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onFromDateChange = (event, selectedDate) => {
    setShowFromPicker(false);
    if (event.type === "set" && selectedDate) {
      setDateRange((prev) => ({ ...prev, from: selectedDate }));
    }
  };

  const onToDateChange = (event, selectedDate) => {
    setShowToPicker(false);
    if (event.type === "set" && selectedDate) {
      setDateRange((prev) => ({ ...prev, to: selectedDate }));
    }
  };

  const stats = React.useMemo(
    () => ({
      total: packages.length,
      pending: packages.filter((p) => p.status === "PENDING").length,
      collected: packages.filter(
        (p) => p.status === "PICKED" || p.status === "COLLECTED",
      ).length,
    }),
    [packages],
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top + 16 }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                padding: 12,
                backgroundColor: "#EEF2FF",
                borderRadius: 12,
              }}
            >
              <Feather name="package" size={24} color="#2563EB" />
            </View>
            <View>
              <Text style={{ color: text, fontSize: 24, fontWeight: "800" }}>
                My Packages
              </Text>
              <Text style={{ color: icon as any, fontSize: 14, marginTop: 2 }}>
                View your package delivery history
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={load}
          disabled={loading}
          style={[
            styles.button,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <Feather
            name="refresh-cw"
            size={16}
            color={icon as any}
            style={loading ? { transform: [{ rotate: "180deg" }] } : {}}
          />
          <Text style={{ color: text, fontWeight: "600" }}>Refresh</Text>
        </TouchableOpacity>

        {/* Date Filter */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Text
            style={{
              color: text,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 16,
            }}
          >
            Date Filter
          </Text>

          <View style={{ gap: 16 }}>
            {/* From Date */}
            <View>
              <Text style={[styles.label, { color: text }]}>From Date</Text>
              {Platform.OS === "ios" ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 8,
                    overflow: "hidden",
                    backgroundColor: bg,
                  }}
                >
                  <DateTimePicker
                    value={dateRange.from}
                    mode="date"
                    display="compact"
                    onChange={onFromDateChange}
                    maximumDate={new Date()}
                    style={{ width: "100%" }}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowFromPicker(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: bg,
                  }}
                >
                  <Text style={{ color: text, fontSize: 14 }}>
                    {formatDate(dateRange.from)}
                  </Text>
                  <Feather name="calendar" size={16} color={icon as any} />
                </TouchableOpacity>
              )}
            </View>

            {/* To Date */}
            <View>
              <Text style={[styles.label, { color: text }]}>To Date</Text>
              {Platform.OS === "ios" ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 8,
                    overflow: "hidden",
                    backgroundColor: bg,
                  }}
                >
                  <DateTimePicker
                    value={dateRange.to}
                    mode="date"
                    display="compact"
                    onChange={onToDateChange}
                    maximumDate={new Date()}
                    style={{ width: "100%" }}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowToPicker(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: bg,
                  }}
                >
                  <Text style={{ color: text, fontSize: 14 }}>
                    {formatDate(dateRange.to)}
                  </Text>
                  <Feather name="calendar" size={16} color={icon as any} />
                </TouchableOpacity>
              )}
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              onPress={() => {
                load();
              }}
              disabled={loading}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: loading ? "#93C5FD" : "#2563EB",
                padding: 14,
                borderRadius: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="calendar" size={16} color="#fff" />
              )}
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                {loading ? "Loading..." : "Apply Filter"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Pickers - Only show on Android, iOS uses inline picker */}
        {Platform.OS === "android" && showFromPicker && (
          <DateTimePicker
            value={dateRange.from}
            mode="date"
            display="default"
            onChange={onFromDateChange}
            maximumDate={new Date()}
          />
        )}
        {Platform.OS === "android" && showToPicker && (
          <DateTimePicker
            value={dateRange.to}
            mode="date"
            display="default"
            onChange={onToDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Error Message */}
        {error && (
          <View
            style={{
              backgroundColor: "#FEE2E2",
              borderColor: "#FECACA",
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ color: "#B91C1C", fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {/* Stats Summary */}
        {packages.length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <Text
              style={{
                color: text,
                fontSize: 16,
                fontWeight: "700",
                marginBottom: 16,
              }}
            >
              Summary
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    color: "#2563EB",
                    fontSize: 24,
                    fontWeight: "800",
                  }}
                >
                  {stats.total}
                </Text>
                <Text style={{ color: icon as any, fontSize: 12 }}>Total</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    color: "#F59E0B",
                    fontSize: 24,
                    fontWeight: "800",
                  }}
                >
                  {stats.pending}
                </Text>
                <Text style={{ color: icon as any, fontSize: 12 }}>
                  Pending
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    color: "#10B981",
                    fontSize: 24,
                    fontWeight: "800",
                  }}
                >
                  {stats.collected}
                </Text>
                <Text style={{ color: icon as any, fontSize: 12 }}>
                  Collected
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Packages List */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Text
            style={{
              color: text,
              fontSize: 18,
              fontWeight: "800",
              marginBottom: 16,
            }}
          >
            Package History ({packages.length})
          </Text>

          {loading && packages.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={{ color: icon as any, marginTop: 12 }}>
                Loading packages...
              </Text>
            </View>
          ) : packages.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Feather name="package" size={32} color="#9CA3AF" />
              </View>
              <Text
                style={{
                  color: text,
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                No packages found
              </Text>
              <Text style={{ color: icon as any, fontSize: 14 }}>
                No packages were delivered in the selected date range
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {packages.map((pkg) => (
                <View
                  key={pkg.id}
                  style={{
                    backgroundColor: bg,
                    borderColor: border,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    {/* Status Icon */}
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor:
                          pkg.status === "PENDING" ? "#FEF3C7" : "#D1FAE5",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather
                        name={
                          pkg.status === "PENDING" ? "clock" : "check-circle"
                        }
                        size={24}
                        color={pkg.status === "PENDING" ? "#F59E0B" : "#10B981"}
                      />
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: text,
                              fontSize: 16,
                              fontWeight: "700",
                              marginBottom: 4,
                            }}
                          >
                            {pkg.name}
                          </Text>
                          <Text style={{ color: icon as any, fontSize: 13 }}>
                            {pkg.status === "PENDING"
                              ? "Waiting for pickup"
                              : "Collected"}
                          </Text>
                        </View>

                        {/* Status Badge */}
                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            backgroundColor:
                              pkg.status === "PENDING" ? "#FEF3C7" : "#D1FAE5",
                            borderWidth: 1,
                            borderColor:
                              pkg.status === "PENDING" ? "#FCD34D" : "#6EE7B7",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            alignSelf: "flex-start",
                          }}
                        >
                          <Feather
                            name={
                              pkg.status === "PENDING"
                                ? "clock"
                                : "check-circle"
                            }
                            size={12}
                            color={
                              pkg.status === "PENDING" ? "#B45309" : "#059669"
                            }
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color:
                                pkg.status === "PENDING"
                                  ? "#B45309"
                                  : "#059669",
                            }}
                          >
                            {pkg.status}
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 8 }}
                      >
                        {pkg.receivedAt && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              backgroundColor: card,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: border,
                            }}
                          >
                            <Feather
                              name="truck"
                              size={12}
                              color={icon as any}
                            />
                            <Text
                              style={{
                                color: icon as any,
                                fontSize: 11,
                              }}
                            >
                              {new Date(pkg.receivedAt).toLocaleDateString()}
                            </Text>
                          </View>
                        )}

                        {pkg.image && (
                          <TouchableOpacity
                            onPress={() => setSelectedImage(pkg.image)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              backgroundColor: "#EEF2FF",
                              borderColor: "#C7D2FE",
                              borderWidth: 1,
                              borderRadius: 8,
                            }}
                          >
                            <Feather name="image" size={12} color="#2563EB" />
                            <Text
                              style={{
                                color: "#2563EB",
                                fontSize: 11,
                                fontWeight: "600",
                              }}
                            >
                              View Image
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              maxWidth: "100%",
              maxHeight: "90%",
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 10,
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 8,
              }}
              onPress={() => setSelectedImage(null)}
            >
              <Feather name="x" size={20} color="#374151" />
            </TouchableOpacity>
            <Image
              source={{ uri: selectedImage }}
              style={{
                width: 400,
                height: 400,
                resizeMode: "contain",
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
});
