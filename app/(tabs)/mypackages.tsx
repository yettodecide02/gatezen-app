// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
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
  const tint = useThemeColor({}, "tint");
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
      collected: packages.filter((p) => p.status === "PICKED").length,
    }),
    [packages],
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Fixed Header */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: Math.max(insets.top, 16),
            backgroundColor: bg,
            borderBottomColor: border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: theme === "dark" ? "#1a1a2e" : "#EEF2FF" },
              ]}
            >
              <Feather name="package" size={20} color={tint} />
            </View>
            <View>
              <Text style={[styles.title, { color: text }]}>My Packages</Text>
              <Text style={[styles.subtitle, { color: icon as any }]}>
                Delivery history
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={load}
            disabled={loading}
            style={styles.refreshBtn}
          >
            {loading ? (
              <ActivityIndicator size="small" color={tint} />
            ) : (
              <Feather name="refresh-cw" size={18} color={tint} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          paddingBottom: insets.bottom + 20,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Filter */}
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Text
            style={{
              color: text,
              fontSize: 16,
              fontWeight: "800",
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
              onPress={load}
              disabled={loading}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: loading ? "#93C5FD" : tint,
                padding: 13,
                borderRadius: 10,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="search" size={15} color="#fff" />
              )}
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                {loading ? "Loading..." : "Apply"}
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
        {!!error && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme === "dark" ? "#2a0b0b" : "#fef2f2",
                borderColor: theme === "dark" ? "#3d1212" : "#fecaca",
              },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Feather
                name="alert-circle"
                size={16}
                color={theme === "dark" ? "#fca5a5" : "#b91c1c"}
              />
              <Text
                style={{
                  color: theme === "dark" ? "#fca5a5" : "#b91c1c",
                  fontSize: 14,
                  flex: 1,
                }}
              >
                {error}
              </Text>
            </View>
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
                fontWeight: "800",
                marginBottom: 16,
              }}
            >
              Summary
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {[
                { label: "Total", value: stats.total, color: tint },
                { label: "Pending", value: stats.pending, color: "#F59E0B" },
                {
                  label: "Collected",
                  value: stats.collected,
                  color: "#10B981",
                },
              ].map((s) => (
                <View
                  key={s.label}
                  style={[
                    styles.statChip,
                    {
                      backgroundColor: theme === "dark" ? "#1a1a1a" : "#F9FAFB",
                      borderColor: border,
                      flex: 1,
                    },
                  ]}
                >
                  <Text
                    style={{ color: s.color, fontSize: 22, fontWeight: "800" }}
                  >
                    {s.value}
                  </Text>
                  <Text
                    style={{ color: icon as any, fontSize: 12, marginTop: 2 }}
                  >
                    {s.label}
                  </Text>
                </View>
              ))}
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
              fontSize: 16,
              fontWeight: "800",
              marginBottom: 16,
            }}
          >
            Package History ({packages.length})
          </Text>

          {loading && packages.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={tint} />
              <Text style={{ color: icon as any, marginTop: 12 }}>
                Loading packages...
              </Text>
            </View>
          ) : packages.length === 0 ? (
            <View
              style={{ paddingVertical: 40, alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  backgroundColor: theme === "dark" ? "#1a1a1a" : "#F3F4F6",
                  borderRadius: 28,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="package" size={28} color={icon as any} />
              </View>
              <Text style={{ color: text, fontSize: 15, fontWeight: "600" }}>
                No packages found
              </Text>
              <Text
                style={{
                  color: icon as any,
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                No deliveries in the selected date range
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
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor:
                          pkg.status === "PENDING"
                            ? theme === "dark"
                              ? "#2d1d00"
                              : "#FEF3C7"
                            : theme === "dark"
                              ? "#052e1f"
                              : "#D1FAE5",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather
                        name={
                          pkg.status === "PENDING" ? "clock" : "check-circle"
                        }
                        size={20}
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
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor:
                              pkg.status === "PENDING"
                                ? theme === "dark"
                                  ? "#2d1d00"
                                  : "#FEF3C7"
                                : theme === "dark"
                                  ? "#052e1f"
                                  : "#D1FAE5",
                            borderWidth: 1,
                            borderColor:
                              pkg.status === "PENDING"
                                ? theme === "dark"
                                  ? "#92400e"
                                  : "#FCD34D"
                                : theme === "dark"
                                  ? "#065f46"
                                  : "#6EE7B7",
                            alignSelf: "flex-start",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color:
                                pkg.status === "PENDING"
                                  ? theme === "dark"
                                    ? "#fbbf24"
                                    : "#B45309"
                                  : theme === "dark"
                                    ? "#34d399"
                                    : "#059669",
                            }}
                          >
                            {pkg.status === "PENDING" ? "Pending" : "Collected"}
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
                              gap: 5,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderWidth: 1,
                              borderColor: border,
                              borderRadius: 8,
                              alignSelf: "flex-start",
                              marginTop: 8,
                            }}
                          >
                            <Feather name="image" size={12} color={tint} />
                            <Text
                              style={{
                                color: tint,
                                fontSize: 12,
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
              backgroundColor: card,
              borderRadius: 16,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
                borderWidth: 1,
                borderColor: border,
                borderRadius: 20,
                padding: 6,
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
              onPress={() => setSelectedImage(null)}
            >
              <Feather name="x" size={18} color={text} />
            </TouchableOpacity>
            <Image
              source={{ uri: selectedImage }}
              style={{ width: 340, height: 340 }}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  statChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
