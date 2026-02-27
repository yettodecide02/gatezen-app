// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import axios from "axios";
import { router } from "expo-router";
import { isAuthed, setToken, setUser } from "@/lib/auth";
import GoogleSignin from "@/components/GoogleSignin";
import Toast from "@/components/Toast";
import FormField from "@/components/FormField";
import LoadingButton from "@/components/LoadingButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useToast } from "@/hooks/useToast";
import { config } from "@/lib/config";
import { registerForPushNotifications } from "@/lib/notifications";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const pwRef = useRef<TextInput>(null);

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

  useEffect(() => {
    (async () => { if (await isAuthed()) router.replace("/(tabs)/home"); })();
  }, []);

  const validate = () => {
    let valid = true;
    if (!email.trim()) { setEmailErr("Email is required"); valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setEmailErr("Enter a valid email"); valid = false; }
    else setEmailErr("");
    if (!password) { setPasswordErr("Password is required"); valid = false; }
    else setPasswordErr("");
    return valid;
  };

  const submit = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${config.backendUrl}/auth/login`, { email: email.trim(), password });
      if (!res?.data?.jwttoken) { showError("Login succeeded but no token returned."); return; }
      await setToken(res.data.jwttoken);
      if (res.data.user) await setUser(res.data.user);
      registerForPushNotifications(res.data.jwttoken).catch(() => {});
      showSuccess("Welcome back!");
      if (res.data.user.status === "PENDING") router.replace("/pending");
      else if (res.data.user.role === "ADMIN") router.replace("/admin");
      else if (res.data.user.role === "GATEKEEPER") router.replace("/gatekeeper/visitors");
      else router.replace("/(tabs)/home");
    } catch (err: any) {
      const status = err?.response?.status;
      const code = err?.code;
      if (status === 401 || status === 400) showError("Invalid email or password.");
      else if (code === "ERR_NETWORK") showError("Cannot reach server. Check your connection.");
      else showError(err?.response?.data?.error ?? "Login failed. Please try again.");
    } finally { setLoading(false); }
  }, [email, password]);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bg }]} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={[styles.logoBadge, { backgroundColor: tint }]}>
              <Text style={[styles.logoText, { color: btnTextColor }]}>GZ</Text>
            </View>
            <View>
              <Text style={[styles.brandName, { color: textColor }]}>CGate</Text>
              <Text style={[styles.brandSub, { color: muted }]}>Community Portal</Text>
            </View>
          </View>

          <Text style={[styles.heading, { color: textColor }]}>Sign in to your account</Text>

          <View style={styles.form}>
            <FormField label="Email address" icon="mail" required error={emailErr} value={email}
              onChangeText={(v) => { setEmail(v); if (emailErr) setEmailErr(""); }}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              autoComplete="off" returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()}
              placeholder="you@example.com" fieldBg={fieldBg} borderCol={borderCol}
              textColor={textColor} iconColor={iconColor} tint={tint} />

            <FormField label="Password" icon="lock" required error={passwordErr} value={password}
              onChangeText={(v) => { setPassword(v); if (passwordErr) setPasswordErr(""); }}
              secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false}
              autoComplete="off" returnKeyType="done" onSubmitEditing={submit}
              placeholder="Your password" rightIcon={showPw ? "eye-off" : "eye"}
              onRightIconPress={() => setShowPw(s => !s)} fieldBg={fieldBg}
              borderCol={borderCol} textColor={textColor} iconColor={iconColor} tint={tint} />

            <View style={styles.forgotRow}>
              <Text style={[styles.link, { color: tint }]} onPress={() => router.push("/forgot-password")}>
                Forgot password?
              </Text>
            </View>

            <LoadingButton label="Sign In" loadingLabel="Signing in…" loading={loading}
              icon="log-in" bgColor={tint} textColor={btnTextColor} onPress={submit} style={styles.submitBtn} />
            <GoogleSignin />
            <View style={styles.foot}>
              <Text style={[styles.footText, { color: muted }]}>
                New here?{" "}
                <Text style={[styles.link, { color: tint }]} onPress={() => router.push("/register")}>
                  Create an account
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 440, padding: 28, borderRadius: 24, borderWidth: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  logoBadge: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  logoText: { fontWeight: "800", fontSize: 18 },
  brandName: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  brandSub: { fontSize: 12, marginTop: 2 },
  heading: { fontSize: 22, fontWeight: "800", marginBottom: 22, letterSpacing: -0.5 },
  form: { gap: 0 },
  forgotRow: { alignItems: "flex-end", marginTop: -4, marginBottom: 16 },
  link: { fontWeight: "600", textDecorationLine: "underline", fontSize: 14 },
  submitBtn: { marginBottom: 14 },
  foot: { marginTop: 16, alignItems: "center" },
  footText: { fontSize: 14 },
});
