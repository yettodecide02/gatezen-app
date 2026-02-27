// @ts-nocheck
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function EmergencyAlert() {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const muted = isDark ? "#94A3B8" : "#64748B";
  const borderCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: borderCol, alignItems: "center", justifyContent: "center" }}>
          <Feather name="arrow-left" size={18} color={text} />
        </Pressable>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#EF444418", alignItems: "center", justifyContent: "center" }}>
          <Feather name="alert-octagon" size={32} color="#EF4444" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: text, textAlign: "center" }}>Emergency Alert</Text>
        <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: tint + "15" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: tint }}>Coming Soon</Text>
        </View>
        <Text style={{ fontSize: 14, color: muted, textAlign: "center", lineHeight: 20 }}>Quick emergency contact system. This feature is coming in the next update.</Text>
      </View>
    </View>
  );
}
