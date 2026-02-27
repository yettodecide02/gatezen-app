// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { logout, getUser, getToken, setUser } from "@/lib/auth";
import { config } from "@/lib/config";

export default function PendingScreen() {
  const [user, setUserState] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<"approved" | "still_pending" | null>(null);

  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const isDark = theme === "dark";
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const btnTextColor = isDark ? "#11181C" : "#ffffff";

  useEffect(() => {
    (async () => { const userData = await getUser(); setUserState(userData); })();
  }, []);

  const handleCheckApproval = async () => {
    setChecking(true); setCheckResult(null);
    try {
      const token = await getToken();
      if (!token) { router.replace("/login"); return; }
      const res = await axios.get(`${config.backendUrl}/resident/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const fresh = res.data?.user ?? res.data;
      if (fresh && fresh.status !== "PENDING") {
        await setUser(fresh);
        if (fresh.role === "ADMIN") router.replace("/admin");
        else if (fresh.role === "GATEKEEPER") router.replace("/gatekeeper/visitors");
        else router.replace("/(tabs)/home");
      } else setCheckResult("still_pending");
    } catch { setCheckResult("still_pending"); }
    finally { setChecking(false); }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: tint + "1A" }]}>
          <Feather name="clock" size={32} color={tint} />
        </View>

        <Text style={[styles.title, { color: textColor }]}>Account Pending Approval</Text>
        <Text style={[styles.greeting, { color: muted }]}>
          Hello <Text style={{ color: tint, fontWeight: "700" }}>{user?.name || "User"}</Text> — your registration is under review.
        </Text>
        <Text style={[styles.desc, { color: muted }]}>
          Please consult your community head for approval of your account.
        </Text>

        {/* Info chips */}
        <View style={styles.infoSection}>
          <View style={[styles.infoChip, { backgroundColor: isDark ? "#111" : "#F8FAFC", borderColor: borderCol }]}>
            <Feather name="mail" size={14} color={muted} />
            <Text style={[styles.infoText, { color: textColor }]}>{user?.email || "Not available"}</Text>
          </View>
          <View style={[styles.infoChip, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B30" }]}>
            <Feather name="clock" size={14} color="#F59E0B" />
            <Text style={[styles.infoText, { color: "#F59E0B" }]}>Pending approval</Text>
          </View>
        </View>

        {/* Still pending banner */}
        {checkResult === "still_pending" && (
          <View style={[styles.warningBanner, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B40" }]}>
            <Feather name="alert-circle" size={14} color="#F59E0B" />
            <Text style={styles.warningText}>Still pending — contact your community admin.</Text>
          </View>
        )}

        {/* Steps */}
        <View style={[styles.stepsCard, { backgroundColor: isDark ? "#111" : "#F8FAFC", borderColor: borderCol }]}>
          <Text style={[styles.stepsTitle, { color: textColor }]}>What happens next?</Text>
          {[
            "Contact your community head or building administrator",
            "Provide any documentation if required",
            "Wait for your approval notification",
            "You'll get full access once approved",
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: tint + "1A" }]}>
                <Text style={[styles.stepNumText, { color: tint }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: muted }]}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <TouchableOpacity onPress={handleCheckApproval} disabled={checking}
          style={[styles.btn, { backgroundColor: checking ? tint + "80" : tint }]}>
          {checking ? <ActivityIndicator size="small" color={btnTextColor} /> : <Feather name="refresh-cw" size={16} color={btnTextColor} />}
          <Text style={[styles.btnText, { color: btnTextColor }]}>{checking ? "Checking…" : "Check Approval Status"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={async () => { await logout(); router.replace("/login"); }}
          style={[styles.btn, styles.btnOutline, { borderColor: borderCol }]}>
          <Feather name="log-out" size={16} color={textColor} />
          <Text style={[styles.btnText, { color: textColor }]}>Logout & Try Different Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 420, padding: 28, borderRadius: 24, borderWidth: 1, alignItems: "center", gap: 14 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 },
  greeting: { fontSize: 15, textAlign: "center" },
  desc: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  infoSection: { width: "100%", gap: 8 },
  infoChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { fontSize: 14, fontWeight: "500" },
  warningBanner: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  warningText: { flex: 1, fontSize: 13, color: "#F59E0B", fontWeight: "500" },
  stepsCard: { width: "100%", borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  stepsTitle: { fontSize: 14, fontWeight: "700" },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNumText: { fontSize: 11, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 13, lineHeight: 18 },
  btn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14 },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1 },
  btnText: { fontSize: 15, fontWeight: "700" },
});
