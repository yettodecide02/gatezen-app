// @ts-nocheck
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { logout } from "@/lib/auth";

export default function PendingScreen() {
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const muted = iconColor;
  const buttonBg = tint;
  const buttonText = theme === "dark" ? "#11181C" : "#ffffff";

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: borderCol },
        ]}
      >
        <View style={styles.iconContainer}>
          <Feather name="clock" size={48} color={tint} />
        </View>

        <Text style={[styles.title, { color: textColor }]}>
          Account Pending Approval
        </Text>

        <Text style={[styles.message, { color: muted }]}>
          Your account is currently pending approval from an administrator.
          You'll receive an email notification once your account has been
          approved.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonBg }]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color={buttonText} />
          <Text style={[styles.buttonText, { color: buttonText }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 32,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    minWidth: 120,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 16,
  },
});
