// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { logout, getUser, getToken, setUser } from "@/lib/auth";
import { config } from "@/lib/config";

export default function PendingScreen() {
  const [user, setUserState] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<
    "approved" | "still_pending" | null
  >(null);

  const theme = useColorScheme() ?? "light";
  const bg = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const cardBg = theme === "dark" ? "#1F1F1F" : "#ffffff";
  const borderCol =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const muted = iconColor;
  const buttonBg = tint;
  const buttonText = theme === "dark" ? "#11181C" : "#ffffff";
  const successColor = "#10b981";

  useEffect(() => {
    const loadUser = async () => {
      const userData = await getUser();
      setUserState(userData);
    };
    loadUser();
  }, []);

  const handleCheckApproval = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      const res = await axios.get(`${config.backendUrl}/resident/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fresh = res.data?.user ?? res.data;
      if (fresh && fresh.status !== "PENDING") {
        await setUser(fresh);
        if (fresh.role === "ADMIN") {
          router.replace("/admin");
        } else if (fresh.role === "GATEKEEPER") {
          router.replace("/gatekeeper/visitors");
        } else {
          router.replace("/(tabs)/home");
        }
      } else {
        setCheckResult("still_pending");
      }
    } catch {
      setCheckResult("still_pending");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: borderCol },
        ]}
      >
        <View style={styles.iconContainer}>
          <Feather name="clock" size={48} color={tint} />
        </View>

        <Text style={[styles.title, { color: textColor }]}>
          Account Pending Approval
        </Text>

        <View style={styles.content}>
          <Text style={[styles.greeting, { color: textColor }]}>
            Hello{" "}
            <Text style={[styles.username, { color: tint }]}>
              {user?.name || "User"}
            </Text>
            ,
          </Text>

          <Text style={[styles.description, { color: muted }]}>
            Your registration request is currently under review. Please consult
            your community head for approval of your account.
          </Text>

          <View style={styles.infoSection}>
            <View style={[styles.infoItem, { borderColor: borderCol }]}>
              <Feather
                name="mail"
                size={18}
                color={iconColor}
                style={styles.infoIcon}
              />
              <Text style={[styles.infoText, { color: textColor }]}>
                Email: {user?.email || "Not available"}
              </Text>
            </View>

            <View style={[styles.infoItem, { borderColor: borderCol }]}>
              <Feather
                name="user-check"
                size={18}
                color={successColor}
                style={styles.infoIcon}
              />
              <Text style={[styles.infoText, { color: textColor }]}>
                Status: Pending Approval
              </Text>
            </View>
          </View>

          {checkResult === "still_pending" && (
            <View
              style={[
                styles.infoItem,
                {
                  borderColor: "#FCD34D",
                  backgroundColor: "#FFFBEB",
                  marginBottom: 4,
                },
              ]}
            >
              <Feather
                name="alert-circle"
                size={16}
                color="#B45309"
                style={styles.infoIcon}
              />
              <Text style={[styles.infoText, { color: "#92400E" }]}>
                Still pending — please contact your community admin.
              </Text>
            </View>
          )}

          <View style={styles.stepsSection}>
            <Text style={[styles.stepsTitle, { color: textColor }]}>
              What's next?
            </Text>
            <View style={styles.stepsList}>
              <Text style={[styles.stepItem, { color: muted }]}>
                • Contact your community head or building administrator
              </Text>
              <Text style={[styles.stepItem, { color: muted }]}>
                • Provide necessary documentation if required
              </Text>
              <Text style={[styles.stepItem, { color: muted }]}>
                • Wait for approval notification
              </Text>
              <Text style={[styles.stepItem, { color: muted }]}>
                • You'll receive access once approved
              </Text>
            </View>
          </View>
        </View>

        <View style={{ width: "100%", gap: 12 }}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: checking ? "#93C5FD" : tint,
              },
            ]}
            onPress={handleCheckApproval}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator size="small" color={buttonText} />
            ) : (
              <Feather name="refresh-cw" size={18} color={buttonText} />
            )}
            <Text style={[styles.buttonText, { color: buttonText }]}>
              {checking ? "Checking..." : "Check Approval Status"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: borderCol,
              },
            ]}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={18} color={textColor} />
            <Text style={[styles.buttonText, { color: textColor }]}>
              Logout & Try Different Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  content: {
    width: "100%",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
  },
  username: {
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  infoSection: {
    width: "100%",
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  stepsSection: {
    width: "100%",
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  stepsList: {
    gap: 8,
  },
  stepItem: {
    fontSize: 14,
    lineHeight: 18,
    paddingLeft: 8,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    minWidth: 200,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 16,
  },
});
