// @ts-nocheck
import React, { useState } from "react";
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "@/components/Toast";
import FormField from "@/components/FormField";
import LoadingButton from "@/components/LoadingButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useToast } from "@/hooks/useToast";
import { config } from "@/lib/config";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [stage, setStage] = useState<"email" | "otp" | "reset">("email");
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background") as string;
  const textColor = useThemeColor({}, "text") as string;
  const tint = useThemeColor({}, "tint") as string;
  const iconColor = useThemeColor({}, "icon") as string;
  const isDark = theme === "dark";
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const fieldBg = isDark ? "#111111" : "#F8FAFC";
  const btnTextColor = isDark ? "#11181C" : "#ffffff";

  const STEPS = ["email", "otp", "reset"] as const;
  const stepIndex = STEPS.indexOf(stage);

  const submit = async () => {
    if (stage === "email" && !email.trim()) { showError("Email address is required"); return; }
    if (stage === "otp" && !otp.trim()) { showError("Please enter the verification code"); return; }
    if (stage === "reset") {
      if (!newPassword) { showError("New password is required"); return; }
      if (newPassword.length < 8) { showError("Password must be at least 8 characters"); return; }
    }
    setLoading(true);
    try {
      if (stage === "email") {
        const res = await axios.post(`${config.backendUrl}/auth/send-otp`, { email: email.trim(), operation: "password-reset" });
        showSuccess(res?.data?.message || "Verification code sent to your email.");
        setStage("otp");
      } else if (stage === "otp") {
        const res = await axios.post(`${config.backendUrl}/auth/check-otp`, { email: email.trim(), otp: otp.trim() });
        showSuccess(res?.data?.message || "Code verified — set your new password.");
        setStage("reset");
      } else {
        const res = await axios.post(`${config.backendUrl}/auth/password-reset`, { email: email.trim(), password: newPassword });
        showSuccess(res?.data?.message || "Password reset! You can now sign in.");
        setTimeout(() => router.replace("/login"), 1200);
      }
    } catch (e: any) {
      showError(e?.response?.data?.message ?? e?.message ?? "Something went wrong.");
    } finally { setLoading(false); }
  };

  const STEP_META = {
    email: { icon: "key" as const, heading: "Reset your password", hint: "Enter the email linked to your account and we'll send a verification code.", btnLabel: "Send verification code", btnLoadingLabel: "Sending…" },
    otp: { icon: "hash" as const, heading: "Enter verification code", hint: `We sent a 6-digit code to ${email || "your email"}. Check your inbox.`, btnLabel: "Verify code", btnLoadingLabel: "Verifying…" },
    reset: { icon: "lock" as const, heading: "Set new password", hint: "Choose a strong password you haven't used before.", btnLabel: "Reset password", btnLoadingLabel: "Resetting…" },
  };
  const meta = STEP_META[stage];

  return (
    <View style={[styles.safeArea, { backgroundColor: bg, paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.brandRow}>
              <View style={[styles.logoBadge, { backgroundColor: tint }]}>
                <Text style={[styles.logoText, { color: btnTextColor }]}>GZ</Text>
              </View>
              <View>
                <Text style={[styles.brandName, { color: textColor }]}>CGate</Text>
                <Text style={[styles.brandSub, { color: muted }]}>Community Portal</Text>
              </View>
            </View>

            {/* Step dots */}
            <View style={styles.stepRow}>
              {STEPS.map((s, i) => (
                <View key={s} style={[styles.stepDot, { backgroundColor: i <= stepIndex ? tint : (isDark ? "#333" : "#E5E7EB"), width: i === stepIndex ? 28 : 10 }]} />
              ))}
            </View>

            <View style={[styles.iconCircle, { backgroundColor: tint + "18" }]}>
              <Feather name={meta.icon} size={26} color={tint} />
            </View>
            <Text style={[styles.heading, { color: textColor }]}>{meta.heading}</Text>
            <Text style={[styles.hint, { color: muted }]}>{meta.hint}</Text>

            <View style={styles.form}>
              {stage === "email" && (
                <FormField label="Email address" icon="mail" required value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  returnKeyType="done" onSubmitEditing={submit} placeholder="you@example.com"
                  fieldBg={fieldBg} borderCol={borderCol} textColor={textColor} iconColor={iconColor} tint={tint} />
              )}
              {stage === "otp" && (
                <FormField label="Verification code" icon="hash" required value={otp} onChangeText={setOtp}
                  keyboardType="numeric" autoCapitalize="none" autoCorrect={false}
                  returnKeyType="done" onSubmitEditing={submit} placeholder="6-digit code"
                  fieldBg={fieldBg} borderCol={borderCol} textColor={textColor} iconColor={iconColor} tint={tint} />
              )}
              {stage === "reset" && (
                <FormField label="New password" icon="lock" required value={newPassword} onChangeText={setNewPassword}
                  secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false}
                  returnKeyType="done" onSubmitEditing={submit} placeholder="Min. 8 characters"
                  rightIcon={showPw ? "eye-off" : "eye"} onRightIconPress={() => setShowPw(s => !s)}
                  fieldBg={fieldBg} borderCol={borderCol} textColor={textColor} iconColor={iconColor} tint={tint} />
              )}
              <LoadingButton label={meta.btnLabel} loadingLabel={meta.btnLoadingLabel} loading={loading}
                bgColor={tint} textColor={btnTextColor} onPress={submit} style={styles.submitBtn} />
              {stage !== "email" && (
                <LoadingButton label="← Back" bgColor={tint} variant="ghost" size="sm" fullWidth={false}
                  onPress={() => setStage(stage === "reset" ? "otp" : "email")} style={styles.backBtn} />
              )}
            </View>

            <View style={styles.foot}>
              <Text style={[styles.footText, { color: muted }]}>
                Remember your password?{" "}
                <Text style={[styles.link, { color: tint }]} onPress={() => router.push("/login")}>Sign in</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 440, borderRadius: 24, borderWidth: 1, padding: 28 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  logoBadge: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  logoText: { fontWeight: "800", fontSize: 18 },
  brandName: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  brandSub: { fontSize: 12, marginTop: 2 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24 },
  stepDot: { height: 6, borderRadius: 3 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 14, alignSelf: "flex-start" },
  heading: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  hint: { fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 22, opacity: 0.85 },
  form: {},
  submitBtn: { marginTop: 4, marginBottom: 10 },
  backBtn: { alignSelf: "center", marginBottom: 4 },
  foot: { marginTop: 16, alignItems: "center" },
  footText: { fontSize: 14 },
  link: { fontWeight: "600", textDecorationLine: "underline" },
});
