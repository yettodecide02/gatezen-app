/**
 * EmptyState — friendly placeholder for empty lists or error states.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";
import LoadingButton from "./LoadingButton";

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Feather>["name"];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
}

export default function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  onAction,
  accentColor,
}: EmptyStateProps) {
  const text = useThemeColor({}, "text") as string;
  const tint = useThemeColor({}, "tint") as string;
  const accent = accentColor ?? "#6b7280";

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: `${accent}18` }]}>
        <Feather name={icon} size={36} color={accent} />
      </View>
      <Text style={[styles.title, { color: text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: text }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <LoadingButton
          label={actionLabel}
          bgColor={tint}
          onPress={onAction}
          style={styles.actionBtn}
          fullWidth={false}
          size="sm"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
    opacity: 0.55,
  },
  actionBtn: { marginTop: 20 },
});
