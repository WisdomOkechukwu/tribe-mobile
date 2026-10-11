import { Image } from "expo-image";
import { useEffect, useId } from "react";
import { Platform, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { FullWindowOverlay } from "react-native-screens";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useUiStore } from "@/stores/use-ui-store";
import { palette, radius, spacing, useColors } from "@/theme";
import { Text } from "./text";

/**
 * The one "working on it" mark (Create Account.png devnote: used across the app): the Tribe
 * Africa mark inside a purple → orange arc that turns. Spinners keep turning under reduced
 * motion (they carry meaning), just slower.
 */
export function TribeLoader({ size = 84 }: { size?: number }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.set(withRepeat(withTiming(1, { duration: reduce ? 2400 : 1100, easing: Easing.linear }), -1));
  }, [spin, reduce]);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  const stroke = Math.max(4, size * 0.07);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.brandSoft} strokeWidth={stroke} fill="none" />
      </Svg>
      <Animated.View style={[{ position: "absolute", width: size, height: size }, ring]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={`loader-${gid}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={palette.purple[400]} />
              <Stop offset="1" stopColor={palette.orange[500]} />
            </LinearGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#loader-${gid})`} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ * 0.32} ${circ}`} />
        </Svg>
      </Animated.View>
      <Image source={require("@/assets/brand/tribe-mark.png")} style={{ width: size * 0.5, height: size * 0.36 }} contentFit="contain" />
    </View>
  );
}

/** Full-screen loader host — mounted once in the root layout; driven by withLoader(). */
export function LoadingHost() {
  const c = useColors();
  const label = useUiStore((s) => s.loading);
  if (!label) return null;
  const layer = (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={{ position: "absolute", inset: 0, zIndex: 950, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center" }} accessibilityViewIsModal>
      <View style={{ backgroundColor: c.bg, borderRadius: radius.panel, borderCurve: "continuous", paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, alignItems: "center", gap: spacing.md, minWidth: 200 }}>
        <TribeLoader />
        <Text variant="bodyStrong" align="center" accessibilityLiveRegion="polite">
          {label}
        </Text>
      </View>
    </Animated.View>
  );
  return Platform.OS === "ios" ? <FullWindowOverlay>{layer}</FullWindowOverlay> : layer;
}
