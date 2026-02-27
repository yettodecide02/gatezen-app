// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import { Text, View, Pressable, Vibration, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, CameraView } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

export default function GatekeeperScanner() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";

  const { toast, showError, showSuccess, hideToast } = useToast();
  const [user, setUserState] = useState(null);
  const [token, setTokenState] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [lastScan, setLastScan] = useState(null);
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => { const [t, u] = await Promise.all([getToken(), getUser()]); setTokenState(t); setUserState(u); })();
  }, []);

  useEffect(() => {
    (async () => { const { status } = await Camera.requestCameraPermissionsAsync(); setHasPermission(status === "granted"); })();
  }, []);

  const resetScan = useCallback(() => { setScanning(true); setLastScan(null); setVisitor(null); }, []);

  const handleBarCodeScanned = useCallback(async ({ data }) => {
    if (!scanning || data === lastScan) return;
    setLastScan(data); setScanning(false); Vibration.vibrate(100);
    try {
      let visitorId = data;
      let communityId = user?.communityId || "1";
      if (data.includes("scan?id=")) {
        try { const url = new URL(data); visitorId = url.searchParams.get("id") || ""; communityId = url.searchParams.get("communityId") || communityId; }
        catch { const params = new URLSearchParams(data.includes("?") ? data.split("?")[1] : data); visitorId = params.get("id") || ""; communityId = params.get("communityId") || communityId; }
      } else if (data.includes(":")) { const parts = data.split(":"); visitorId = parts[0]; communityId = parts[1] || communityId; }
      if (!visitorId) throw new Error("Invalid QR code");
      setLoading(true);
      const res = await axios.get(`${config.backendUrl}/gatekeeper/scan`, { params: { id: visitorId, communityId }, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setVisitor(res.data.visitor);
    } catch (e) {
      showError(e?.response?.data?.error || e?.response?.data?.message || "Visitor not found or QR invalid");
      resetScan();
    } finally { setLoading(false); }
  }, [scanning, lastScan, user?.communityId, token, resetScan]);

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={tint} />
        <Text style={{ color: muted, marginTop: 12 }}>Requesting camera access…</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#EF444415", alignItems: "center", justifyContent: "center" }}>
          <Feather name="camera-off" size={28} color="#EF4444" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: "700", color: text, textAlign: "center" }}>Camera Access Denied</Text>
        <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>Please enable camera permissions in your device settings to scan QR codes.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Camera */}
      <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={scanning && !loading ? handleBarCodeScanned : undefined}>
        {/* Overlay */}
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" }}>
          {/* Frame */}
          <View style={{ width: 220, height: 220, position: "relative" }}>
            {/* Corners */}
            {[{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }].map((pos, i) => (
              <View key={i} style={{ position: "absolute", width: 28, height: 28, borderColor: tint, borderTopWidth: i < 2 ? 3 : 0, borderBottomWidth: i >= 2 ? 3 : 0, borderLeftWidth: i === 0 || i === 2 ? 3 : 0, borderRightWidth: i === 1 || i === 3 ? 3 : 0, ...pos }} />
            ))}
            {loading && (
              <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color={tint} />
              </View>
            )}
          </View>
          <Text style={{ color: "#fff", fontSize: 13, marginTop: 16, opacity: 0.8 }}>
            {loading ? "Looking up visitor…" : scanning ? "Point camera at QR code" : "Processing…"}
          </Text>
        </View>
      </CameraView>

      {/* Visitor result card */}
      {visitor && (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(insets.bottom, 20) + 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: tint + "18", alignItems: "center", justifyContent: "center" }}>
              <Feather name="user-check" size={22} color={tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: text }}>{visitor.name || visitor.visitorName || "Visitor"}</Text>
              <Text style={{ fontSize: 12, color: muted }}>{visitor.visitorType || "Guest"}{visitor.phone ? ` · ${visitor.phone}` : ""}</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: "#10B98120" }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#10B981" }}>✓ VALID</Text>
            </View>
          </View>

          {visitor.unit && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Feather name="map-pin" size={12} color={muted} />
              <Text style={{ fontSize: 12, color: muted }}>Unit {visitor.unit?.number || visitor.unit} {visitor.block ? `· Block ${visitor.block?.name || visitor.block}` : ""}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={resetScan} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: borderCol, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: muted }}>Close</Text>
            </Pressable>
            <Pressable onPress={() => { showSuccess("Entry logged"); resetScan(); }}
              style={{ flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: tint, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Allow Entry</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Toast {...toast} onHide={hideToast} />
    </View>
  );
}
