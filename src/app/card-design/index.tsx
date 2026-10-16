import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Note } from "@/components/bits";
import { Button } from "@/components/button";
import { cardLook, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { FlowScreen } from "@/components/flow-screen";
import { Text } from "@/components/text";
import type { CardFinish, CardPattern, CardTheme } from "@/data/seed";
import { CardDesigner, DEFAULT_DESIGN, FinishSwatch, PatternStrip, RainbowSwatch, type CustomDesign } from "@/screens/cards/card-designer";
import { useCardsStore } from "@/stores/use-cards-store";
import { toast } from "@/stores/use-ui-store";
import { CARD_SWATCHES, CARD_THEME_ORDER, CUSTOM_SHADES, spacing, type CustomShade } from "@/theme";
import { customFinish, defaultPattern, isPresetFinish, presetFinish, readCustom, readPreset } from "@/utils/card-finish";
import { hexToHsl } from "@/utils/color";

type Slot = CardTheme | "custom";

/** Where the Light/Rich/Deep switch starts: Rich for the curated colours (as in the Finish step), else the nearest lightness. */
function shadeOf(hex: string): CustomShade {
  if (CARD_SWATCHES.some((sw) => sw.hex.toUpperCase() === hex.toUpperCase())) return "rich";
  const { l } = hexToHsl(hex);
  return (Object.keys(CUSTOM_SHADES) as CustomShade[]).reduce((best, k) => (Math.abs(CUSTOM_SHADES[k].l - l) < Math.abs(CUSTOM_SHADES[best].l - l) ? k : best), "rich");
}

/** Where the pickers start: the card's own colour and pattern. */
function startFrom(f: CardFinish): { slot: Slot; patterns: Partial<Record<CardTheme, CardPattern>>; design: CustomDesign } {
  const custom = readCustom(f);
  if (custom) return { slot: "custom", patterns: {}, design: { ...custom, shade: shadeOf(custom.hex) } };
  const preset = readPreset(f);
  if (preset) return { slot: preset.theme, patterns: { [preset.theme]: preset.pattern }, design: DEFAULT_DESIGN };
  return { slot: isPresetFinish(f) ? f : "midnight", patterns: {}, design: DEFAULT_DESIGN };
}

/**
 * Card design: restyle a card you already have. Same picks as the Finish step (seven colours, each
 * in any pattern, or "Make your own"), previewed on the real face. Only the look changes: the
 * number, CVV, balance and wallet state stay as they are.
 */
export default function CardDesign() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const card = useCardsStore((s) => s.cards.find((k) => k.id === id) ?? s.cards[0]);
  const setTheme = useCardsStore((s) => s.setTheme);
  const current: CardFinish = card?.theme ?? "midnight";
  const [start] = useState(() => startFrom(current));
  const [slot, setSlot] = useState<Slot>(start.slot);
  // each preset remembers the pattern you gave it while you hop between colours
  const [patterns, setPatterns] = useState(start.patterns);
  const [design, setDesign] = useState<CustomDesign>(start.design);
  // the colour under your finger while dragging the hue slider (commits on release)
  const [preview, setPreview] = useState<string | null>(null);
  const finish: CardFinish = slot === "custom" ? customFinish(design.hex, design.pattern) : presetFinish(slot, patterns[slot] ?? defaultPattern(slot));
  const tint = useCardPalette(finish);
  const changed = finish !== current;
  const inner = width - spacing.mdl * 2;

  if (!card) return null;

  const save = () => {
    setTheme(card.id, finish);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast(`${card.label} is now ${cardLook(finish).name}`, "success");
    router.back();
  };

  return (
    <FlowScreen
      title="Card design"
      tint={tint.page}
      footer={<Button title={changed ? `Save ${cardLook(finish).name}` : "Pick a new look"} disabled={!changed} colors={changed ? { bg: tint.accent, fg: tint.accentFg } : undefined} onPress={save} />}
    >
      <View style={{ alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm }}>
        <VirtualCardFace card={{ ...card, theme: slot === "custom" && preview ? customFinish(preview, design.pattern) : finish }} width={inner} />
        <View style={{ alignItems: "center", gap: spacing.xxs }}>
          <Text variant="title" align="center">
            {cardLook(finish).name}
          </Text>
          <Text variant="caption" tone="muted" align="center">
            {changed ? `Was ${cardLook(current).name}` : "Current design"}
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted">
          Colour
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.sm }}>
          {CARD_THEME_ORDER.map((t) => (
            <FinishSwatch key={t} theme={t} on={slot === t} onPress={() => setSlot(t)} />
          ))}
          <RainbowSwatch on={slot === "custom"} onPress={() => setSlot("custom")} />
        </View>
      </View>

      {slot === "custom" ? (
        <CardDesigner design={design} width={inner} onChange={setDesign} onPreview={setPreview} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted">
            Pattern
          </Text>
          <PatternStrip value={patterns[slot] ?? defaultPattern(slot)} finishFor={(p) => presetFinish(slot, p)} onChange={(p) => setPatterns((v) => ({ ...v, [slot]: p }))} bleed={spacing.mdl} />
        </View>
      )}

      <Note icon="info">Only the look changes. Your card number, CVV and balance stay the same, and so does Apple Pay or Google Pay.</Note>
    </FlowScreen>
  );
}
