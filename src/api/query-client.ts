import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";
import * as Network from "expo-network";
import { ApiError } from "./http";
import { useSessionStore } from "@/stores/use-session-store";
import { resources, type Resource } from "./client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // a 4xx won't change on retry; offline / 5xx / timeouts get two more tries
      retry: (count, error) => (error instanceof ApiError ? error.retryable && error.code !== "OFFLINE" && count < 2 : count < 2),
    },
    mutations: { retry: false },
  },
});

// refetch stale data when the app comes back to the foreground (web already does this via the tab)
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (status) => focusManager.setFocused(status === "active"));
  // pause queries while offline and refetch when the phone reconnects
  onlineManager.setEventListener((setOnline) => {
    const sub = Network.addNetworkStateListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false));
    return () => sub.remove();
  });
}

// optimistic store writes (freeze a card, mark a token loaded…) show up in query-reading screens too;
// signed out, the only writes are resets, which must not land in the cache as fresh data
for (const r of Object.values(resources) as Resource<unknown>[])
  r.sync?.((key, data) => {
    if (useSessionStore.getState().signedIn) queryClient.setQueryData(key, data);
  });

/** What changes after a money movement: balances, history, inbox, and the product's own list. */
export function refreshAfterMoney(extra: readonly (readonly unknown[])[] = []) {
  for (const key of [resources.accounts.key, resources.transactions.key, resources.inbox.key, ...extra]) queryClient.invalidateQueries({ queryKey: key }).catch(() => {});
}

export const invalidate = (...keys: (readonly unknown[])[]) => {
  for (const key of keys) queryClient.invalidateQueries({ queryKey: key }).catch(() => {});
};
