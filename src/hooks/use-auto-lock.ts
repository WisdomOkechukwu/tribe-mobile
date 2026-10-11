import { usePathname } from "expo-router";
import { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import { AUTO_LOCK_MS } from "@/data/security";
import { useSessionStore } from "@/stores/use-session-store";

const THROTTLE_MS = 5_000;

function idleTooLong() {
  const s = useSessionStore.getState();
  return !s.locked && s.lastActiveAt > 0 && Date.now() - s.lastActiveAt >= AUTO_LOCK_MS;
}

/**
 * Locks the app after 10 minutes without a touch — including time spent in the background or
 * with the app closed (lastActiveAt is persisted, so a cold start checks it too).
 * Returns the touch handler for the root view.
 */
export function useAutoLock(active: boolean) {
  const pathname = usePathname();

  // Cold start, coming back to the foreground, and a slow heartbeat while open.
  useEffect(() => {
    if (!active) return;
    const check = () => {
      if (idleTooLong()) useSessionStore.getState().lock();
    };
    check();
    const beat = setInterval(check, 15_000);
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") check();
    });
    return () => {
      clearInterval(beat);
      sub.remove();
    };
  }, [active]);

  const touch = useCallback(() => {
    if (!active) return;
    const s = useSessionStore.getState();
    if (s.locked) return;
    if (idleTooLong()) return s.lock();
    if (Date.now() - s.lastActiveAt > THROTTLE_MS) s.touch();
  }, [active]);

  // navigating counts as activity
  useEffect(() => {
    touch();
  }, [pathname, touch]);

  return touch;
}
