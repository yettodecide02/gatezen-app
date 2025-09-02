import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "@/lib/supabase";

const TOKEN_KEY = "token";
const USER_KEY = "user";

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
  return !!token;
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

export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch {}
  await clearToken();
  await clearUser();
}
