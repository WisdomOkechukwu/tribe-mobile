import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Note } from "@/components/bits";
import { Button } from "@/components/button";
import { useCardPalette, VirtualCardFace } from "@/components/card-face";
import { FlowScreen } from "@/components/flow-screen";
import { Text } from "@/components/text";
import type { CardFinish, CardPattern, CardTheme } from "@/data/seed";
import { CardDesignsSkeleton } from "@/components/skeletons";
import { CardDesigner, DEFAULT_DESIGN, FinishSwatch, isDesignRejected, PatternStrip, RainbowSwatch, useDesignCatalog, type CustomDesign } from "@/screens/cards/card-designer";
import { useCardsStore } from "@/stores/use-cards-store";
import { setCardDesign } from "@/api/actions";
import { errorMessage } from "@/api/http";
import { toast } from "@/stores/use-ui-store";
import { CUSTOM_SHADES, spacing, type CustomShade } from "@/theme";
import { customFinish, defaultPattern, finishName, isFinishOffered, isPresetFinish, patternsFor, presetFinish, readCustom, readPreset, type SwatchOption } from "@/utils/card-finish";
import { hexToHsl } from "@/utils/color";

type Slot = CardTheme | "custom";

/** Where the Light/Rich/Deep switch starts: Rich for the curated colours (as in the Finish step), else the nearest lightness. */
function shadeOf(hex: string, swatches: SwatchOption[]): CustomShade {
  if (swatches.some((sw) => sw.hex.toUpperCase() === hex.toUpperCase())) return "rich";
  const { l } = hexToHsl(hex);
  return (Object.keys(CUSTOM_SHADES) as CustomShade[]).reduce((best, k) => (Math.abs(CUSTOM_SHADES[k].l - l) < Math.abs(CUSTOM_SHADES[best].l - l) ? k : best), "rich");
}

/** Where the pickers start: the card's own colour and pattern. */
function startFrom(f: CardFinish, swatches: SwatchOption[]): { slot: Slot; patterns: Partial<Record<CardTheme, CardPattern>>; design: CustomDesign } {
  const custom = readCustom(f);
  if (custom) return { slot: "custom", patterns: {}, design: { ...custom, shade: shadeOf(custom.hex, swatches) } };
  const preset = readPreset(f);
  if (preset) return { slot: preset.theme, patterns: { [preset.theme]: preset.pattern }, design: DEFAULT_DESIGN };
  return { slot: isPresetFinish(f) ? f : "midnight", patterns: {}, design: DEFAULT_DESIGN };
}

/**
 * Card design: restyle a card you already have. Same picks as the Finish step (the finishes the
 * admin offers, each in any offered pattern, or "Make your own"), previewed on the real face. A
 * card wearing a finish that's since been turned off keeps it (shown as current), but only
 * offered designs can be picked; a pick turned off while you look falls back to the card's own. Only the look changes: the
 * number, CVV, balance and wallet state stay as they are.
 */
export default function CardDesign() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const card = useCardsStore((s) => s.cards.find((k) => k.id === id) ?? s.cards[0]);
  const [saving, setSaving] = useState(false);
  const current: CardFinish = card?.theme ?? "midnight";
  const { avail, loading, refetch } = useDesignCatalog();
  const [start] = useState(() => startFrom(current, avail.swatches));
  const [slot, setSlot] = useState<Slot>(start.slot);
  // each preset remembers the pattern you gave it while you hop between colours
  const [patterns, setPatterns] = useState(start.patterns);
  const [design, setDesign] = useState<CustomDesign>(start.design);
  // the colour under your finger while dragging the hue slider (commits on release)
  const [preview, setPreview] = useState<string | null>(null);
  const offered = (f: CardFinish) => f === current || isFinishOffered(f, avail);
  // a remembered pattern that's been turned off falls back to the preset's own
  const presetPick = (t: CardTheme) => {
    const p = patterns[t];
    return p && offered(presetFinish(t, p)) ? p : defaultPattern(t);
  };
  // "Make your own" keeps its colour; a pattern that's been turned off becomes the first offered one
  const customPattern = offered(customFinish(design.hex, design.pattern)) ? design.pattern : (avail.patterns[0]?.id ?? design.pattern);
  const picked: CardFinish = slot === "custom" ? customFinish(design.hex, customPattern) : presetFinish(slot, presetPick(slot));
  const finish: CardFinish = offered(picked) ? picked : current;
  const slotOffered = slot === "custom" ? avail.patterns.length > 0 : avail.themes.some((t) => t.id === slot);
  const name = finishName(finish, avail);
  const tint = useCardPalette(finish);
  const changed = finish !== current;
  const inner = width - spacing.mdl * 2;

  if (!card) return null;

  const save = async () => {
    setSaving(true);
    try {
      await setCardDesign(card, finish);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(`${card.label} is now ${name}`, "success");
      router.back();
    } catch (e) {
      // turned off since this screen loaded: refresh the pickers (the card keeps its look)
      if (isDesignRejected(e)) refetch();
      toast(errorMessage(e), "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowScreen
      title="Card design"
      tint={tint.page}
      footer={<Button title={changed ? `Save ${name}` : "Pick a new look"} disabled={!changed || loading} loading={saving} colors={changed ? { bg: tint.accent, fg: tint.accentFg } : undefined} onPress={save} />}
    >
      {loading ? (
        <View style={{ paddingTop: spacing.sm }}>
          <CardDesignsSkeleton cardWidth={inner} />
        </View>
      ) : (
      <>
      <View style={{ alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm }}>
        <VirtualCardFace card={{ ...card, theme: slot === "custom" && preview && finish === picked ? customFinish(preview, customPattern) : finish }} width={inner} />
        <View style={{ alignItems: "center", gap: spacing.xxs }}>
          <Text variant="title" align="center">
            {name}
          </Text>
          <Text variant="caption" tone="muted" align="center">
            {changed ? `Was ${finishName(current, avail)}` : "Current design"}
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted">
          Colour
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.sm }}>
          {avail.themes.map((t) => (
            <FinishSwatch key={t.id} theme={t.id} name={t.name} on={slot === t.id} onPress={() => setSlot(t.id)} />
          ))}
          {avail.patterns.length > 0 && <RainbowSwatch on={slot === "custom"} onPress={() => setSlot("custom")} />}
        </View>
      </View>

      {!slotOffered ? null : slot === "custom" ? (
        <CardDesigner design={{ ...design, pattern: customPattern }} width={inner} swatches={avail.swatches} patterns={avail.patterns} onChange={setDesign} onPreview={setPreview} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted">
            Pattern
          </Text>
          <PatternStrip patterns={patternsFor(slot, avail)} value={presetPick(slot)} finishFor={(p) => presetFinish(slot, p)} onChange={(p) => setPatterns((v) => ({ ...v, [slot]: p }))} bleed={spacing.mdl} />
        </View>
      )}
      </>
      )}

      <Note icon="info">Only the look changes. Your card number, CVV and balance stay the same, and so does Apple Pay or Google Pay.</Note>
    </FlowScreen>
  );
}
