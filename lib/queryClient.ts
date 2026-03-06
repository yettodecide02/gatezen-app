/**
 * Shared QueryClient instance.
 *
 * Import `queryClient` directly wherever you need to call
 * `queryClient.invalidateQueries(...)` or `queryClient.clear()`.
 *
 * The AppState wiring below tells React Query to refetch stale queries
 * when the user brings the app back from the background — equivalent to
 * `refetchOnWindowFocus` on web.
 */
import { AppState } from "react-native";
import { QueryClient, focusManager } from "@tanstack/react-query";

// Wire React Native AppState to React Query's focus manager
// so stale queries are refetched when the app comes back to the foreground.
AppState.addEventListener("change", (state) => {
  focusManager.setFocused(state === "active");
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time — individual queries override this.
      staleTime: 3 * 60 * 1000, // 3 minutes
      // Keep unused data in memory for 30 minutes after a screen unmounts.
      gcTime: 30 * 60 * 1000,
      // Only retry once on network errors.
      retry: 1,
      // Re-fetch on mount only when the data is stale (not on every mount).
      refetchOnMount: true,
      // We handle foreground focus via AppState above.
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
