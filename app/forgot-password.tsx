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
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
  PixelRatio,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";

import Toast from "@/components/Toast";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useToast } from "@/hooks/useToast";
import { config } from "@/lib/config";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [stage, setStage] = useState("email_verification");

  const { width } = useWindowDimensions();
  const scale = width / 375; // base scale for responsiveness
  const normalize = (size: number) =>
    Math.round(PixelRatio.roundToNearestPixel(size * scale));

  const { toast, showError, showSuccess, hideToast } = useToast();
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

  const submit = async () => {
    const backendUrl = config.backendUrl;

    try {
      if (stage === "email_verification") {
        if (!email.trim()) {
          showError("Email is required");
          return;
        }
        const res = await axios.post(`${backendUrl}/auth/send-otp`, {
          email: email.trim(),
          operation: "password-reset",
        });
        showSuccess(
          res?.data?.message || "If the account exists, a code was sent.",
        );
        setStage("otp");
      } else if (stage === "otp") {
        if (!otp.trim()) {
          showError("Enter the verification code");
          return;
        }
        const res = await axios.post(`${backendUrl}/auth/check-otp`, {
          email: email.trim(),
          otp: otp.trim(),
        });
        showSuccess(res?.data?.message || "Code verified. Set a new password.");
        setStage("reset");
      } else if (stage === "reset") {
        if (!newPassword) {
          showError("New password is required");
          return;
        }
        if (newPassword.length < 8) {
          showError("Password must be at least 8 characters");
          return;
        }
        const res = await axios.post(`${backendUrl}/auth/password-reset`, {
          email: email.trim(),
          password: newPassword,
        });
        showSuccess(
          res?.data?.message ||
            "Password reset successful. You can now sign in.",
        );
        router.replace("/login");
      }
    } catch (e: any) {
      console.error("Error resetting password:", e);
      showError(
        e?.response?.data?.message || e?.message || "Something went wrong",
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { padding: normalize(16) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                borderColor: borderCol,
                padding: normalize(20),
                width: width < 400 ? "100%" : 420,
              },
            ]}
          >
            <View style={[styles.brandRow, { marginBottom: normalize(16) }]}>
              <View
                style={[
                  styles.logoBadge,
                  {
                    backgroundColor: tint,
                    width: normalize(44),
                    height: normalize(44),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.logoText,
                    { color: buttonText, fontSize: normalize(18) },
                  ]}
                >
                  GZ
                </Text>
              </View>
              <Text
                style={[
                  styles.brandName,
                  { color: textColor, fontSize: normalize(20), flexShrink: 1 },
                ]}
              >
                Reset password
              </Text>
            </View>

            <View style={styles.form}>
              <View
                style={[
                  styles.field,
                  {
                    backgroundColor: fieldBg,
                    borderColor: borderCol,
                    paddingHorizontal: normalize(12),
                  },
                ]}
              >
                <Feather
                  name={getInputIcon()}
                  size={normalize(18)}
                  color={iconColor}
                  style={styles.icon}
                />
                <TextInput
                  style={[
                    styles.input,
                    { color: textColor, fontSize: normalize(15) },
                  ]}
                  placeholderTextColor={placeholder}
                  selectionColor={tint}
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  {...getInputProps()}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.authBtn,
                  {
                    backgroundColor: buttonBg,
                    paddingVertical: normalize(12),
                    borderRadius: normalize(10),
                  },
                ]}
                onPress={submit}
              >
                <Text
                  style={[
                    styles.authBtnText,
                    { color: buttonText, fontSize: normalize(15) },
                  ]}
                >
                  {getButtonText()}
                </Text>
              </TouchableOpacity>

              <View style={styles.foot}>
                <Text
                  style={[
                    styles.muted,
                    { color: muted, fontSize: normalize(14) },
                  ]}
                >
                  Remember your password?{" "}
                  <Text
                    style={[
                      styles.link,
                      { color: tint, fontSize: normalize(14) },
                    ]}
                    onPress={() => router.push("/login")}
                  >
                    Sign in
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoBadge: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontWeight: "800" },
  brandName: { fontWeight: "700" },
  form: { marginTop: 8 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  authBtn: {
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  authBtnText: { fontWeight: "700" },
  foot: { marginTop: 12, alignItems: "center" },
  link: { fontWeight: "600", textDecorationLine: "underline" },
});
