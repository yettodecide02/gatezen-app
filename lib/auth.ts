import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "@/lib/supabase";

const TOKEN_KEY = "token";
const USER_KEY = "user";

// ── Logout side-effect registry ───────────────────────────────
// Modules that need to clean up on logout (e.g. overstayLimits cache)
// register a callback here to avoid circular imports.
const _logoutCallbacks: Array<() => void> = [];

export function registerLogoutCallback(cb: () => void) {
  if (!_logoutCallbacks.includes(cb)) _logoutCallbacks.push(cb);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function clearUser() {
  await AsyncStorage.removeItem(USER_KEY);
}

export async function isAuthed() {
  const token = await getToken();
  const user = await getUser();
  return !!(token && user);
}

export async function setUser(user: unknown) {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export async function getUser<T = unknown>() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function getCommunityId(): Promise<string | null> {
  try {
    const user = await getUser<{ communityId?: string }>();
    return user?.communityId || null;
  } catch {
    return null;
  }
}

// ─── Plan / Feature helpers ─────────────────────────────────────────────────

/**
 * Returns the list of feature keys enabled for the current user's community.
 * The value is stored inside the user object as `enabledFeatures`.
 */
export async function getEnabledFeatures(): Promise<string[]> {
  try {
    const user = await getUser<{ enabledFeatures?: string[] }>();
    return user?.enabledFeatures ?? [];
  } catch {
    return [];
  }
}

/**
 * Returns true when the given feature key is included in the community's plan.
 */
export async function hasFeature(featureKey: string): Promise<boolean> {
  const features = await getEnabledFeatures();
  return features.includes(featureKey);
}

/**
 * Returns the plan info (id + name) for the current user's community, if any.
 */
export async function getCurrentPlan(): Promise<{
  id: string;
  name: string;
} | null> {
  try {
    const user = await getUser<{
      plan?: { id: string; name: string } | null;
    }>();
    return user?.plan ?? null;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch {}
  await clearToken();
  await clearUser();
  // Run all registered cleanup callbacks (e.g. clear overstay cache)
  _logoutCallbacks.forEach((cb) => cb());
}
