// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Image,
  Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { logout, getUser } from "@/lib/auth";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  apartment?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    maintenance: boolean;
    payments: boolean;
    announcements: boolean;
  };
};

export default function Profile() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    id: "",
    name: "",
    email: "",
    phone: "",
    apartment: "",
    emergencyContact: {
      name: "",
      phone: "",
      relationship: "",
    },
    notifications: {
      email: true,
      push: true,
      maintenance: true,
      payments: true,
      announcements: true,
    },
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = await getUser();

      // TODO: Implement actual profile API call
      // const response = await profileAPI.getUserProfile(user.id);
      // setProfile(response.data);

      // For now, using minimal profile data from auth
      const basicProfile: UserProfile = {
        id: user?.id || "1",
        name: user?.name || "User",
        email: user?.email || "",
        phone: "",
        apartment: "",
        emergencyContact: {
          name: "",
          phone: "",
          relationship: "",
        },
        notifications: {
          email: true,
          push: true,
          maintenance: true,
          payments: true,
          announcements: true,
        },
      };

      setProfile(basicProfile);
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      // TODO: Implement actual profile update API call
      // await profileAPI.updateProfile(profile);

      Alert.alert("Success", "Profile updated successfully!");
      setEditing(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

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

  const updateNotificationSetting = (
    key: keyof UserProfile["notifications"],
    value: boolean
  ) => {
    setProfile((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: bg, paddingTop: insets.top },
        ]}
      >
        <Text style={[styles.loadingText, { color: text }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: cardBg, borderColor: borderCol },
        ]}
      >
        <View style={styles.headerLeft}>
          <Feather name="user" size={24} color={text} />
          <Text style={[styles.headerTitle, { color: text }]}>Profile</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setEditing(!editing)}
            style={styles.headerIcon}
          >
            <Feather name={editing ? "x" : "edit"} size={20} color={tint} />
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.headerIcon}>
            <Feather name="log-out" size={20} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information */}
        <View
          style={[
            styles.section,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: text }]}>
            Personal Information
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: text }]}>Full Name</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={profile.name}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, name: text }))
                }
              />
            ) : (
              <Text style={[styles.value, { color: text }]}>
                {profile.name}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: text }]}>Email</Text>
            <Text style={[styles.value, { color: text, opacity: 0.7 }]}>
              {profile.email}
            </Text>
            <Text style={[styles.note, { color: text, opacity: 0.5 }]}>
              Contact admin to change email
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: text }]}>Phone</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={profile.phone}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, phone: text }))
                }
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={[styles.value, { color: text }]}>
                {profile.phone}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: text }]}>Apartment</Text>
            <Text style={[styles.value, { color: text, opacity: 0.7 }]}>
              {profile.apartment}
            </Text>
            <Text style={[styles.note, { color: text, opacity: 0.5 }]}>
              Contact admin to change apartment details
            </Text>
          </View>
        </View>

        {/* Emergency Contact */}
        <View
          style={[
            styles.section,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: text }]}>
            Emergency Contact
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: text }]}>Name</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={profile.emergencyContact?.name}
                onChangeText={(text) =>
                  setProfile((prev) => ({
                    ...prev,
                    emergencyContact: { ...prev.emergencyContact!, name: text },
                  }))
                }
              />
            ) : (
              <Text style={[styles.value, { color: text }]}>
                {profile.emergencyContact?.name}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: text }]}>Phone</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={profile.emergencyContact?.phone}
                onChangeText={(text) =>
                  setProfile((prev) => ({
                    ...prev,
                    emergencyContact: {
                      ...prev.emergencyContact!,
                      phone: text,
                    },
                  }))
                }
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={[styles.value, { color: text }]}>
                {profile.emergencyContact?.phone}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: text }]}>Relationship</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { color: text, borderColor: borderCol }]}
                value={profile.emergencyContact?.relationship}
                onChangeText={(text) =>
                  setProfile((prev) => ({
                    ...prev,
                    emergencyContact: {
                      ...prev.emergencyContact!,
                      relationship: text,
                    },
                  }))
                }
              />
            ) : (
              <Text style={[styles.value, { color: text }]}>
                {profile.emergencyContact?.relationship}
              </Text>
            )}
          </View>
        </View>

        {/* Notification Preferences */}
        <View
          style={[
            styles.section,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: text }]}>
            Notification Preferences
          </Text>

          <View style={styles.notificationItem}>
            <View>
              <Text style={[styles.notificationLabel, { color: text }]}>
                Email Notifications
              </Text>
              <Text
                style={[styles.notificationDesc, { color: text, opacity: 0.7 }]}
              >
                Receive notifications via email
              </Text>
            </View>
            <Switch
              value={profile.notifications.email}
              onValueChange={(value) =>
                updateNotificationSetting("email", value)
              }
              trackColor={{ false: "#767577", true: tint + "44" }}
              thumbColor={profile.notifications.email ? tint : "#f4f3f4"}
            />
          </View>

          <View style={styles.notificationItem}>
            <View>
              <Text style={[styles.notificationLabel, { color: text }]}>
                Push Notifications
              </Text>
              <Text
                style={[styles.notificationDesc, { color: text, opacity: 0.7 }]}
              >
                Receive push notifications on your device
              </Text>
            </View>
            <Switch
              value={profile.notifications.push}
              onValueChange={(value) =>
                updateNotificationSetting("push", value)
              }
              trackColor={{ false: "#767577", true: tint + "44" }}
              thumbColor={profile.notifications.push ? tint : "#f4f3f4"}
            />
          </View>

          <View style={styles.notificationItem}>
            <View>
              <Text style={[styles.notificationLabel, { color: text }]}>
                Maintenance Updates
              </Text>
              <Text
                style={[styles.notificationDesc, { color: text, opacity: 0.7 }]}
              >
                Updates on maintenance requests
              </Text>
            </View>
            <Switch
              value={profile.notifications.maintenance}
              onValueChange={(value) =>
                updateNotificationSetting("maintenance", value)
              }
              trackColor={{ false: "#767577", true: tint + "44" }}
              thumbColor={profile.notifications.maintenance ? tint : "#f4f3f4"}
            />
          </View>

          <View style={styles.notificationItem}>
            <View>
              <Text style={[styles.notificationLabel, { color: text }]}>
                Payment Reminders
              </Text>
              <Text
                style={[styles.notificationDesc, { color: text, opacity: 0.7 }]}
              >
                Reminders for pending payments
              </Text>
            </View>
            <Switch
              value={profile.notifications.payments}
              onValueChange={(value) =>
                updateNotificationSetting("payments", value)
              }
              trackColor={{ false: "#767577", true: tint + "44" }}
              thumbColor={profile.notifications.payments ? tint : "#f4f3f4"}
            />
          </View>

          <View style={styles.notificationItem}>
            <View>
              <Text style={[styles.notificationLabel, { color: text }]}>
                Community Announcements
              </Text>
              <Text
                style={[styles.notificationDesc, { color: text, opacity: 0.7 }]}
              >
                Important community updates
              </Text>
            </View>
            <Switch
              value={profile.notifications.announcements}
              onValueChange={(value) =>
                updateNotificationSetting("announcements", value)
              }
              trackColor={{ false: "#767577", true: tint + "44" }}
              thumbColor={
                profile.notifications.announcements ? tint : "#f4f3f4"
              }
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {editing && (
            <Pressable style={styles.saveButton} onPress={handleSaveProfile}>
              <Feather name="check" size={16} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 16 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },

  content: {
    flex: 1,
    padding: 8,
  },

  profileCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  profileApartment: {
    fontSize: 14,
  },

  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    marginBottom: 4,
  },
  note: {
    fontSize: 12,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },

  notificationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  notificationDesc: {
    fontSize: 12,
  },

  actionsSection: {
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
