import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { useFocusEffect } from "expo-router";
import { useCallback, useId } from "react";
import { Platform, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { CARD_GLASS, type CardLook } from "@/theme";
import { PAY, PAY_MARKS } from "@/utils/pay-platform";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";

/** Evaluated once: real Liquid Glass on iOS 26+, a blur on older iOS, a frosted fill elsewhere. */
const NATIVE_GLASS = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/** The phone's wallet mark (Apple Pay on iOS/web, Google Pay on Android), in one ink. */
export function PayMark({ color, height }: { color: string; height: number }) {
  const m = PAY_MARKS[PAY.id];
  return (
    <Svg width={height * m.ratio} height={height} viewBox={m.viewBox}>
      <Path d={m.d} fill={color} />
    </Svg>
  );
}

/** Pill geometry for a given height: room for the mark (and the ✓ once added). */
function pillSize(height: number, added: boolean) {
  const markH = Math.round(height * 0.44);
  const width = Math.round(markH * PAY_MARKS[PAY.id].ratio + height * 0.9 + (added ? height * 0.6 : 0));
  return { markH, width };
}

/** The mark (and ✓ when added), centred in the pill. */
function PillContent({ look, height, added }: { look: CardLook; height: number; added: boolean }) {
  const { markH } = pillSize(height, added);
  const dot = Math.round(height * 0.44);
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: height * 0.16 }}>
      <PayMark color={look.fg} height={markH} />
      {added && (
        <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: look.fg, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={dot * 0.55} color={look.bg} weight="bold" />
        </View>
      )}
    </View>
  );
}

/** "Works with Apple Pay": the flat pill on every other face (reviews, carousel, thumbnails). */
function StaticPill({ look, height, added }: { look: CardLook; height: number; added: boolean }) {
  const glass = CARD_GLASS[look.light ? "light" : "dark"];
  const { width } = pillSize(height, added);
  return (
    <View style={{ width, height, borderRadius: height / 2, borderCurve: "continuous", backgroundColor: glass.fill, borderWidth: 1, borderColor: glass.border }}>
      <PillContent look={look} height={height} added={added} />
    </View>
  );
}

/**
 * The live pill on the Cards tab: real glass (Liquid Glass / blur / frost), a light sweep every
 * few seconds and a breathing top highlight until the card is added. Motion runs only while the
 * tab is focused and never with Reduce Motion on. Tapping it opens Wallet & payments.
 */
function GlassPill({ look, height, added, onPress }: { look: CardLook; height: number; added: boolean; onPress: () => void }) {
  const glass = CARD_GLASS[look.light ? "light" : "dark"];
  const { width } = pillSize(height, added);
  const reduce = useReducedMotion();
  const sweep = useSharedValue(0);
  const glow = useSharedValue(1);
  // unique per instance: on web every SVG shares one DOM
  const gid = `sheen-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const sheenW = Math.round(height * 0.9);
  const travel = width + sheenW * 2;

  useFocusEffect(
    useCallback(() => {
      if (reduce || added) return;
      sweep.set(withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }), withDelay(2600, withTiming(0, { duration: 0 }))), -1));
      glow.set(withRepeat(withTiming(0.5, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true));
      return () => {
        cancelAnimation(sweep);
        cancelAnimation(glow);
        sweep.set(0);
        glow.set(1);
      };
    }, [reduce, added, sweep, glow]),
  );

  const sheenStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -sheenW + sweep.get() * travel }, { rotate: "20deg" }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      hitSlop={6}
      accessibilityLabel={added ? `${PAY.name}: added. Manage` : `Add to ${PAY.name}`}
      accessibilityHint="Opens Wallet & payments"
      // transparent padding: a ≥44pt target without making the pill itself bigger
      style={{ padding: 7, margin: -7 }}
    >
      <View style={{ width, height, borderRadius: height / 2, borderCurve: "continuous", overflow: "hidden", borderWidth: 1, borderColor: glass.border }}>
        {NATIVE_GLASS ? (
          <GlassView glassEffectStyle="clear" style={{ position: "absolute", inset: 0, borderRadius: height / 2 }} />
        ) : Platform.OS === "ios" ? (
          <>
            <BlurView tint={look.light ? "systemUltraThinMaterialLight" : "systemUltraThinMaterialDark"} intensity={40} style={{ position: "absolute", inset: 0 }} />
            <View style={{ position: "absolute", inset: 0, backgroundColor: glass.fill, opacity: 0.45 }} />
          </>
        ) : (
          <View style={[{ position: "absolute", inset: 0, backgroundColor: glass.fill }, Platform.OS === "web" ? ({ backdropFilter: "blur(10px) saturate(160%)" } as object) : null]} />
        )}
        {/* the sweep of light */}
        {!reduce && !added && (
          <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -height / 2, left: 0, width: sheenW, height: height * 2 }, sheenStyle]}>
            <Svg width={sheenW} height={height * 2}>
              <Defs>
                <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={CARD_GLASS.sheen} stopOpacity={0} />
                  <Stop offset="0.5" stopColor={CARD_GLASS.sheen} stopOpacity={0.55} />
                  <Stop offset="1" stopColor={CARD_GLASS.sheen} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={sheenW} height={height * 2} fill={`url(#${gid})`} />
            </Svg>
          </Animated.View>
        )}
        {/* the glass's top edge catching the light */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: height * 0.4, right: height * 0.4, height: 1, backgroundColor: glass.highlight }, glowStyle]} />
        <PillContent look={look} height={height} added={added} />
      </View>
    </PressableScale>
  );
}

/** The wallet pill on a card face: static everywhere, live glass when it has somewhere to go. */
export function WalletPill({ look, height, added = false, onPress }: { look: CardLook; height: number; added?: boolean; onPress?: () => void }) {
  return onPress ? <GlassPill look={look} height={height} added={added} onPress={onPress} /> : <StaticPill look={look} height={height} added={added} />;
}
