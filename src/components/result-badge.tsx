import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { useColors } from "@/theme";
import { Icon } from "./icon";

export type ResultState = "success" | "pending" | "processing";

/**
 * The status mark at the top of result screens.
 * success → green check pops in with one ripple · pending → amber clock with a turning arc ·
 * processing → brand ring spinning (shown while the payment goes through).
 */
export function ResultBadge({ state, size = 104 }: { state: ResultState; size?: number }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const pop = useSharedValue(reduce ? 1 : 0);
  const ripple = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (state === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (reduce) return;
    pop.set(0);
    pop.set(withSpring(1, { damping: 11, stiffness: 180 }));
    ripple.set(0);
    if (state === "success") ripple.set(withDelay(120, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) })));
    spin.set(0);
    if (state !== "success") spin.set(withRepeat(withTiming(1, { duration: state === "processing" ? 900 : 2600, easing: Easing.linear }), -1));
  }, [state, pop, ripple, spin, reduce]);

  const core = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }], opacity: Math.min(1, pop.get() * 1.4) }));
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + ripple.get() * 0.45 }], opacity: (1 - ripple.get()) * 0.5 }));
  const arc = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));

  const tone = state === "success" ? { bg: c.success, soft: c.successSoft } : state === "pending" ? { bg: c.pending, soft: c.warningSoft } : { bg: c.brand, soft: c.brandSoft };
  const inner = size * 0.68;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityLabel={state === "success" ? "Successful" : state === "pending" ? "Pending" : "Processing"}>
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: tone.soft }} />
      {state === "success" && <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: tone.bg }, ring]} />}
      {state !== "success" && (
        <Animated.View style={[{ position: "absolute", width: size - 6, height: size - 6, borderRadius: size / 2, borderWidth: 4, borderColor: "transparent", borderTopColor: tone.bg, borderRightColor: state === "processing" ? tone.bg : "transparent" }, arc]} />
      )}
      <Animated.View style={[{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center" }, core]}>
        <Icon name={state === "success" ? "check" : state === "pending" ? "clock" : "lock"} size={inner * 0.42} color="#fff" weight="bold" />
      </Animated.View>
    </View>
  );
}
