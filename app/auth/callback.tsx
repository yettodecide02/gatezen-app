// @ts-nocheck
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import axios from "axios";
import { router } from "expo-router";
import supabase from "@/lib/supabase";
import { setToken, setUser } from "@/lib/auth";
import Toast from "@/components/Toast";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useToast } from "@/hooks/useToast";
import { config } from "@/lib/config";
import { registerForPushNotifications } from "@/lib/notifications";

export default function AuthCallback() {
  const [message, setMessage] = useState("Finishing sign-in…");
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const { toast, showError, hideToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        // Wait for Supabase to persist session
        await new Promise((resolve) => setTimeout(resolve, 800));

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session) {
          showError("Authentication session not found");
          setMessage("No session found. Redirecting to login…");
          setTimeout(() => router.replace("/login"), 1500);
          return;
        }

        const email = session.user.email;

        const backendUrl = config.backendUrl;

        const response = await axios.get(`${backendUrl}/auth/existing-user`, {
          params: { email },
        });

        if (response.data?.exists) {
          if (response.data.jwttoken) await setToken(response.data.jwttoken);
          if (response.data.user) await setUser(response.data.user);
          registerForPushNotifications(response.data.jwttoken).catch(() => {});
          const u = response.data.user;
          if (u.status === "PENDING") {
            router.replace("/pending");
          } else if (u.status === "REJECTED") {
            showError(
              "Your account has been rejected. Please contact your community admin.",
            );
            setTimeout(() => router.replace("/login"), 2000);
          } else if (u.role === "ADMIN") {
            router.replace("/admin");
          } else if (u.role === "GATEKEEPER") {
            router.replace("/gatekeeper");
          } else {
            router.replace("/(tabs)/home");
          }
          return;
        } else {
          router.replace("/auth/residentform");
        }

        // Register new user
        // const name =
        //   session.user.user_metadata?.full_name ||
        //   session.user.user_metadata?.name ||
        //   "Google User";

        // const signup = await axios.post(`${backendUrl}/auth/signup`, {
        //   name,
        //   email,
        //   password: "google-oauth-" + Date.now(),
        // });

        // if (signup?.data?.jwttoken) await setToken(signup.data.jwttoken);
        // if (signup?.data?.user) await setUser(signup.data.user);

        // router.replace("/(drawer)/dashboard");
      } catch (error) {
        console.error("OAuth callback error:", error);
        setMessage("Authentication failed. Returning to login…");
        showError("Authentication failed. Please try again.");
        setTimeout(() => router.replace("/login"), 1500);
      }
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={[styles.text, { color: text }]}>{message}</Text>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
});
