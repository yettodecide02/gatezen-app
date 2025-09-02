// @ts-nocheck
import React, { useState } from "react";
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

import supabase from "@/lib/supabase";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [stage, setStage] = useState("email_verification");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
  const successColor = "#10b981";
  const errorColor = "#f87171";

  const submit = async () => {
    setMsg("");
    setErr("");

    const backendUrl =
      process.env.EXPO_PUBLIC_BACKEND_URL ||
      process.env.EXPO_BACKEND_URL ||
      "http://localhost:3000";

    try {
      if (stage === "email_verification") {
        if (!email.trim()) {
          setErr("Email is required");
          return;
        }
        const res = await axios.post(`${backendUrl}/send-otp`, {
          email: email.trim(),
        });
        setMsg(res?.data?.message || "If the account exists, a code was sent.");
        setStage("otp");
      } else if (stage === "otp") {
        if (!otp.trim()) {
          setErr("Enter the verification code");
          return;
        }
        const res = await axios.post(`${backendUrl}/check-otp`, {
          email: email.trim(),
          otp: otp.trim(),
        });
        setMsg(res?.data?.message || "Code verified. Set a new password.");
        setStage("reset");
      } else if (stage === "reset") {
        if (!newPassword) {
          setErr("New password is required");
          return;
        }
        const authP = await supabase.auth.updateUser({ password: newPassword });
        if (!authP) {
          setErr("Error updating password");
          return;
        }
        const res = await axios.post(`${backendUrl}/password-reset`, {
          email: email.trim(),
          password: newPassword,
        });
        if (!res) {
          setErr("Error resetting password");
          return;
        }
        setMsg(
          res?.data?.message ||
            "Password reset successful. You can now sign in."
        );
        router.replace("/login");
      }
    } catch (e: any) {
      console.error("Error resetting password:", e);
      setErr(
        e?.response?.data?.message || e?.message || "Something went wrong"
      );
    }
  };

  const getButtonText = () => {
    switch (stage) {
      case "email_verification":
        return "Send code";
      case "otp":
        return "Verify code";
      case "reset":
        return "Reset password";
      default:
        return "Continue";
    }
  };

  const getInputIcon = () => {
    switch (stage) {
      case "email_verification":
        return "mail";
      case "otp":
        return "hash";
      case "reset":
        return "lock";
      default:
        return "mail";
    }
  };

  const getInputProps = () => {
    switch (stage) {
      case "email_verification":
        return {
          value: email,
          onChangeText: setEmail,
          placeholder: "Your account email",
          keyboardType: "email-address" as const,
          autoCapitalize: "none" as const,
          autoCorrect: false,
        };
      case "otp":
        return {
          value: otp,
          onChangeText: setOtp,
          placeholder: "Enter verification code",
          keyboardType: "numeric" as const,
          autoCapitalize: "none" as const,
          autoCorrect: false,
        };
      case "reset":
        return {
          value: newPassword,
          onChangeText: setNewPassword,
          placeholder: "New password",
          secureTextEntry: true,
          autoCapitalize: "none" as const,
          autoCorrect: false,
        };
      default:
        return {};
    }
  };

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
              Reset password
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
              name={getInputIcon()}
              size={18}
              color={iconColor}
              style={styles.icon}
            />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholderTextColor={placeholder}
              selectionColor={tint}
              returnKeyType="done"
              onSubmitEditing={submit}
              {...getInputProps()}
            />
          </View>

          <TouchableOpacity
            style={[styles.authBtn, { backgroundColor: buttonBg }]}
            onPress={submit}
          >
            <Text style={[styles.authBtnText, { color: buttonText }]}>
              {getButtonText()}
            </Text>
          </TouchableOpacity>

          {msg ? (
            <Text style={[styles.message, { color: successColor }]}>{msg}</Text>
          ) : null}

          {err ? (
            <Text style={[styles.error, { color: errorColor }]}>{err}</Text>
          ) : null}

          <View style={styles.foot}>
            <Text style={[styles.muted, { color: muted }]}>
              Remember your password?{" "}
              <Text
                style={[styles.link, { color: tint }]}
                onPress={() => router.push("/login")}
              >
                Sign in
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
  authBtn: {
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  authBtnText: { fontWeight: "700" },
  message: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
  },
  error: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
  },
  foot: { marginTop: 12, alignItems: "center" },
  muted: {},
  link: { fontWeight: "600", textDecorationLine: "underline" },
});
