// @ts-nocheck
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function DummyScreen() {
  const text = useThemeColor({}, "text");
  const bg = useThemeColor({}, "background");
  const icon = useThemeColor({}, "icon");
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: text }]}>Coming Soon</Text>
      <Text style={[styles.sub, { color: icon }]}>
        This is a placeholder tab.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  sub: { fontSize: 13 },
});
