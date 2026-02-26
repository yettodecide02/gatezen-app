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
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import axios from "axios";
import { config } from "@/lib/config";
import { logout, getUser, getToken, setUser } from "@/lib/auth";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  block: string;
  unit: string;
  communityName: string;
};

export default function Profile() {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const icon = useThemeColor({}, "icon");
  const card = theme === "dark" ? "#111111" : "#ffffff";
  const border = theme === "dark" ? "#262626" : "#E5E7EB";

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const backendUrl = config.backendUrl;
  const [profile, setProfile] = useState<UserProfile>({
    id: "",
    name: "",
    email: "",
    block: "",
    unit: "",
    communityName: "",
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [user, tok] = await Promise.all([getUser(), getToken()]);
      setToken(tok);

      const basicProfile: UserProfile = {
        id: user?.id || "1",
        name: user?.name || "User",
        email: user?.email || "",
        block: user?.blockName || "",
        unit: user?.unit?.number || "",
        communityName: user?.communityName || "",
      };

      // Fetch fresh data from API
      if (tok) {
        try {
          const res = await axios.get(`${backendUrl}/resident/profile`, {
            headers: { Authorization: `Bearer ${tok}` },
          });
          if (res.data?.success) {
            const d = res.data.data;
            setProfile({
              id: d.id,
              name: d.name,
              email: d.email,
              block: d.blockName || basicProfile.block,
              unit: d.unitNumber || basicProfile.unit,
              communityName: d.communityName || basicProfile.communityName,
            });
            return;
          }
        } catch {}
      }

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
    if (!profile.name.trim()) {
      Alert.alert("Validation", "Name cannot be empty.");
      return;
    }
    try {
      setSaving(true);
      if (token) {
        const res = await axios.patch(
          `${backendUrl}/resident/profile`,
          { name: profile.name.trim() },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.data?.success) {
          // Update cached user name
          const cached = await getUser<any>();
          if (cached) await setUser({ ...cached, name: res.data.data.name });
          setProfile((prev) => ({ ...prev, name: res.data.data.name }));
        }
      }
      Alert.alert("Success", "Profile updated successfully!");
      setEditing(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={tint} />
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
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Fixed Header */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: Math.max(insets.top, 16),
            backgroundColor: bg,
            borderBottomColor: border,
          },
        ]}
      >
        <View style={[styles.header, { backgroundColor: bg }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: text }]}>Profile</Text>
          </View>
          <View style={styles.headerRight}>
            {editing && (
              <Pressable
                onPress={handleSaveProfile}
                disabled={saving}
                style={[
                  styles.saveHeaderButton,
                  { backgroundColor: saving ? tint + "80" : tint },
                ]}
              >
                <Feather name="check" size={16} color="#ffffff" />
                <Text style={styles.saveHeaderButtonText}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            )}
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
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          paddingBottom: insets.bottom + 20,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: card, borderColor: border },
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
              <Feather name="mail" size={14} color={icon as any} />
              <Text style={[styles.profileMeta, { color: icon as any }]}>
                {profile.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View
          style={[
            styles.section,
            { backgroundColor: card, borderColor: border },
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
              <Text style={[styles.label, { color: icon as any }]}>
                Full Name
              </Text>
              {editing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: text,
                      borderColor: border,
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
              <Text style={[styles.label, { color: icon as any }]}>Email</Text>
              <Text style={[styles.value, { color: icon as any }]}>
                {profile.email}
              </Text>
              <Text style={[styles.note, { color: icon as any }]}>
                <Feather name="lock" size={10} /> Contact admin to change
              </Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: icon as any }]}>
                Community
              </Text>
              <Text style={[styles.value, { color: icon as any }]}>
                {profile.communityName || "Not set"}
              </Text>
              <Text style={[styles.note, { color: icon as any }]}>
                <Feather name="lock" size={10} /> Contact admin to change
              </Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: icon as any }]}>Block</Text>
              <Text style={[styles.value, { color: icon as any }]}>
                {profile.block || "Not set"}
              </Text>
              <Text style={[styles.note, { color: icon as any }]}>
                <Feather name="lock" size={10} /> Contact admin to change
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: icon as any }]}>Unit</Text>
              <Text style={[styles.value, { color: icon as any }]}>
                {profile.unit || "Not set"}
              </Text>
              <Text style={[styles.note, { color: icon as any }]}>
                <Feather name="lock" size={10} /> Contact admin to change
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    fontSize: 20,
    fontWeight: "700",
  },

  content: {
    flex: 1,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1,
  },
  profileMainInfo: {
    flex: 1,
    gap: 5,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
  },
  profileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileMeta: {
    fontSize: 13,
  },

  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  formGroup: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 15,
    fontWeight: "500",
  },
  note: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "500",
  },

  saveHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  saveHeaderButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
