/**
 * ScreenHeader — consistent page header with optional back/right actions.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightIcon?: React.ComponentProps<typeof Feather>["name"];
  onRightPress?: () => void;
  rightLabel?: string;
  accentColor?: string;
}

export default function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBackPress,
  rightIcon,
  onRightPress,
  rightLabel,
  accentColor,
}: ScreenHeaderProps) {
  const text = useThemeColor({}, "text") as string;
  const iconCol = useThemeColor({}, "icon") as string;
  const tint = useThemeColor({}, "tint") as string;
  const accent = accentColor ?? tint;

  return (
    <View style={styles.header}>
      {/* Left — back */}
      {showBack ? (
        <Pressable
          onPress={onBackPress ?? (() => router.back())}
          style={({ pressed }) => [
            styles.side,
            { opacity: pressed ? 0.55 : 1 },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={text} />
        </Pressable>
      ) : (
        <View style={styles.side} />
      )}

      {/* Centre */}
      <View style={styles.centre}>
        <Text style={[styles.title, { color: text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: iconCol }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right — optional action */}
      {rightIcon || rightLabel ? (
        <Pressable
          onPress={onRightPress}
          style={({ pressed }) => [
            styles.side,
            styles.rightSide,
            { opacity: pressed ? 0.55 : 1 },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {rightIcon && <Feather name={rightIcon} size={20} color={accent} />}
          {rightLabel && (
            <Text style={[styles.rightLabel, { color: accent }]}>
              {rightLabel}
            </Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.side} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 4,
  },
  side: { width: 44, alignItems: "center" },
  rightSide: { alignItems: "flex-end" },
  centre: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", letterSpacing: 0.2 },
  subtitle: { fontSize: 12, marginTop: 1 },
  rightLabel: { fontSize: 14, fontWeight: "600" },
});
