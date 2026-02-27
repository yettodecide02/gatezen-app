/**
 * Skeleton loading placeholders that pulse with a shimmer effect.
 * Usage: <SkeletonCard />, <SkeletonListItem />, <Skeleton width={120} height={14} />
 */
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";

/* ---------- Base shimmer rect ---------- */
interface SkeletonProps {
  width?: number | `${number}%` | "100%";
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const scheme = useColorScheme();
  const base = scheme === "dark" ? "#2a2a2a" : "#e5e7eb";
  const shine = scheme === "dark" ? "#3f3f3f" : "#f3f4f6";

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 750,
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 750,
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const bg = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [base, shine],
  });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: bg },
        style,
      ]}
    />
  );
}

/* ---------- Composites ---------- */
export function SkeletonCard() {
  const scheme = useColorScheme();
  const cardBg = scheme === "dark" ? "#1f1f1f" : "#ffffff";
  return (
    <View style={[s.card, { backgroundColor: cardBg }]}>
      <View style={s.row}>
        <Skeleton width={44} height={44} borderRadius={10} />
        <View style={{ flex: 1, gap: 7, marginLeft: 12 }}>
          <Skeleton height={14} width="55%" />
          <Skeleton height={11} width="35%" />
        </View>
      </View>
      <Skeleton height={12} style={{ marginTop: 12 }} />
      <Skeleton height={12} width="75%" style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonListItem() {
  const scheme = useColorScheme();
  const cardBg = scheme === "dark" ? "#1f1f1f" : "#ffffff";
  return (
    <View style={[s.listItem, { backgroundColor: cardBg }]}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
        <Skeleton height={14} width="50%" />
        <Skeleton height={11} width="32%" />
      </View>
      <Skeleton width={56} height={24} borderRadius={12} />
    </View>
  );
}

export function SkeletonStatCard() {
  const scheme = useColorScheme();
  const cardBg = scheme === "dark" ? "#1f1f1f" : "#ffffff";
  return (
    <View style={[s.statCard, { backgroundColor: cardBg }]}>
      <Skeleton width={40} height={40} borderRadius={10} />
      <Skeleton height={28} width="50%" style={{ marginTop: 14 }} />
      <Skeleton height={11} width="65%" style={{ marginTop: 8 }} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center" },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  statCard: { padding: 16, borderRadius: 14, flex: 1 },
});
