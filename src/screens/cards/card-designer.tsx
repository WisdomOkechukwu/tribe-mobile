import * as Haptics from "expo-haptics";
import { useEffect, useId, useState } from "react";
import { ScrollView, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { CardThumb, cardLook } from "@/components/card-face";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import type { CardPattern, CardTheme } from "@/data/seed";
import { CARD_PATTERNS, CARD_SWATCHES, CUSTOM_SHADES, palette, radius, spacing, useColors, type CustomShade } from "@/theme";
import { colourName, customFinish } from "@/utils/card-finish";
import { hexToHsl, hslToHex } from "@/utils/color";

/** A user-made finish while it's being designed. */
export type CustomDesign = { hex: string; pattern: CardPattern; shade: CustomShade };
export const DEFAULT_DESIGN: CustomDesign = { hex: "#FF7A5C", pattern: "waves", shade: "rich" };

const shadeHex = (h: number, shade: CustomShade) => hslToHex({ h, s: CUSTOM_SHADES[shade].s, l: CUSTOM_SHADES[shade].l });

// the slider track's colour stops, per shade (built on the JS side; the worklet only reads them)
const HUE_STOPS = [0, 60, 120, 180, 240, 300, 360];
const TRACK_COLORS: Record<CustomShade, string[]> = {
  light: HUE_STOPS.map((h) => shadeHex(h, "light")),
  rich: HUE_STOPS.map((h) => shadeHex(h, "rich")),
  deep: HUE_STOPS.map((h) => shadeHex(h, "deep")),
};
const THUMB = 28;
const TRACK_H = 16;

/** The 8th swatch on the Finish step: a colour wheel standing for "Make your own". */
const WEDGES = Array.from({ length: 12 }, (_, i) => {
  const a0 = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const a1 = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2;
  const p = (a: number) => `${16 + 16 * Math.cos(a)} ${16 + 16 * Math.sin(a)}`;
  return { d: `M16 16L${p(a0)}A16 16 0 0 1 ${p(a1)}Z`, fill: shadeHex(i * 30, "rich") };
});

export function RainbowSwatch({ on, onPress }: { on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel="Make your own finish" style={{ width: 38, height: 38, borderRadius: 19, padding: 3, borderWidth: 2, borderColor: on ? c.brand : "transparent" }}>
      <Svg width={28} height={28} viewBox="0 0 32 32">
        {WEDGES.map((w) => (
          <Path key={w.d} d={w.d} fill={w.fill} />
        ))}
      </Svg>
      <View style={{ position: "absolute", left: 14, top: 14, width: 6, height: 6, borderRadius: 3, backgroundColor: palette.white }} />
    </PressableScale>
  );
}

/**
 * Pick any hue: drag or tap the track. While dragging, the card previews the colour (throttled to
 * 2° steps); letting go commits it. Worklets only do arithmetic, then hop to JS with scheduleOnRN.
 */
function HueSlider({ hue, shade, label, onPreview, onCommit }: { hue: number; shade: CustomShade; label: string; onPreview: (h: number) => void; onCommit: (h: number) => void }) {
  const c = useColors();
  const gid = `hue-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const lastSent = useSharedValue(hue);
  const stops = TRACK_COLORS[shade];

  // follow the committed hue (swatch taps, shade changes)
  useEffect(() => {
    if (w) x.set((hue / 360) * w);
  }, [hue, w, x]);

  const pan = Gesture.Pan()
    .activeOffsetX([-4, 4])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const full = width.get();
      const px = Math.min(Math.max(e.x, 0), full);
      x.set(px);
      const h = full ? (px / full) * 360 : 0;
      if (Math.abs(h - lastSent.get()) >= 2) {
        lastSent.set(h);
        scheduleOnRN(onPreview, h);
      }
    })
    .onEnd(() => {
      const full = width.get();
      scheduleOnRN(onCommit, full ? (x.get() / full) * 360 : 0);
    });
  const tap = Gesture.Tap().onEnd((e) => {
    const full = width.get();
    const px = Math.min(Math.max(e.x, 0), full);
    x.set(px);
    scheduleOnRN(onCommit, full ? (px / full) * 360 : 0);
  });

  const thumb = useAnimatedStyle(() => {
    const full = width.get();
    return {
      transform: [{ translateX: x.get() - THUMB / 2 }],
      backgroundColor: interpolateColor(full ? (x.get() / full) * 360 : 0, HUE_STOPS, stops),
    };
  });

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Colour"
        accessibilityValue={{ text: label }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => onCommit((hue + (e.nativeEvent.actionName === "increment" ? 15 : -15) + 360) % 360)}
        onLayout={(e: LayoutChangeEvent) => {
          setW(e.nativeEvent.layout.width);
          width.set(e.nativeEvent.layout.width);
        }}
        style={{ height: THUMB + 8, justifyContent: "center" }}
      >
        {w > 0 && (
          <Svg width={w} height={TRACK_H}>
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
                {stops.map((col, i) => (
                  <Stop key={HUE_STOPS[i]} offset={i / (stops.length - 1)} stopColor={col} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={TRACK_H} rx={TRACK_H / 2} fill={`url(#${gid})`} />
          </Svg>
        )}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderWidth: 3, borderColor: palette.white, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }, thumb]} />
        {!w && <View style={{ height: TRACK_H, borderRadius: TRACK_H / 2, backgroundColor: c.surfaceAlt }} />}
      </View>
    </GestureDetector>
  );
}

