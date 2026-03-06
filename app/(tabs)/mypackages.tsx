// @ts-nocheck
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAppContext } from "@/contexts/AppContext";
import { queryKeys } from "@/lib/queryKeys";
import { fetchResidentPackages } from "@/lib/queries/resident";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const STATUS_COLORS = {
  PENDING: "#F59E0B",
  PICKED: "#10B981",
  DELIVERED: "#3B82F6",
  RETURNED: "#EF4444",
};
const STATUS_LABELS = {
  PENDING: "PNDG",
  PICKED: "PKCD",
  DELIVERED: "DLVD",
  RETURNED: "RTND",
};

export default function MyPackages() {
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

  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 864e5),
    to: new Date(),
  });
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const { toast, showError, hideToast } = useToast();

  const { user, token } = useAppContext();
  const fromStr = dateRange.from.toISOString().split("T")[0];
  const toStr = dateRange.to.toISOString().split("T")[0];

  const {
    data: packages = [],
    isLoading: loading,
    refetch: load,
  } = useQuery({
    queryKey: queryKeys.resident.packages(
      user?.id ?? "",
      user?.communityId ?? "",
      fromStr,
      toStr,
    ),
    queryFn: () =>
      fetchResidentPackages(
        token,
        user!.id,
        user!.communityId as string,
        fromStr,
        toStr,
      ),
    enabled: !!user?.id && !!user?.communityId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  const fmtShort = (d) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const stats = {
    total: packages.length,
    pending: packages.filter((p) => p.status === "PENDING").length,
    collected: packages.filter((p) => p.status === "PICKED").length,
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: 14,
          paddingHorizontal: 20,
          backgroundColor: bg,
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: tint + "18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="package" size={18} color={tint} />
            </View>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>
                My Packages
              </Text>
              <Text style={{ fontSize: 12, color: muted }}>
                Delivery history
              </Text>
            </View>
          </View>
          <Pressable
            onPress={load}
            disabled={loading}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: tint + "15",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={tint} />
            ) : (
              <Feather name="refresh-cw" size={16} color={tint} />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date filter */}
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: borderCol,
            padding: 14,
            gap: 10,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: muted,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Date Range
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => {
                if (Platform.OS === "android") {
                  DateTimePickerAndroid.open({
                    value: dateRange.from,
                    mode: "date",
                    maximumDate: dateRange.to,
                    onChange: (e, d) => {
                      if (e.type === "set" && d)
                        setDateRange((p) => ({ ...p, from: d }));
                    },
                  });
                } else {
                  setShowFromPicker(true);
                }
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: fieldBg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: borderCol,
                padding: 10,
              }}
            >
              <Feather name="calendar" size={14} color={muted} />
              <Text style={{ flex: 1, fontSize: 13, color: text }}>
                {fmtShort(dateRange.from)}
              </Text>
            </Pressable>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: muted, fontSize: 12 }}>to</Text>
            </View>
            <Pressable
              onPress={() => {
                if (Platform.OS === "android") {
                  DateTimePickerAndroid.open({
                    value: dateRange.to,
                    mode: "date",
                    minimumDate: dateRange.from,
                    maximumDate: new Date(),
                    onChange: (e, d) => {
                      if (e.type === "set" && d)
                        setDateRange((p) => ({ ...p, to: d }));
                    },
                  });
                } else {
                  setShowToPicker(true);
                }
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: fieldBg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: borderCol,
                padding: 10,
              }}
            >
              <Feather name="calendar" size={14} color={muted} />
              <Text style={{ flex: 1, fontSize: 13, color: text }}>
                {fmtShort(dateRange.to)}
              </Text>
            </Pressable>
            <Pressable
              onPress={load}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: tint,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>
                Go
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "Total", value: stats.total, color: tint },
            { label: "Pending", value: stats.pending, color: "#F59E0B" },
            { label: "Collected", value: stats.collected, color: "#10B981" },
          ].map((s) => (
            <View
              key={s.label}
              style={{
                flex: 1,
                backgroundColor: cardBg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: borderCol,
                padding: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "700", color: s.color }}>
                {s.value}
              </Text>
              <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* List */}
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={tint} />
          </View>
        ) : packages.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: tint + "15",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="package" size={24} color={tint} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: text }}>
              No Packages
            </Text>
            <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
              No deliveries found for this date range.
            </Text>
          </View>
        ) : (
          packages.map((pkg) => {
            const sc = STATUS_COLORS[pkg.status] || muted;
            const isExpanded = expandedId === pkg.id;
            return (
              <Pressable
                key={pkg.id}
                onPress={() => setExpandedId(isExpanded ? null : pkg.id)}
                style={({ pressed }) => ({
                  backgroundColor: cardBg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isExpanded ? tint + "60" : borderCol,
                  opacity: pressed ? 0.9 : 1,
                  overflow: "hidden",
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      backgroundColor: sc + "18",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="package" size={20} color={sc} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: "600", color: text }}
                      numberOfLines={1}
                    >
                      {pkg.name || "Package"}
                    </Text>
                    <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                      {pkg.image ? "Tap to view photo" : "No photo"}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: sc + "20",
                      }}
                    >
                      <Text
                        style={{ fontSize: 10, fontWeight: "700", color: sc }}
                      >
                        {STATUS_LABELS[pkg.status] || pkg.status}
                      </Text>
                    </View>
                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={15}
                      color={muted}
                    />
                  </View>
                </View>
                {isExpanded && (
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: borderCol,
                      padding: 14,
                    }}
                  >
                    {pkg.image ? (
                      <Image
                        source={{ uri: pkg.image }}
                        style={{ width: "100%", height: 200, borderRadius: 10 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          height: 100,
                          borderRadius: 10,
                          backgroundColor: fieldBg,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <Feather name="image" size={24} color={muted} />
                        <Text style={{ fontSize: 12, color: muted }}>
                          No photo available
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {Platform.OS === "ios" && showFromPicker && (
        <DateTimePicker
          value={dateRange.from}
          mode="date"
          maximumDate={dateRange.to}
          onChange={(e, d) => {
            setShowFromPicker(false);
            if (e.type === "set" && d) setDateRange((p) => ({ ...p, from: d }));
          }}
        />
      )}
      {Platform.OS === "ios" && showToPicker && (
        <DateTimePicker
          value={dateRange.to}
          mode="date"
          minimumDate={dateRange.from}
          maximumDate={new Date()}
          onChange={(e, d) => {
            setShowToPicker(false);
            if (e.type === "set" && d) setDateRange((p) => ({ ...p, to: d }));
          }}
        />
      )}

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
