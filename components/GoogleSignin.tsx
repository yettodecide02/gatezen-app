// @ts-nocheck
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import supabase from "@/lib/supabase";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignin() {
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({}, "icon");

  const { toast, showError, hideToast } = useToast();

  const onPress = async () => {
    try {
      const redirectTo = makeRedirectUri({
        scheme: "gatezenapp",
        path: "auth/callback",
      });

      // skipBrowserRedirect: true — we open the browser ourselves below.
      // flowType is not a valid signInWithOAuth option; PKCE vs implicit is
      // determined by the Supabase project settings or createClient config.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No OAuth URL returned");

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      if (result.type !== "success" || !result.url) return;

      // PKCE flow: redirect URL contains a `code` query parameter
      const resultUrl = new URL(result.url);
      const code = resultUrl.searchParams.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(result.url);
        if (exchangeError) throw exchangeError;
        router.replace("/auth/callback");
        return;
      }

      // Implicit flow fallback: tokens in URL hash
      const hash = result.url.split("#")[1];
      if (hash) {
        const params = Object.fromEntries(new URLSearchParams(hash));
        if (params.access_token && params.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) throw sessionError;
          router.replace("/auth/callback");
          return;
        }
      }

      throw new Error("No authorization code or tokens found in redirect URL");
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      showError(err?.message ?? "Google Sign-In failed");
    }
  };

  return (
    <View>
      <Pressable
        style={[styles.btn, { backgroundColor: bg, borderColor: border }]}
        onPress={onPress}
      >
        <Text style={[styles.btnText, { color: text }]}>
          Continue with Google
        </Text>
      </Pressable>
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
