// @ts-nocheck
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";

import Toast from "@/components/Toast";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { getCommunityId, getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";

const SPOT_TYPE_CFG = {
  "2W": { label: "2-Wheeler", icon: "wind", color: "#10B981" },
  "4W": { label: "4-Wheeler", icon: "truck", color: "#3B82F6" },
  EV:  { label: "EV",         icon: "zap",   color: "#8B5CF6" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function spotTypeCfg(t = "4W") { return SPOT_TYPE_CFG[t] ?? SPOT_TYPE_CFG["4W"]; }
function isoDate(d: Date) { return d.toISOString().split("T")[0]; }

export default function RentParking() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const { toast, showError, showSuccess, hideToast } = useToast();

  const [tab, setTab] = useState<"available" | "mybookings">("available");
  const [spots, setSpots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Booking modal
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date(Date.now() + 86400000));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [token, communityId, user] = await Promise.all([getToken(), getCommunityId(), getUser()]);
      if (!communityId) return;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [spotsRes, bookingsRes] = await Promise.all([
        axios.get(`${config.backendUrl}/parking/spots`, { params: { communityId }, headers }),
        axios.get(`${config.backendUrl}/parking/bookings`, { params: { communityId, userId: user?.id }, headers }),
      ]);
      const rawSpots = spotsRes.data?.spots ?? spotsRes.data ?? [];
      const rawBookings = bookingsRes.data?.bookings ?? bookingsRes.data ?? [];
      setSpots(Array.isArray(rawSpots) ? rawSpots : []);
      setBookings(Array.isArray(rawBookings) ? rawBookings : []);
    } catch { showError("Failed to load parking data."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const availableSpots = useMemo(() => spots.filter((s) => s.isAvailable !== false && s.status !== "OCCUPIED"), [spots]);

  const handleBook = async () => {
    if (!selectedSpot) return;
    setBooking(true);
    try {
      const [token, communityId, user] = await Promise.all([getToken(), getCommunityId(), getUser()]);
      await axios.post(`${config.backendUrl}/parking/bookings`,
        { communityId, userId: user?.id, spotId: selectedSpot.id, fromDate: isoDate(fromDate), toDate: isoDate(toDate) },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      showSuccess("Parking spot booked!");
      setSelectedSpot(null);
      setTab("mybookings");
      load();
    } catch (e) {
      showError(e?.response?.data?.error ?? "Failed to book spot.");
    } finally { setBooking(false); }
  };

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      const token = await getToken();
      await axios.patch(`${config.backendUrl}/parking/bookings/${id}/cancel`, {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      showSuccess("Booking cancelled.");
      load();
    } catch { showError("Failed to cancel."); }
    finally { setCancelling(null); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderCol, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
          <Feather name="arrow-left" size={18} color={text} />
        </Pressable>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: text }}>Rent a Parking</Text>
          <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>{availableSpots.length} spots available</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        {([["available", "Available"], ["mybookings", "My Bookings"]] as const).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)}
            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: tab === key ? tint : "transparent", borderWidth: 1, borderColor: tab === key ? tint : borderCol }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: tab === key ? "#fff" : muted }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color={tint} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={tint} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
        >
          {tab === "available" ? (
            availableSpots.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}>
                <Feather name="map-pin" size={32} color={muted} style={{ opacity: 0.3 }} />
                <Text style={{ fontSize: 15, color: muted }}>No spots available right now</Text>
              </View>
            ) : availableSpots.map((spot) => {
              const tc = spotTypeCfg(spot.spotType);
              return (
                <View key={spot.id} style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: borderCol, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: tc.color + "18", alignItems: "center", justifyContent: "center" }}>
                    <Feather name={tc.icon} size={22} color={tc.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: text }}>
                      Spot {spot.spotNumber ?? spot.slotNumber ?? spot.id}
                    </Text>
                    <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                      {tc.label}{spot.floor ? ` · Floor ${spot.floor}` : ""}{spot.block ? ` · Block ${spot.block}` : ""}
                    </Text>
                    {spot.pricePerDay != null && (
                      <Text style={{ fontSize: 13, fontWeight: "700", color: tint, marginTop: 3 }}>
                        ₹{spot.pricePerDay}/day
                      </Text>
                    )}
                  </View>
                  <Pressable onPress={() => { setSelectedSpot(spot); setFromDate(new Date()); setToDate(new Date(Date.now() + 86400000)); }}
                    style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: tint }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Book</Text>
                  </Pressable>
                </View>
              );
            })
          ) : (
            bookings.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}>
                <Feather name="calendar" size={32} color={muted} style={{ opacity: 0.3 }} />
                <Text style={{ fontSize: 15, color: muted }}>No bookings yet</Text>
              </View>
            ) : bookings.map((b) => {
              const isActive = b.status?.toUpperCase() !== "CANCELLED";
              return (
                <View key={b.id} style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: borderCol, padding: 16, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: tint + "15", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="map-pin" size={20} color={tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: text }}>
                        Spot {b.spot?.spotNumber ?? b.spotNumber ?? "—"}
                      </Text>
                      <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                        {fmtDate(b.fromDate)} → {fmtDate(b.toDate)}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: isActive ? "#10B98120" : "#94A3B820" }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: isActive ? "#10B981" : "#94A3B8" }}>
                        {isActive ? "ACTIVE" : "CANCELLED"}
                      </Text>
                    </View>
                  </View>
                  {isActive && (
                    <Pressable onPress={() => handleCancel(b.id)} disabled={cancelling === b.id}
                      style={{ paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: "#EF444430", alignItems: "center", opacity: cancelling === b.id ? 0.7 : 1 }}
                    >
                      {cancelling === b.id ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={{ fontSize: 13, fontWeight: "600", color: "#EF4444" }}>Cancel Booking</Text>}
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Booking Modal */}
      {selectedSpot && (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedSpot(null)}>
          <View style={{ flex: 1, backgroundColor: bg }}>
            <View style={{ paddingTop: 20, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderCol, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: text }}>Book Spot {selectedSpot.spotNumber ?? selectedSpot.slotNumber}</Text>
              <Pressable onPress={() => setSelectedSpot(null)}><Feather name="x" size={22} color={text} /></Pressable>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              {/* From date */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: 0.5 }}>From Date</Text>
                <Pressable onPress={() => setShowFromPicker(true)} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "#111" : "#F8FAFC", borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 12 }}>
                  <Feather name="calendar" size={15} color={muted} />
                  <Text style={{ fontSize: 14, color: text }}>{fmtDate(fromDate.toISOString())}</Text>
                </Pressable>
                {showFromPicker && <DateTimePicker value={fromDate} mode="date" minimumDate={new Date()} onChange={(e, d) => { setShowFromPicker(false); if (e.type === "set" && d) { setFromDate(d); if (d > toDate) setToDate(new Date(d.getTime() + 86400000)); } }} />}
              </View>

              {/* To date */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: 0.5 }}>To Date</Text>
                <Pressable onPress={() => setShowToPicker(true)} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "#111" : "#F8FAFC", borderRadius: 12, borderWidth: 1, borderColor: borderCol, padding: 12 }}>
                  <Feather name="calendar" size={15} color={muted} />
                  <Text style={{ fontSize: 14, color: text }}>{fmtDate(toDate.toISOString())}</Text>
                </Pressable>
                {showToPicker && <DateTimePicker value={toDate} mode="date" minimumDate={fromDate} onChange={(e, d) => { setShowToPicker(false); if (e.type === "set" && d) setToDate(d); }} />}
              </View>

              {selectedSpot.pricePerDay != null && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: tint + "10", borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 14, color: muted }}>Estimated Total</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: tint }}>
                    ₹{selectedSpot.pricePerDay * Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000))}
                  </Text>
                </View>
              )}

              <Pressable onPress={handleBook} disabled={booking} style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: tint, alignItems: "center", marginTop: 8, opacity: booking ? 0.7 : 1 }}>
                {booking ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Confirm Booking</Text>}
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
