import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";
import { resources, setMockLatency } from "./client";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// refetch stale data when the app comes back to the foreground (web already does this via the tab)
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (status) => focusManager.setFocused(status === "active"));
}

// Mock only: flows still write to the Zustand stores, so mirror those writes into the cache and
// screens update the same frame. Delete with the mocks once flows invalidate real queries.
for (const r of Object.values(resources)) r.sync((key, data) => queryClient.setQueryData(key, data));

/** Dev: preview skeletons. Every query forgets its data and reloads after `ms` of fake network. */
export function previewLatency(ms: number) {
  setMockLatency(ms);
  // (resetQueries would restore each query's first state, which already held the on-device data)
  for (const q of queryClient.getQueryCache().getAll()) q.setState({ data: undefined, status: "pending", dataUpdatedAt: 0, error: null, fetchStatus: "idle" });
  queryClient.refetchQueries({ type: "active" }).catch(() => {});
}
