// @ts-nocheck
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function DashboardScreen() {
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: text }]}>Dashboard</Text>
      <Text style={[styles.subtitle, { color: text }]}>
        Bottom nav is active. Use tabs to navigate.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { marginTop: 8, opacity: 0.7 },
});
