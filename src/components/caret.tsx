import { useEffect } from "react";
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useColors } from "@/theme";

/** Blinking insertion bar after the amount being typed (static with Reduce Motion). */
export function Caret({ height = 28 }: { height?: number }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.set(withRepeat(withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })), -1));
    return () => cancelAnimation(o);
  }, [o, reduce]);
  const blink = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ width: 2, height, borderRadius: 1, marginLeft: 3, backgroundColor: c.brand }, blink]} />;
}
