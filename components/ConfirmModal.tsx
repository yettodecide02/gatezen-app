/**
 * ConfirmModal — accessible destructive-action confirmation dialog.
 */
import React from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "#ef4444",
  icon = "alert-triangle",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const scheme = useColorScheme();
  const text = useThemeColor({}, "text");
  const cardBg = scheme === "dark" ? "#1f1f1f" : "#ffffff";
  const borderCol =
    scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${confirmColor}1a` },
            ]}
          >
            <Feather name={icon} size={28} color={confirmColor} />
          </View>
          <Text style={[styles.title, { color: text as string }]}>{title}</Text>
          <Text style={[styles.message, { color: text as string }]}>
            {message}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { borderColor: borderCol }]}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.75}
            >
              <Text style={[styles.btnText, { color: text as string }]}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: confirmColor, opacity: loading ? 0.6 : 1 },
              ]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.75}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.btnText, { color: "#fff" }]}>
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.65,
  },
  actions: { flexDirection: "row", gap: 12, width: "100%" },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  cancelBtn: { borderWidth: 1.5 },
  btnText: { fontWeight: "700", fontSize: 15 },
});
