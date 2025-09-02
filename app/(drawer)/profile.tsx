// @ts-nocheck
import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { logout } from "@/lib/auth";

export default function Profile() {
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/login");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: text }]}>Profile</Text>

      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: iconColor }]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={20} color={tint} />
        <Text style={[styles.logoutText, { color: tint }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 40,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 120,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
