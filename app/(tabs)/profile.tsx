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
  Switch,
  Dimensions,
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
  block: string;
  unit: string;
  communityName: string;
  notifications: {
    email: boolean;
    push: boolean;
    maintenance: boolean;
    payments: boolean;
    announcements: boolean;
  };
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BREAKPOINT_SM = 375;
const BREAKPOINT_MD = 768;

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
    block: "",
    unit: "",
    communityName: "",
    notifications: {
      email: true,
      push: true,
      maintenance: true,
      payments: true,
      announcements: true,
    },
  });

  const isSmallScreen = SCREEN_WIDTH < BREAKPOINT_SM;
  const isMediumScreen =
    SCREEN_WIDTH >= BREAKPOINT_SM && SCREEN_WIDTH < BREAKPOINT_MD;

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = await getUser();

      const basicProfile: UserProfile = {
        id: user?.id || "1",
        name: user?.name || "User",
        email: user?.email || "",
        phone: "",
        block: user?.blockName || "",
        unit: user?.unit?.number || "",
        communityName: user?.communityName || "",
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
    value: boolean,
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
          <Text style={[styles.headerTitle, { color: text }]}>Profile</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setEditing(!editing)}
            style={[styles.headerIcon, { backgroundColor: tint + "15" }]}
          >
            <Feather name={editing ? "x" : "edit-2"} size={18} color={tint} />
          </Pressable>
          <Pressable
            onPress={handleLogout}
            style={[styles.headerIcon, { backgroundColor: "#EF444415" }]}
          >
            <Feather name="log-out" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: isSmallScreen ? 12 : isMediumScreen ? 16 : 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: tint + "20", borderColor: tint + "40" },
            ]}
          >
            <Text style={[styles.avatarText, { color: tint }]}>
              {getInitials(profile.name)}
            </Text>
          </View>
          <View style={styles.profileMainInfo}>
            <Text style={[styles.profileName, { color: text }]}>
              {profile.name}
            </Text>
            <View style={styles.profileMetaRow}>
              <Feather name="mail" size={14} color={text} opacity={0.6} />
              <Text style={[styles.profileMeta, { color: text }]}>
                {profile.email}
              </Text>
            </View>
            {profile.apartment && (
              <View style={styles.profileMetaRow}>
                <Feather name="home" size={14} color={text} opacity={0.6} />
                <Text style={[styles.profileMeta, { color: text }]}>
                  Apartment {profile.apartment}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Personal Information */}
        <View
          style={[
            styles.section,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Feather name="user" size={18} color={tint} />
            <Text style={[styles.sectionTitle, { color: text }]}>
              Personal Information
            </Text>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: text }]}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: text,
                      borderColor: borderCol,
                      backgroundColor: bg,
                    },
                  ]}
                  value={profile.name}
                  onChangeText={(text) =>
                    setProfile((prev) => ({ ...prev, name: text }))
                  }
                  placeholderTextColor={text + "60"}
                />
              ) : (
                <Text style={[styles.value, { color: text }]}>
                  {profile.name || "Not set"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: text }]}>Email</Text>
              <Text style={[styles.value, { color: text, opacity: 0.7 }]}>
                {profile.email}
              </Text>
              <Text style={[styles.note, { color: text, opacity: 0.5 }]}>
                <Feather name="lock" size={10} /> Contact admin to change
              </Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: text }]}>Phone</Text>
              {editing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: text,
                      borderColor: borderCol,
                      backgroundColor: bg,
                    },
                  ]}
                  value={profile.phone}
                  onChangeText={(text) =>
                    setProfile((prev) => ({ ...prev, phone: text }))
                  }
                  keyboardType="phone-pad"
                  placeholder="Enter phone number"
                  placeholderTextColor={text + "60"}
                />
              ) : (
                <Text style={[styles.value, { color: text }]}>
                  {profile.phone || "Not set"}
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: text }]}>Community</Text>
              <Text style={[styles.value, { color: text, opacity: 0.7 }]}>
                {profile.communityName || "Not set"}
              </Text>
              <Text style={[styles.note, { color: text, opacity: 0.5 }]}>
                <Feather name="lock" size={10} /> Contact admin to change
              </Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: text }]}>Block</Text>
              <Text style={[styles.value, { color: text, opacity: 0.7 }]}>
                {profile.block || "Not set"}
              </Text>
              <Text style={[styles.note, { color: text, opacity: 0.5 }]}>
                <Feather name="lock" size={10} /> Contact admin to change
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: text }]}>Unit</Text>
              <Text style={[styles.value, { color: text, opacity: 0.7 }]}>
                {profile.unit || "Not set"}
              </Text>
              <Text style={[styles.note, { color: text, opacity: 0.5 }]}>
                <Feather name="lock" size={10} /> Contact admin to change
              </Text>
            </View>
          </View>
        </View>

        {/* Emergency Contact */}
        <View
          style={[
            styles.section,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Feather name="alert-circle" size={18} color={tint} />
            <Text style={[styles.sectionTitle, { color: text }]}>
              Emergency Contact
            </Text>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: text }]}>Name</Text>
              {editing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: text,
                      borderColor: borderCol,
                      backgroundColor: bg,
                    },
                  ]}
                  value={profile.emergencyContact?.name}
                  onChangeText={(text) =>
                    setProfile((prev) => ({
                      ...prev,
                      emergencyContact: {
                        ...prev.emergencyContact!,
                        name: text,
                      },
                    }))
                  }
                  placeholder="Contact name"
                  placeholderTextColor={text + "60"}
                />
              ) : (
                <Text style={[styles.value, { color: text }]}>
                  {profile.emergencyContact?.name || "Not set"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: text }]}>Phone</Text>
              {editing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: text,
                      borderColor: borderCol,
                      backgroundColor: bg,
                    },
                  ]}
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
                  placeholder="Contact phone"
                  placeholderTextColor={text + "60"}
                />
              ) : (
                <Text style={[styles.value, { color: text }]}>
                  {profile.emergencyContact?.phone || "Not set"}
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: text }]}>Relationship</Text>
              {editing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: text,
                      borderColor: borderCol,
                      backgroundColor: bg,
                    },
                  ]}
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
                  placeholder="e.g., Spouse, Parent"
                  placeholderTextColor={text + "60"}
                />
              ) : (
                <Text style={[styles.value, { color: text }]}>
                  {profile.emergencyContact?.relationship || "Not set"}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Notification Preferences */}
        <View
          style={[
            styles.section,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Feather name="bell" size={18} color={tint} />
            <Text style={[styles.sectionTitle, { color: text }]}>
              Notification Preferences
            </Text>
          </View>

          <NotificationItem
            label="Email Notifications"
            description="Receive notifications via email"
            value={profile.notifications.email}
            onValueChange={(value) => updateNotificationSetting("email", value)}
            tint={tint}
            text={text}
            borderCol={borderCol}
          />

          <NotificationItem
            label="Push Notifications"
            description="Receive push notifications on your device"
            value={profile.notifications.push}
            onValueChange={(value) => updateNotificationSetting("push", value)}
            tint={tint}
            text={text}
            borderCol={borderCol}
          />

          <NotificationItem
            label="Maintenance Updates"
            description="Updates on maintenance requests"
            value={profile.notifications.maintenance}
            onValueChange={(value) =>
              updateNotificationSetting("maintenance", value)
            }
            tint={tint}
            text={text}
            borderCol={borderCol}
          />

          <NotificationItem
            label="Payment Reminders"
            description="Reminders for pending payments"
            value={profile.notifications.payments}
            onValueChange={(value) =>
              updateNotificationSetting("payments", value)
            }
            tint={tint}
            text={text}
            borderCol={borderCol}
          />

          <NotificationItem
            label="Community Announcements"
            description="Important community updates"
            value={profile.notifications.announcements}
            onValueChange={(value) =>
              updateNotificationSetting("announcements", value)
            }
            tint={tint}
            text={text}
            borderCol={borderCol}
            isLast
          />
        </View>

        {/* Save Button */}
        {editing && (
          <Pressable
            style={[styles.saveButton, { backgroundColor: tint }]}
            onPress={handleSaveProfile}
          >
            <Feather name="check" size={18} color="#ffffff" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

// Notification Item Component
const NotificationItem = ({
  label,
  description,
  value,
  onValueChange,
  tint,
  text,
  borderCol,
  isLast = false,
}) => (
  <View
    style={[
      styles.notificationItem,
      !isLast && { borderBottomWidth: 1, borderBottomColor: borderCol },
    ]}
  >
    <View style={styles.notificationContent}>
      <Text style={[styles.notificationLabel, { color: text }]}>{label}</Text>
      <Text style={[styles.notificationDesc, { color: text, opacity: 0.6 }]}>
        {description}
      </Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#767577", true: tint + "44" }}
      thumbColor={value ? tint : "#f4f3f4"}
      ios_backgroundColor="#767577"
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 16, fontWeight: "500" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    padding: 10,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginRight: 16,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 1,
  },
  profileMainInfo: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  profileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileMeta: {
    fontSize: 14,
    opacity: 0.7,
  },

  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 50,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  value: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: "500",
  },
  note: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: "500",
  },

  notificationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  notificationDesc: {
    fontSize: 13,
    lineHeight: 18,
  },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});