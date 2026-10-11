import { Image } from "expo-image";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import Animated, { cancelAnimation, Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { FullWindowOverlay } from "react-native-screens";
import { useUiStore } from "@/stores/use-ui-store";
import { palette, radius, shadows, spacing, useColors } from "@/theme";
import { Text } from "./text";

const BARS = [palette.orange[500], palette.purple[500], palette.orange[500], palette.purple[500], palette.orange[500]];

/** One slanted bar of the wave: rises and falls, offset from its neighbours. */
function WaveBar({ i, color, w, h, slow }: { i: number; color: string; w: number; h: number; slow: boolean }) {
  const v = useSharedValue(0);
  useEffect(() => {
    const beat = slow ? 900 : 380;
    v.set(withDelay(i * (slow ? 180 : 110), withRepeat(withTiming(1, { duration: beat, easing: Easing.inOut(Easing.sin) }), -1, true)));
    return () => cancelAnimation(v);
  }, [v, i, slow]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.3 + 0.7 * v.get() }] }));
  return <Animated.View style={[{ width: w, height: h, borderRadius: w / 2, backgroundColor: color }, style]} />;
}

/** A ring that swells out of the logo disc and fades: the splash's breath, on a loop. */
function Halo({ d, delay, color }: { d: number; delay: number; color: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }), -1, false)));
    return () => cancelAnimation(v);
  }, [v, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - v.get()), transform: [{ scale: 1 + 0.7 * v.get() }] }));
  return <Animated.View style={[{ position: "absolute", width: d, height: d, borderRadius: d / 2, borderWidth: 2, borderColor: color }, style]} />;
}

/**
 * The one "working on it" mark (Create Account.png devnote: used across the app): the Tribe
 * logo on a white disc that breathes out rings (the splash's motion, on a loop), over a wave
 * of slanted bars in the logo's colours and angle. Under reduced motion the rings stop; the
 * wave keeps going, slower, because it carries meaning.
 */
export function TribeLoader({ size = 84 }: { size?: number }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const disc = size * 0.86;
  const barW = Math.max(5, size * 0.075);
  return (
    <View style={{ alignItems: "center", gap: size * 0.26 }} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <View style={{ width: disc, height: disc, alignItems: "center", justifyContent: "center" }}>
        {!reduce && (
          <>
            <Halo d={disc} delay={0} color={palette.purple[400]} />
            <Halo d={disc} delay={700} color={palette.orange[400]} />
          </>
        )}
        <View style={{ width: disc, height: disc, borderRadius: disc / 2, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border, boxShadow: shadows.lift }}>
          <Image source={require("@/assets/brand/tribe-logo.png")} style={{ width: disc * 0.7, height: disc * 0.7 }} contentFit="contain" />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: barW * 0.8, height: size * 0.3, transform: [{ skewX: "-20deg" }] }}>
        {BARS.map((color, i) => (
          <WaveBar key={i} i={i} color={color} w={barW} h={size * 0.3} slow={reduce} />
        ))}
      </View>
    </View>
  );
}

/** Card entrance: a quick fade with a hint of scale (0.96 → 1). */
const rise = () => {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.96 }] },
    animations: { opacity: withTiming(1, { duration: 200 }), transform: [{ scale: withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }) }] },
  };
};

/** Full-screen loader host — mounted once in the root layout; driven by withLoader(). */
export function LoadingHost() {
  const c = useColors();
  const label = useUiStore((s) => s.loading);
  if (!label) return null;
  const layer = (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={{ position: "absolute", inset: 0, zIndex: 950, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center" }} accessibilityViewIsModal>
      <Animated.View entering={rise} style={{ backgroundColor: c.bg, borderRadius: radius.panel, borderCurve: "continuous", paddingTop: spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.xl, alignItems: "center", gap: spacing.lg, minWidth: 220 }}>
        <TribeLoader />
        <Text variant="bodyStrong" align="center" accessibilityLiveRegion="polite">
          {label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
  return Platform.OS === "ios" ? <FullWindowOverlay>{layer}</FullWindowOverlay> : layer;
}
