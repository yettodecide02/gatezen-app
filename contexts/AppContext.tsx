/**
 * AppContext — in-memory auth state.
 *
 * Loads { user, token, communityId, enabledFeatures } once from AsyncStorage
 * at app startup, then keeps them in memory so every screen can read them
 * synchronously via `useAppContext()` — no more 3+ per-screen AsyncStorage reads.
 *
 * `refreshUser()` is called after login / profile updates.
 * `clearAppContext()` is called from logout().
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCommunityId,
  getEnabledFeatures,
  getToken,
  getUser,
} from "@/lib/auth";

interface AppUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  communityId?: string;
  communityName?: string;
  blockName?: string;
  block?: string;
  unitNumber?: string;
  unit?: string;
  phone?: string;
  enabledFeatures?: string[];
  plan?: { id: string; name: string } | null;
  [key: string]: unknown;
}

interface AppContextValue {
  user: AppUser | null;
  token: string | null;
  communityId: string | null;
  enabledFeatures: string[];
  /** Re-reads AsyncStorage — call after login or profile update. */
  refreshUser: () => Promise<void>;
  /** Wipes all in-memory auth state — called from logout(). */
  clearAppContext: () => void;
  /** True during the initial async load from AsyncStorage. */
  initialising: boolean;
}

const AppContext = createContext<AppContextValue>({
  user: null,
  token: null,
  communityId: null,
  enabledFeatures: [],
  refreshUser: async () => {},
  clearAppContext: () => {},
  initialising: true,
});

export function AppContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [initialising, setInitialising] = useState(true);

  const queryClient = useQueryClient();

  const load = useCallback(async () => {
    try {
      const [u, t, cid, feats] = await Promise.all([
        getUser<AppUser>(),
        getToken(),
        getCommunityId(),
        getEnabledFeatures(),
      ]);
      setUser(u);
      setToken(t);
      setCommunityId(cid);
      setEnabledFeatures(feats);
    } catch {
      // Silently ignore — app will redirect to login if user/token are null
    } finally {
      setInitialising(false);
    }
  }, []);

  // Load once at startup
  useEffect(() => {
    load();
  }, [load]);

  const refreshUser = useCallback(async () => {
    await load();
  }, [load]);

  const clearAppContext = useCallback(() => {
    setUser(null);
    setToken(null);
    setCommunityId(null);
    setEnabledFeatures([]);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        communityId,
        enabledFeatures,
        refreshUser,
        clearAppContext,
        initialising,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
