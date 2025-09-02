// Polyfills required for supabase-js in React Native
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_SUPABASE_URL) as string | undefined;
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_SUPABASE_ANON_KEY) as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Log a helpful warning in development; avoids crashing apps before env is set up
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
  );
}

const supabase = createClient(
  SUPABASE_URL ?? "http://localhost:54321",
  SUPABASE_ANON_KEY ?? "anon",
  {
    auth: {
      storage: AsyncStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export default supabase;
