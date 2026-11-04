import * as Network from "expo-network";
import { useSyncExternalStore } from "react";

/**
 * Online / offline, from expo-network. Requests refuse to start while offline (`api/http.ts`),
 * and actions show why. Starts optimistic: until the first reading we assume online.
 */
let online = true;
const listeners = new Set<() => void>();

const apply = (state: Network.NetworkState) => {
  // isInternetReachable is null while unknown; only a definite false counts as offline
  const next = state.isConnected !== false && state.isInternetReachable !== false;
  if (next === online) return;
  online = next;
  listeners.forEach((l) => l());
};

Network.getNetworkStateAsync().then(apply).catch(() => {});
try {
  Network.addNetworkStateListener(apply);
} catch {
  // web without the Network Information API: stay optimistic
}

export const isOnline = () => online;

/** Re-renders when the phone goes on- or offline. */
export function useIsOnline() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => online,
    () => true,
  );
}

export const OFFLINE_MESSAGE = "You're offline. Connect to the internet and try again.";
