// @ts-nocheck
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import supabase from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignin() {
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const border = icon;

  const onPress = async () => {
    try {
      // Use the AuthSession proxy in Expo Go for reliable redirects
      const redirectTo = makeRedirectUri({ useProxy: true });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No OAuth URL returned");

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );
      if (result.type !== "success" || !result.url) {
        throw new Error("Authentication was cancelled or failed");
      }

      // Try to exchange the authorization code for a session, if present
      const parsed = new URL(result.url);
      const code = parsed.searchParams.get("code");
      if (code) {
        // exchangeCodeForSession is supported on RN for PKCE flow
        try {
          // @ts-ignore
          await supabase.auth.exchangeCodeForSession({ code });
        } catch {
          // Fallback: ignore, callback screen will also handle it if needed
        }
      }

      // Continue to the callback screen which finalizes backend user and navigation
      router.replace("/auth/callback");
    } catch (err: any) {
      Alert.alert("Google Sign-In failed", err?.message ?? "");
    }
  };

  return (
    <Pressable
      style={[styles.btn, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
    >
      <Text style={[styles.btnText, { color: text }]}>
        Continue with Google
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: 12,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    fontWeight: "600",
  },
});
