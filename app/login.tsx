// @ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";

import { isAuthed, setToken, setUser } from "@/lib/auth";
import GoogleSignin from "@/components/GoogleSignin";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const fieldBg = theme === "dark" ? "#181818" : "#f3f4f6";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const muted = iconColor;
  const placeholder = iconColor;
  const buttonBg = tint;
  const buttonText = theme === "dark" ? "#11181C" : "#ffffff";

  useEffect(() => {
    (async () => {
      if (await isAuthed()) router.replace("/(tabs)/home");
    })();
  }, []);

  const submit = useCallback(async () => {
    if (!email || !password) return;
    setLoading(true);
    try {

      const backendUrl =
        process.env.EXPO_PUBLIC_BACKEND_URL ||
        "http://localhost:3000";

      try {
        const res = await axios.post(`${backendUrl}/login`, {
          email,
          password,
        });
        if (!res?.data?.jwttoken) {
          setErr(
            "Login succeeded, but backend did not return a token."
          );
          return;
        }

        await setToken(res.data.jwttoken);
        if (res.data.user) await setUser(res.data.user);

        router.replace("/(tabs)/home");
      } catch (errAny: any) {
        const status = errAny?.response?.status;
        const code = errAny?.code;
        if (status === 401 || status === 400) {
          setErr("Backend rejected credentials. Check your email/password.");
        } else if (code === "ERR_NETWORK") {
          setErr(
            `Cannot reach backend from device. Ensure EXPO_BACKEND_URL points to your computer's LAN IP (e.g., http://192.168.x.x:PORT).`
          );
        } else {
          setErr(`Backend error. Status: ${status ?? "unknown"}`);
        }
        return;
      }
    } catch {
      setErr("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: borderCol },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={[styles.logoBadge, { backgroundColor: tint }]}>
            <Text style={[styles.logoText, { color: buttonText }]}>GZ</Text>
          </View>
          <View>
            <Text style={[styles.brandName, { color: textColor }]}>
              GateZen
            </Text>
            <Text style={[styles.brandSub, { color: muted }]}>
              Community Portal
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <View
            style={[
              styles.field,
              { backgroundColor: fieldBg, borderColor: borderCol },
            ]}
          >
            <Feather
              name="mail"
              size={18}
              color={iconColor}
              style={styles.icon}
            />
            <TextInput
              style={[styles.input, { color: textColor }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="next"
              onSubmitEditing={() => {}}
              placeholderTextColor={placeholder}
              selectionColor={tint}
            />
          </View>

          <View
            style={[
              styles.field,
              { backgroundColor: fieldBg, borderColor: borderCol },
            ]}
          >
            <Feather
              name="lock"
              size={18}
              color={iconColor}
              style={styles.icon}
            />
            <TextInput
              style={[styles.input, { color: textColor }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="done"
              onSubmitEditing={submit}
              placeholderTextColor={placeholder}
              selectionColor={tint}
            />
            <TouchableOpacity
              style={styles.pwToggle}
              onPress={() => setShowPw((s) => !s)}
            >
              <Feather
                name={showPw ? "eye-off" : "eye"}
                size={18}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.forgotPassword}>
            <Text
              style={[styles.link, { color: tint }]}
              onPress={() => router.push("/forgot-password")}
            >
              Forgot password?
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.authBtn,
              { backgroundColor: buttonBg },
              loading && styles.authBtnDisabled,
            ]}
            onPress={submit}
            disabled={loading}
          >
            <Feather name="log-in" size={18} color={buttonText} />
            <Text style={[styles.authBtnText, { color: buttonText }]}>
              {loading ? "Signing in…" : "Sign In"}
            </Text>
          </TouchableOpacity>

          <GoogleSignin />

          {err ? <Text style={[styles.error]}>{err}</Text> : null}

          <View style={styles.foot}>
            <Text style={[styles.muted, { color: muted }]}>
              New here?{" "}
              <Text
                style={[styles.link, { color: tint }]}
                onPress={() => router.push("/register")}
              >
                Create an account
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  logoBadge: {
    height: 44,
    width: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontWeight: "800" },
  brandName: { fontSize: 20, fontWeight: "700" },
  brandSub: { fontSize: 12 },
  form: { marginTop: 8 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  pwToggle: { padding: 8 },
  forgotPassword: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  authBtn: {
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  authBtnDisabled: { opacity: 0.7 },
  authBtnText: { fontWeight: "700" },
  error: { color: "#f87171", marginTop: 10, textAlign: "center" },

  foot: { marginTop: 12, alignItems: "center" },
  muted: {},
  link: { fontWeight: "600", textDecorationLine: "underline" },
});
