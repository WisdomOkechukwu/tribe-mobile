import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useId, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Button } from "@/components/button";
import { CARD_THEME_ORDER, CARD_THEMES, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { useSessionStore } from "@/stores/use-session-store";
import { CARD_STEPS, FlowProgress } from "@/components/flow-progress";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import type { CardTheme } from "@/data/seed";
import { spacing, useColors } from "@/theme";

/** Upright cards: the real landscape face, turned 90° — same design, held vertically. */
const CARD_W = 188;
const FACE_W = Math.round(CARD_W * 1.586);
const GAP = 16;
const SNAP = CARD_W + GAP;

function Swatch({ theme, on, onPress }: { theme: CardTheme; on: boolean; onPress: () => void }) {
  const c = useColors();
  // unique per instance: on web every SVG shares one DOM
  const gid = `sw-${theme}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [a, b] = CARD_THEMES[theme].swatch;
  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${CARD_THEMES[theme].name} finish`} style={{ width: 42, height: 42, borderRadius: 21, padding: 3, borderWidth: 2, borderColor: on ? c.brand : "transparent" }}>
      <Svg width={32} height={32}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={32} height={32} rx={16} fill={`url(#${gid})`} stroke={c.border} strokeWidth={1} />
      </Svg>
      {on && (
        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={13} color={theme === "cream" || theme === "lime" || theme === "sky" ? "#201F1F" : "#fff"} weight="bold" />
        </View>
      )}
    </PressableScale>
  );
}

/** One upright card in the carousel: scale, tilt and fade follow the scroll position (UI thread). */
function ThemeCard({ theme, index, x, holder, onPress }: { theme: CardTheme; index: number; x: SharedValue<number>; holder: string; onPress: () => void }) {
  const style = useAnimatedStyle(() => {
    const d = x.get() / SNAP - index;
    return {
      opacity: interpolate(Math.abs(d), [0, 1], [1, 0.55], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(Math.abs(d), [0, 1], [1, 0.88], Extrapolation.CLAMP) }, { rotate: `${interpolate(d, [-1, 0, 1], [6, 0, -6], Extrapolation.CLAMP)}deg` }, { translateY: interpolate(Math.abs(d), [0, 1], [0, 14], Extrapolation.CLAMP) }],
    };
  });
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel={`${CARD_THEMES[theme].name} finish`}>
      <Animated.View style={style}>
        <View style={{ width: CARD_W, height: FACE_W }}>
          <View style={{ position: "absolute", left: (CARD_W - FACE_W) / 2, top: (FACE_W - CARD_W) / 2, transform: [{ rotate: "90deg" }] }}>
            <VirtualCardFace card={{ theme, network: "mastercard", holder: holder, number: "5399", last4: "••••", expiry: "09/29", cvv: "", frozen: false }} width={FACE_W} />
          </View>
        </View>
      </Animated.View>
    </PressableScale>
  );
}

/**
 * New card · Finish: swipe the upright cards (they tilt and settle as they pass the middle) or tap
 * a swatch. The page takes on the finish you're looking at, with a tick of haptics per card.
 */
export default function CardThemeStep() {
  const { width } = useWindowDimensions();
  const user = useSessionStore((s) => s.user);
  const holder = `${user.firstName} ${user.lastName}`.trim() || "Your name";
  const scroller = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const theme = CARD_THEME_ORDER[index];
  const tint = useCardPalette(theme);
  const side = (width - CARD_W) / 2;

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  const settle = (offset: number) => {
    const i = Math.max(0, Math.min(CARD_THEME_ORDER.length - 1, Math.round(offset / SNAP)));
    if (i !== index) Haptics.selectionAsync().catch(() => {});
    setIndex(i);
  };
  const go = (i: number) => {
    if (i !== index) Haptics.selectionAsync().catch(() => {});
    setIndex(i);
    scroller.current?.scrollTo({ x: i * SNAP, animated: true });
  };

  return (
    <FlowScreen
      title="Your dollar card"
      padded={false}
      tint={tint.page}
      footer={
        <>
          <Button title={`Go with ${CARD_THEMES[theme].name}`} colors={{ bg: tint.accent, fg: tint.accentFg }} onPress={() => router.push({ pathname: "/card-new/type", params: { theme } })} />
          <Text variant="caption" tone="muted" align="center">
            By continuing you accept the card terms and privacy policy.
          </Text>
        </>
      }
    >
      <View style={{ paddingHorizontal: spacing.mdl }}>
        <FlowProgress steps={CARD_STEPS} at={0} color={tint.accent} />
      </View>

      <Animated.ScrollView
        ref={scroller}
        horizontal
        snapToInterval={SNAP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={{ paddingHorizontal: side, gap: GAP, paddingTop: spacing.sm, paddingBottom: spacing.lg }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
        onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.x)}
      >
        {CARD_THEME_ORDER.map((th, i) => (
          <ThemeCard key={th} theme={th} index={i} x={x} holder={holder} onPress={() => go(i)} />
        ))}
      </Animated.ScrollView>

      <View style={{ alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.mdl }}>
        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text variant="title">{CARD_THEMES[theme].name}</Text>
          <Text variant="subhead" tone="muted">
            {index + 1} of {CARD_THEME_ORDER.length} finishes · swipe or tap
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm }}>
          {CARD_THEME_ORDER.map((th, i) => (
            <Swatch key={th} theme={th} on={i === index} onPress={() => go(i)} />
          ))}
        </View>
      </View>
    </FlowScreen>
  );
}
