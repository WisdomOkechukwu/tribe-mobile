import { useEffect, useState } from "react";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";
import { useRatesStore } from "@/stores/use-rates-store";
import { radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

const SHOW_MS = 1600;

/**
 * A small "Rates updated" chip that fades in for a moment whenever a newer rate version arrives
 * over the live stream (`useLiveRates()` must be mounted on the screen). Reduce Motion: no fade.
 */
export function RateFlash() {
  const c = useColors();
  const reduce = useReducedMotion();
  // the version that just arrived while this screen is up (0 = nothing to show)
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = useRatesStore.subscribe((s, prev) => {
      if (s.updatedAt === prev.updatedAt || !s.updatedAt) return;
      setFlash(s.updatedAt);
      clearTimeout(timer);
      timer = setTimeout(() => setFlash(0), SHOW_MS);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, []);
  if (!flash) return null;
  const updatedAt = flash;
  return (
    <Animated.View
      key={updatedAt}
      entering={reduce ? undefined : FadeIn.duration(180)}
      exiting={reduce ? undefined : FadeOut.duration(260)}
      accessibilityLiveRegion="polite"
      style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.successSoft, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 }}
    >
      <Icon name="refresh" size={10} color={c.success} weight="bold" />
      <Text variant="caption" style={{ color: c.success }}>
        Rates updated
      </Text>
    </Animated.View>
  );
}
