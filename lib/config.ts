import Constants from "expo-constants";

/**
 * Centralized configuration for environment variables.
 * Reads from process.env first (dev), then fallback to Constants.expoConfig.extra (builds).
 */

export const config = {
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_SUPABASE_URL ||
    Constants.expoConfig?.extra?.supabaseUrl ||
    "https://lycnyrqtrlytydbjdput.supabase.co",

  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_SUPABASE_ANON_KEY ||
    Constants.expoConfig?.extra?.supabaseAnonKey ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5Y255cnF0cmx5dHlkYmpkcHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODg1NTcsImV4cCI6MjA3MTg2NDU1N30.pv7awgJ7FUDGxTTAQUkuRsJeg9lakKPh89lzTd9G5Do",

  backendUrl:
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    process.env.EXPO_BACKEND_URL ||
    Constants.expoConfig?.extra?.backendUrl ||
    "https://gatezen-starter-rh69.vercel.app/",

  googleSignupPassword:
    process.env.EXPO_PUBLIC_GOOGLE_SIGNUP_PASSWORD ||
    Constants.expoConfig?.extra?.googleSignupPassword ||
    "1234567890",
};

// Log configuration status in development
if (__DEV__) {
  console.log("🔧 Config loaded:", {
    supabaseUrl: config.supabaseUrl.substring(0, 20) + "...",
    backendUrl: config.backendUrl,
    hasAnonKey: !!config.supabaseAnonKey,
  });
}
