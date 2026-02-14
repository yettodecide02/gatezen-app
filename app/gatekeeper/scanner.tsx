// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import axios from "axios";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";

export default function GatekeeperScannerScreen() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  // Backend
  const backendUrl = config.backendUrl;

  // Auth
  const [user, setUserState] = useState<any>(null);
  const [token, setTokenState] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        setTokenState(t);
        setUserState(u || { id: "g1", name: "Gatekeeper", role: "GATEKEEPER" });
      } catch {
        setUserState({ id: "g1", name: "Gatekeeper", role: "GATEKEEPER" });
      }
    })();
  }, []);

  // Camera
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(true);
  const [lastScan, setLastScan] = useState<string | null>(null);

  // Visitor info
  const [visitor, setVisitor] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!scanning || data === lastScan) return;

      setLastScan(data);
      setScanning(false);
      Vibration.vibrate(100);

      try {
        let visitorId = data;
        let communityId = user?.communityId || "1";

        // Handle different QR code formats
        if (data.includes("scan?id=")) {
          // URL format: http://backend.com/scan?id=visitor-uuid&communityId=community-uuid
          // OR just: scan?id=visitor-uuid&communityId=community-uuid

          // Try URL parsing first
          let parsed = false;
          try {
            const url = new URL(data);
            visitorId = url.searchParams.get("id") || "";
            communityId =
              url.searchParams.get("communityId") || user?.communityId || "1";
            parsed = true;
          } catch (urlError) {
            // URL parsing failed, continue to fallback
          }

          // Fallback: manual extraction from query string
          if (!parsed) {
            const queryPart = data.includes("?") ? data.split("?")[1] : data;
            const params = new URLSearchParams(queryPart);
            visitorId = params.get("id") || "";
            communityId = params.get("communityId") || user?.communityId || "1";
          }
        } else if (data.includes(":")) {
          // Simple format: "visitorId:communityId"
          const parts = data.split(":");
          visitorId = parts[0];
          communityId = parts[1] || user?.communityId || "1";
        }
        // Otherwise treat the entire data as visitorId

        if (!visitorId) {
          throw new Error("Invalid QR code: No visitor ID found");
        }

        setLoading(true);
        const res = await axios.get(`${backendUrl}/gatekeeper/scan`, {
          params: { id: visitorId, communityId },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        setVisitor(res.data.visitor);
      } catch (e: any) {
        const errorMessage =
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Visitor not found or QR code invalid";

        Alert.alert("Scan Error", errorMessage, [
          { text: "OK", onPress: () => resetScan() },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [scanning, lastScan, backendUrl, token, user?.communityId],
  );

  const resetScan = useCallback(() => {
    setScanning(true);
    setLastScan(null);
    setVisitor(null);
  }, []);

  const updateVisitorStatus = useCallback(
    async (newStatus: string) => {
      if (!visitor) return;

      try {
        const res = await axios.post(
          `${backendUrl}/gatekeeper`,
          { id: visitor.id, status: newStatus },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );

        Alert.alert("Success", `Visitor ${newStatus} successfully`, [
          { text: "OK", onPress: resetScan },
        ]);
      } catch (e: any) {
        Alert.alert("Error", e?.response?.data?.error || "Failed to update");
      }
    },
    [visitor, backendUrl, token, resetScan],
  );

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Text style={{ color: text }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Text style={{ color: text }}>No access to camera</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top + 16 }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: text, fontSize: 24, fontWeight: "800" }}>
            QR Scanner
          </Text>
          <Text style={{ color: icon as any, fontSize: 14, marginTop: 2 }}>
            Scan visitor QR codes for quick access
          </Text>
        </View>
      </View>

      {scanning ? (
        <View
          style={{
            flex: 1,
            margin: 20,
            borderRadius: 20,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "pdf417"],
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanText}>
              Position QR code within the frame
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 20, paddingBottom: 100 }}>
          {loading ? (
            <View
              style={[
                styles.card,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <Text style={{ color: text, textAlign: "center" }}>
                Loading visitor information...
              </Text>
            </View>
          ) : visitor ? (
            <View
              style={[
                styles.card,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: text }]}>
                Visitor Information
              </Text>

              <View style={{ gap: 8 }}>
                <View>
                  <Text style={{ color: text, fontWeight: "700" }}>Name</Text>
                  <Text style={{ color: icon as any }}>{visitor.name}</Text>
                </View>

                <View>
                  <Text style={{ color: text, fontWeight: "700" }}>
                    Visiting
                  </Text>
                  <Text style={{ color: icon as any }}>
                    {visitor.hostName || "—"}
                  </Text>
                </View>

                <View>
                  <Text style={{ color: text, fontWeight: "700" }}>Unit</Text>
                  <Text style={{ color: icon as any }}>
                    {visitor.unitNumber || "—"}
                  </Text>
                </View>

                <View>
                  <Text style={{ color: text, fontWeight: "700" }}>
                    Purpose
                  </Text>
                  <Text style={{ color: icon as any }}>
                    {visitor.purpose || "General visit"}
                  </Text>
                </View>

                <View>
                  <Text style={{ color: text, fontWeight: "700" }}>Status</Text>
                  <Text
                    style={{
                      color:
                        visitor.status === "checked_in"
                          ? "#10B981"
                          : visitor.status === "cancelled"
                            ? "#EF4444"
                            : "#F59E0B",
                    }}
                  >
                    {visitor.status?.toUpperCase() || "PENDING"}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                {visitor.status === "pending" && (
                  <>
                    <TouchableOpacity
                      onPress={() => updateVisitorStatus("checked_in")}
                      style={[
                        styles.btn,
                        { backgroundColor: "#10B981", flex: 1 },
                      ]}
                    >
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        Check In
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => updateVisitorStatus("cancelled")}
                      style={[
                        styles.btn,
                        { backgroundColor: "#EF4444", flex: 1 },
                      ]}
                    >
                      <Feather name="x" size={16} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {visitor.status === "checked_in" && (
                  <TouchableOpacity
                    onPress={() => updateVisitorStatus("checked_out")}
                    style={[
                      styles.btn,
                      styles.btnOutline,
                      { borderColor: border, flex: 1 },
                    ]}
                  >
                    <Feather name="log-out" size={16} color={icon as any} />
                    <Text style={{ color: icon as any, fontWeight: "700" }}>
                      Check Out
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={resetScan}
                style={[
                  styles.btn,
                  styles.btnOutline,
                  { borderColor: border, marginTop: 12 },
                ]}
              >
                <Feather name="camera" size={16} color={icon as any} />
                <Text style={{ color: icon as any, fontWeight: "700" }}>
                  Scan Another
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#fff",
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    left: "auto",
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    top: "auto",
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: "auto",
    left: "auto",
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnPrimary: { backgroundColor: "#2563EB" },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1 },
});
