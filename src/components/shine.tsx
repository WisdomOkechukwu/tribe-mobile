import { useEffect, useId, useState } from "react";
import { View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/**
 * A soft band of light that sweeps across its parent now and then, like light catching glass.
 * The parent must clip it (overflow: hidden, with its border radius). `delay` staggers the first
 * pass; `every` is the rest between passes; `strength` is the brightest point of the band.
 * Skipped entirely with reduced motion.
 */
export function Shine({ delay = 0, every = 3200, strength = 0.55, angle = 18 }: { delay?: number; every?: number; strength?: number; angle?: number }) {
  const reduce = useReducedMotion();
  const id = useId();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduce || !width) return;
    x.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 950, easing: Easing.inOut(Easing.quad) }), withDelay(every, withTiming(0, { duration: 0 }))), -1));
    return () => cancelAnimation(x);
  }, [reduce, width, delay, every, x]);
  const band = Math.max(18, width * 0.28);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -band * 1.5 + x.value * (width + band * 3) }, { rotate: `${angle}deg` }] }));
  if (reduce) return null;
  return (
    <View pointerEvents="none" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Animated.View style={[{ position: "absolute", top: -40, bottom: -40, width: band }, sweep]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#fff" stopOpacity={0} />
              <Stop offset="0.5" stopColor="#fff" stopOpacity={strength} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * The still part of the glass look: a gloss on the top half of a round badge, bright at the top
 * and fading out by the middle. Sits inside the badge's clipping view.
 */
export function Gloss({ strength = 0.38 }: { strength?: number }) {
  const id = useId();
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fff" stopOpacity={strength} />
            <Stop offset="0.5" stopColor="#fff" stopOpacity={0.04} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
