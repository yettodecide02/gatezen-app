import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface LoadingButtonProps extends TouchableOpacityProps {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  bgColor: string;
  textColor?: string;
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const SIZE: Record<
  string,
  { py: number; px: number; fs: number; is: number; gap: number }
> = {
  sm: { py: 9, px: 16, fs: 13, is: 15, gap: 5 },
  md: { py: 13, px: 20, fs: 15, is: 18, gap: 8 },
  lg: { py: 16, px: 24, fs: 16, is: 20, gap: 10 },
};

export default function LoadingButton({
  label,
  loadingLabel,
  loading = false,
  icon,
  bgColor,
  textColor = "#ffffff",
  variant = "solid",
  size = "md",
  fullWidth = true,
  style,
  disabled,
  ...rest
}: LoadingButtonProps) {
  const sz = SIZE[size];
  const isDisabled = disabled || loading;
  const labelColor = variant === "solid" ? textColor : bgColor;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          paddingVertical: sz.py,
          paddingHorizontal: sz.px,
          gap: sz.gap,
          backgroundColor: variant === "solid" ? bgColor : "transparent",
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: variant === "outline" ? bgColor : "transparent",
          alignSelf: fullWidth ? undefined : ("flex-start" as const),
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : icon ? (
        <Feather name={icon} size={sz.is} color={labelColor} />
      ) : null}
      <Text style={[styles.label, { fontSize: sz.fs, color: labelColor }]}>
        {loading ? (loadingLabel ?? label) : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontWeight: "700", letterSpacing: 0.2 },
});
