import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export type ToastType = "error" | "success" | "warning" | "info";

const TOAST_CONFIG: Record<
  ToastType,
  {
    bg: string;
    border: string;
    icon: React.ComponentProps<typeof Feather>["name"];
  }
> = {
  success: { bg: "#10b981", border: "#059669", icon: "check-circle" },
  error: { bg: "#ef4444", border: "#dc2626", icon: "x-circle" },
  warning: { bg: "#f59e0b", border: "#d97706", icon: "alert-triangle" },
  info: { bg: "#3b82f6", border: "#2563eb", icon: "info" },
};

interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({ visible, message, type, onHide }) => {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  }, [translateY, opacity, scaleAnim, onHide]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
      ]).start();

      const duration = type === "error" || type === "warning" ? 4500 : 3000;
      timerRef.current = setTimeout(dismiss, duration);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [visible, type, dismiss, translateY, opacity, scaleAnim]);

  if (!visible) return null;

  const cfg = TOAST_CONFIG[type] ?? TOAST_CONFIG.info;

  return (
    <SafeAreaView style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: cfg.bg,
            borderLeftColor: cfg.border,
            transform: [{ translateY }, { scale: scaleAnim }],
            opacity,
          },
        ]}
      >
        <Feather name={cfg.icon} size={20} color="#fff" style={styles.icon} />
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
        <TouchableOpacity
          onPress={dismiss}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="x" size={16} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    paddingTop: 8,
  } as any,
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
    marginHorizontal: 16,
    maxWidth: Math.min(width - 32, 480),
    minWidth: Math.min(width * 0.75, 280),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  icon: { marginRight: 10, flexShrink: 0 },
  message: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  closeBtn: { marginLeft: 10, flexShrink: 0 },
});

export default Toast;
