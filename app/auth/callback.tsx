// @ts-nocheck
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import axios from "axios";
import { router } from "expo-router";

import supabase from "@/lib/supabase";
import { setToken, setUser } from "@/lib/auth";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function AuthCallback() {
  const [message, setMessage] = useState("Finishing sign-in…");
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");

  useEffect(() => {
    (async () => {
      try {
        // Let Supabase finalize the session from the redirect
        const sessionRes = await supabase.auth.getSession();
        const session = sessionRes?.data?.session;
        if (!session) {
          setMessage("No session returned. Going back to login…");
          setTimeout(() => router.replace("/login"), 800);
          return;
        }

        // Get user details
        const userRes = await supabase.auth.getUser();
        const email = userRes?.data?.user?.email;
        if (!email) {
          setMessage("No user email found. Going back to login…");
          setTimeout(() => router.replace("/login"), 800);
          return;
        }

        const backendUrl =
          process.env.EXPO_PUBLIC_BACKEND_URL ||
          process.env.EXPO_BACKEND_URL ||
          "http://localhost:3000";

        // Check if user exists in our backend; if not, create it
        const exists = await axios
          .get(`${backendUrl}/auth/existing-user`, { params: { email } })
          .then((r) => r.data)
          .catch(() => ({ exists: false }));

        let apiUser = exists?.user;
        let apiToken = exists?.jwttoken;

        if (!exists?.exists) {
          const name =
            userRes?.data?.user?.user_metadata?.full_name || "Google User";
          const signup = await axios.post(`${backendUrl}/auth/signup`, {
            name,
            email,
            password: "google-oauth",
          });
          apiUser = signup?.data?.user;
          apiToken = signup?.data?.jwttoken;
        }

        if (apiToken) await setToken(apiToken);
        if (apiUser) await setUser(apiUser);

        router.replace("/(drawer)/dashboard");
      } catch {
        setMessage("OAuth flow failed. Returning to login…");
        setTimeout(() => router.replace("/login"), 800);
      }
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ActivityIndicator />
      <Text style={[styles.text, { color: text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: { fontWeight: "600" },
});
