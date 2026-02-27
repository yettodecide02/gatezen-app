/**
 * FormField — labeled input with icon, inline error, and password-toggle support.
 */
import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface FormFieldProps extends TextInputProps {
  label: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  error?: string;
  required?: boolean;
  rightIcon?: React.ComponentProps<typeof Feather>["name"];
  onRightIconPress?: () => void;
  /* Theme colours passed from parent so no extra hook inside */
  fieldBg: string;
  borderCol: string;
  textColor: string;
  iconColor: string;
  tint: string;
}

const FormField = React.forwardRef<TextInput, FormFieldProps>(
  function FormField(
    {
      label,
      icon,
      error,
      required,
      rightIcon,
      onRightIconPress,
      fieldBg,
      borderCol,
      textColor,
      iconColor,
      tint,
      ...inputProps
    }: FormFieldProps,
    ref,
  ) {
    const hasError = Boolean(error);

    return (
      <View style={styles.wrapper}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: textColor }]}>
            {label}
            {required && <Text style={styles.star}> *</Text>}
          </Text>
        </View>

        <View
          style={[
            styles.field,
            {
              backgroundColor: fieldBg,
              borderColor: hasError ? "#ef4444" : borderCol,
            },
          ]}
        >
          {icon && (
            <Feather
              name={icon}
              size={18}
              color={hasError ? "#ef4444" : iconColor}
              style={styles.leftIcon}
            />
          )}
          <TextInput
            ref={ref}
            style={[styles.input, { color: textColor }]}
            placeholderTextColor={iconColor}
            selectionColor={tint}
            {...inputProps}
          />
          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={rightIcon} size={18} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>

        {hasError && (
          <View style={styles.errorRow}>
            <Feather name="alert-circle" size={12} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  },
);

export default FormField;

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  labelRow: { flexDirection: "row", marginBottom: 6 },
  label: { fontSize: 13, fontWeight: "600", letterSpacing: 0.2 },
  star: { color: "#ef4444" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 11,
    paddingHorizontal: 12,
  },
  leftIcon: { marginRight: 8, flexShrink: 0 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15 },
  rightBtn: { padding: 6, marginLeft: 4 },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  errorText: { fontSize: 12, color: "#ef4444", flex: 1 },
});
