import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { FullWindowOverlay } from "react-native-screens";
import { scheduleOnRN } from "react-native-worklets";
import { schemes } from "@/theme";

/** Must equal the splash plugin's `imageWidth` in app.json, so native → JS is invisible. */
export const SPLASH_MARK_WIDTH = 140;

const SETTLE = 60;
const INHALE = 200;
const EXHALE = 380;
// mark and background start fading 40% into the exhale, so the app shows through the zoom
const FADE_AT = SETTLE + INHALE + EXHALE * 0.4;

/**
 * Cold-start splash: picks up exactly where the native splash leaves off (same mark, same
 * width, same light background in both schemes — the logo's purple bands vanish on dark), then
 * breathes in and out: the mark draws in, swells past the screen edges and dissolves into the
 * app underneath. Reduced motion gets a short cross-fade instead.
 */
export function BrandSplash({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [painted, setPainted] = useState(false);
  // a new onDone identity mid-animation must not restart the sequence
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  const scale = useSharedValue(1);
  const markOpacity = useSharedValue(1);
  const bgOpacity = useSharedValue(1);

  useEffect(() => {
    if (!painted) return;
    // this layer now covers the screen, so dropping the native splash can't flash
    SplashScreen.hideAsync().catch(() => {});
    const end = () => done.current();
    const finish = (finished?: boolean) => {
      "worklet";
      if (finished) scheduleOnRN(end);
    };
    if (reduce) {
      markOpacity.set(withDelay(SETTLE, withTiming(0, { duration: 220 })));
      bgOpacity.set(withDelay(SETTLE, withTiming(0, { duration: 220 }, finish)));
      return;
    }
    scale.set(
      withDelay(
        SETTLE,
        withSequence(withTiming(0.88, { duration: INHALE, easing: Easing.inOut(Easing.quad) }), withTiming(9, { duration: EXHALE, easing: Easing.in(Easing.cubic) })),
      ),
    );
    markOpacity.set(withDelay(FADE_AT, withTiming(0, { duration: EXHALE * 0.6 })));
    bgOpacity.set(withDelay(FADE_AT, withTiming(0, { duration: 340 }, finish)));
    const t = setTimeout(() => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, SETTLE + INHALE);
    return () => clearTimeout(t);
  }, [painted, reduce, scale, markOpacity, bgOpacity]);

  const bg = useAnimatedStyle(() => ({ opacity: bgOpacity.get() }));
  const mark = useAnimatedStyle(() => ({ opacity: markOpacity.get(), transform: [{ scale: scale.get() }] }));

  const layer = (
    <View pointerEvents="none" style={{ position: "absolute", inset: 0, zIndex: 2000, alignItems: "center", justifyContent: "center" }} onLayout={() => setPainted(true)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ position: "absolute", inset: 0, backgroundColor: schemes.light.bg }, bg]} />
      <Animated.View style={mark}>
        <Image source={require("@/assets/brand/tribe-logo.png")} style={{ width: SPLASH_MARK_WIDTH, height: SPLASH_MARK_WIDTH }} contentFit="contain" />
      </Animated.View>
    </View>
  );
  return Platform.OS === "ios" ? <FullWindowOverlay>{layer}</FullWindowOverlay> : layer;
}
