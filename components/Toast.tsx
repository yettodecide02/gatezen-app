import React, { useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface ToastProps {
  visible: boolean;
  message: string;
  type: "error" | "success";
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({ visible, message, type, onHide }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // ✅ FIXED: Memoize hideToast to fix dependency warning
  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  }, [slideAnim, opacityAnim, onHide]);

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        hideToast();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, slideAnim, opacityAnim, hideToast]);

  if (!visible) return null;

  const backgroundColor = type === "error" ? "#ef4444" : "#10b981";
  const iconName = type === "error" ? "x-circle" : "check-circle";

  return (
    <SafeAreaView style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor,
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Feather
          name={iconName}
          size={20}
          color="#ffffff"
          style={styles.icon}
        />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
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
    paddingTop: 40,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    maxWidth: width - 32,
    minWidth: width * 0.7,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
});

export default Toast;
