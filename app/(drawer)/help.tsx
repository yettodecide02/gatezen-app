// @ts-nocheck
import { StyleSheet, Text, View } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function Help() {
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={{ color: text, fontSize: 18 }}>Help</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
