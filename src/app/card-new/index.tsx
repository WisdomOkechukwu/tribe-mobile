import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { Button } from "@/components/button";
import { cardLook, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { CARD_STEPS, FlowProgress } from "@/components/flow-progress";
import { FlowScreen } from "@/components/flow-screen";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import type { CardFinish, CardPattern, CardTheme } from "@/data/seed";
import { CardDesigner, DEFAULT_DESIGN, FinishSwatch, PatternStrip, RainbowSwatch, type CustomDesign } from "@/screens/cards/card-designer";
import { useSessionStore } from "@/stores/use-session-store";
import { CARD_THEME_ORDER, fonts, palette, radius, spacing } from "@/theme";
import { customFinish, defaultPattern, presetFinish } from "@/utils/card-finish";

/** Upright cards: the real landscape face, turned 90° — same design, held vertically. */
const CARD_W = 188;
const FACE_W = Math.round(CARD_W * 1.586);
const GAP = 16;
const SNAP = CARD_W + GAP;
/** The seven presets, then "Make your own". */
const SLOTS: (CardTheme | "custom")[] = [...CARD_THEME_ORDER, "custom"];

/** One upright card in the carousel: scale, tilt and fade follow the scroll position (UI thread). */
function ThemeCard({ finish, index, x, holder, sticker, onPress }: { finish: CardFinish; index: number; x: SharedValue<number>; holder: string; sticker?: string; onPress: () => void }) {
  const style = useAnimatedStyle(() => {
    const d = x.get() / SNAP - index;
    return {
      opacity: interpolate(Math.abs(d), [0, 1], [1, 0.55], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(Math.abs(d), [0, 1], [1, 0.88], Extrapolation.CLAMP) }, { rotate: `${interpolate(d, [-1, 0, 1], [6, 0, -6], Extrapolation.CLAMP)}deg` }, { translateY: interpolate(Math.abs(d), [0, 1], [0, 14], Extrapolation.CLAMP) }],
    };
  });
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel={`${cardLook(finish).name} finish`}>
      <Animated.View style={style}>
        <View style={{ width: CARD_W, height: FACE_W }}>
          <View style={{ position: "absolute", left: (CARD_W - FACE_W) / 2, top: (FACE_W - CARD_W) / 2, transform: [{ rotate: "90deg" }] }}>
            <VirtualCardFace card={{ theme: finish, network: "mastercard", holder }} width={FACE_W} />
          </View>
          {sticker && (
            <View style={{ position: "absolute", left: -8, top: FACE_W * 0.42, transform: [{ rotate: "-6deg" }], backgroundColor: palette.white, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs, boxShadow: "0 6px 14px -6px rgba(0,0,0,0.45)" }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: palette.purple[700] }}>{sticker}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </PressableScale>
  );
}

/**
 * New card · Finish: swipe the upright cards (they tilt and settle as they pass the middle) or tap
 * a swatch. The last one is "Make your own": any colour and any pattern. The page takes
 * on the finish you're looking at, with a tick of haptics per card.
 */
export default function CardThemeStep() {
  const { width } = useWindowDimensions();
  const user = useSessionStore((s) => s.user);
  const holder = `${user.firstName} ${user.lastName}`.trim() || "Your name";
  const scroller = useAnimatedRef<Animated.ScrollView>();
  // `?start=custom` opens straight on "Make your own"
  const { start } = useLocalSearchParams<{ start?: string }>();
  const [first] = useState(start === "custom" ? SLOTS.length - 1 : 0);
  const [index, setIndex] = useState(first);
  const x = useSharedValue(first * SNAP);
  // contentOffset isn't honoured on web: put the carousel on the starting card after layout
  useEffect(() => {
    if (first) requestAnimationFrame(() => scroller.current?.scrollTo({ x: first * SNAP, animated: false }));
  }, [first, scroller]);
  const [design, setDesign] = useState<CustomDesign>(DEFAULT_DESIGN);
  // each preset can wear any pattern; remembered per finish while you swipe between them
  const [patterns, setPatterns] = useState<Partial<Record<CardTheme, CardPattern>>>({});
  const presetLook = (t: CardTheme) => presetFinish(t, patterns[t] ?? defaultPattern(t));
  // the colour under your finger while dragging the hue slider (the page tint waits for the release)
  const [preview, setPreview] = useState<string | null>(null);
  const slot = SLOTS[index];
  const custom = customFinish(design.hex, design.pattern);
  const finish: CardFinish = slot === "custom" ? custom : presetLook(slot);
  const look = cardLook(slot === "custom" && preview ? customFinish(preview, design.pattern) : finish);
  const tint = useCardPalette(finish);
  const side = (width - CARD_W) / 2;

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  const settle = (offset: number) => {
    const i = Math.max(0, Math.min(SLOTS.length - 1, Math.round(offset / SNAP)));
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
          <Button title={`Go with ${cardLook(finish).name}`} colors={{ bg: tint.accent, fg: tint.accentFg }} onPress={() => router.push({ pathname: "/card-new/type", params: { theme: finish } })} />
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
        contentOffset={{ x: first * SNAP, y: 0 }}
        contentContainerStyle={{ paddingHorizontal: side, gap: GAP, paddingTop: spacing.sm, paddingBottom: spacing.lg }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
        onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.x)}
      >
        {SLOTS.map((s, i) =>
          s === "custom" ? (
            // stable key: the card re-colours as you design, it doesn't remount
            <ThemeCard key="custom" finish={preview ? customFinish(preview, design.pattern) : custom} index={i} x={x} holder={holder} sticker="Your design" onPress={() => go(i)} />
          ) : (
            <ThemeCard key={s} finish={presetLook(s)} index={i} x={x} holder={holder} onPress={() => go(i)} />
          ),
        )}
      </Animated.ScrollView>

      <View style={{ alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.mdl }}>
        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text variant="title" align="center">
            {look.name}
          </Text>
          <Text variant="subhead" tone="muted">
            {slot === "custom" ? "Your colour, your pattern" : `${index + 1} of ${CARD_THEME_ORDER.length} colours · pick any pattern below`}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
          {SLOTS.map((s, i) => (s === "custom" ? <RainbowSwatch key="custom" on={i === index} onPress={() => go(i)} /> : <FinishSwatch key={s} theme={s} on={i === index} onPress={() => go(i)} />))}
        </View>
      </View>

      {slot !== "custom" && (
        <View style={{ paddingHorizontal: spacing.mdl, paddingTop: spacing.sm, gap: spacing.sm }}>
          <Text variant="subhead" tone="muted">
            Pattern
          </Text>
          <PatternStrip value={patterns[slot] ?? defaultPattern(slot)} finishFor={(p) => presetFinish(slot, p)} onChange={(p) => setPatterns((v) => ({ ...v, [slot]: p }))} bleed={spacing.mdl} />
        </View>
      )}

      {slot === "custom" && (
        <View style={{ paddingHorizontal: spacing.mdl, paddingTop: spacing.sm }}>
          <CardDesigner design={design} width={width - spacing.mdl * 2} onChange={setDesign} onPreview={setPreview} />
        </View>
      )}
    </FlowScreen>
  );
}