/** A preset finish as a round swatch (Finish step, Card design). */
export function FinishSwatch({ theme, on, onPress }: { theme: CardTheme; on: boolean; onPress: () => void }) {
  const c = useColors();
  // unique per instance: on web every SVG shares one DOM
  const gid = `sw-${theme}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const look = cardLook(theme);
  const [a, b] = look.swatch;
  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${look.name} finish`} style={{ width: 38, height: 38, borderRadius: 19, padding: 3, borderWidth: 2, borderColor: on ? c.brand : "transparent" }}>
      <Svg width={28} height={28}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={28} height={28} rx={14} fill={`url(#${gid})`} stroke={c.border} strokeWidth={1} />
      </Svg>
      {on && (
        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={13} color={look.fg} weight="bold" />
        </View>
      )}
    </PressableScale>
  );
}

/**
 * Every pattern as a mini card in the colours you've picked, in one swipeable row. Used for the
 * presets and for "Make your own". `bleed` lets the row run to the edges of a padded parent.
 */
export function PatternStrip({ value, finishFor, onChange, bleed = 0 }: { value: CardPattern; finishFor: (p: CardPattern) => string; onChange: (p: CardPattern) => void; bleed?: number }) {
  const c = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} style={{ marginHorizontal: -bleed }} contentContainerStyle={{ paddingHorizontal: bleed, gap: spacing.sm }}>
      {CARD_PATTERNS.map((p) => {
        const on = p.id === value;
        return (
          <PressableScale
            key={p.id}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(p.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${p.label} pattern`}
            style={{ alignItems: "center", gap: spacing.xs }}
          >
            <View style={{ padding: 3, borderRadius: radius.xs + 3, borderWidth: 2, borderColor: on ? c.brand : "transparent" }}>
              <CardThumb theme={finishFor(p.id)} width={84} />
            </View>
            <Text variant="caption" tone={on ? "text" : "muted"} style={on ? { fontFamily: "Poppins_600SemiBold" } : undefined}>
              {p.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function ColourDot({ hex, name, on, onPress }: { hex: string; name: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={name} style={{ width: 40, height: 40, borderRadius: 20, padding: 3, borderWidth: 2, borderColor: on ? c.brand : "transparent" }}>
      <View style={{ flex: 1, borderRadius: 16, backgroundColor: hex, borderWidth: 1, borderColor: c.border }} />
    </PressableScale>
  );
}

/**
 * "Make your own": twelve curated colours, any hue from the slider (as a pastel, a full colour or
 * a deep one), and every pattern. Swatch, shade and pattern taps commit at once; the slider
 * previews while you drag (`onPreview`) and commits when you let go.
 */
export function CardDesigner({ design, width, onChange, onPreview }: { design: CustomDesign; width: number; onChange: (d: CustomDesign) => void; onPreview: (hex: string | null) => void }) {
  const c = useColors();
  const hue = hexToHsl(design.hex).h;
  const pick = (next: Partial<CustomDesign>) => {
    onPreview(null);
    onChange({ ...design, ...next });
  };

  return (
    <View style={{ width, alignSelf: "center", backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted">
          Colour
        </Text>
        {/* two even rows of six */}
        {[CARD_SWATCHES.slice(0, 6), CARD_SWATCHES.slice(6)].map((row) => (
          <View key={row[0].hex} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {row.map((s) => (
              <ColourDot key={s.hex} hex={s.hex} name={s.name} on={s.hex === design.hex} onPress={() => pick({ hex: s.hex })} />
            ))}
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="subhead" tone="muted">
            Or any colour
          </Text>
          <Text variant="caption" tone="muted">
            {colourName(design.hex)}
          </Text>
        </View>
        <HueSlider hue={hue} shade={design.shade} label={colourName(design.hex)} onPreview={(h) => onPreview(shadeHex(h, design.shade))} onCommit={(h) => pick({ hex: shadeHex(h, design.shade) })} />
        <Segmented<CustomShade>
          value={design.shade}
          onChange={(shade) => pick({ shade, hex: shadeHex(hue, shade) })}
          options={(Object.keys(CUSTOM_SHADES) as CustomShade[]).map((k) => ({ value: k, label: CUSTOM_SHADES[k].label }))}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted">
          Pattern
        </Text>
        <PatternStrip value={design.pattern} finishFor={(p) => customFinish(design.hex, p)} onChange={(pattern) => pick({ pattern })} bleed={spacing.md} />
      </View>
    </View>
  );
}
