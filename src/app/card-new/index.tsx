import { router } from "expo-router";
import { useId, useRef, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Button } from "@/components/button";
import { CARD_THEME_ORDER, CARD_THEMES, VirtualCardPortrait } from "@/components/card-face";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import type { CardTheme } from "@/data/seed";
import { spacing, useColors } from "@/theme";

const CARD_W = 196;
const GAP = 18;

function Swatch({ theme, on, onPress }: { theme: CardTheme; on: boolean; onPress: () => void }) {
  const c = useColors();
  // unique per instance: on web every SVG shares one DOM
  const gid = `sw-${theme}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [a, b] = CARD_THEMES[theme].swatch;
  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${CARD_THEMES[theme].name} theme`} style={{ width: 42, height: 42, borderRadius: 21, padding: 3, borderWidth: 2, borderColor: on ? c.brand : "transparent" }}>
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

/** New card · 1: "Dollar virtual card" — swipe the upright cards or tap a swatch to pick a theme. */
export default function CardThemeStep() {
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const theme = CARD_THEME_ORDER[index];
  const side = (width - CARD_W) / 2;

  const go = (i: number) => {
    setIndex(i);
    scroller.current?.scrollTo({ x: i * (CARD_W + GAP), animated: true });
  };

  return (
    <FlowScreen
      title="Dollar virtual card"
      step="Step 1 of 3"
      padded={false}
      footer={
        <>
          <Button title="Accept and proceed" onPress={() => router.push({ pathname: "/card-new/type", params: { theme } })} />
          <Text variant="caption" tone="muted" align="center">
            By continuing you accept the card terms and privacy policy.
          </Text>
        </>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}
        ref={scroller}
        horizontal
        snapToInterval={CARD_W + GAP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: side, gap: GAP, paddingVertical: spacing.lg }}
        onMomentumScrollEnd={(e) => setIndex(Math.max(0, Math.min(CARD_THEME_ORDER.length - 1, Math.round(e.nativeEvent.contentOffset.x / (CARD_W + GAP)))))}
        onScrollEndDrag={(e) => setIndex(Math.max(0, Math.min(CARD_THEME_ORDER.length - 1, Math.round(e.nativeEvent.contentOffset.x / (CARD_W + GAP)))))}
      >
        {CARD_THEME_ORDER.map((th, i) => (
          <PressableScale key={th} onPress={() => go(i)} scaleTo={0.98} accessibilityLabel={`${CARD_THEMES[th].name} card`} style={{ transform: [{ scale: i === index ? 1 : 0.9 }, { rotate: i === index ? "0deg" : i < index ? "-4deg" : "4deg" }], opacity: i === index ? 1 : 0.65 }}>
            <VirtualCardPortrait theme={th} network="mastercard" width={CARD_W} />
          </PressableScale>
        ))}
      </ScrollView>

      <View style={{ alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.mdl }}>
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text variant="headline">Select a theme</Text>
          <Text variant="subhead" tone="muted">
            {CARD_THEMES[theme].name}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {CARD_THEME_ORDER.map((th, i) => (
            <Swatch key={th} theme={th} on={i === index} onPress={() => go(i)} />
          ))}
        </View>
      </View>
    </FlowScreen>
  );
}
