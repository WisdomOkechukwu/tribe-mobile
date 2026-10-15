import { View } from "react-native";
import { spacing, useColors } from "@/theme";
import { Glyph, type GlyphName } from "./glyphs";
import { Icon, type IconName } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * 56pt circular action with label — the Home / asset / card action row. `glyph` uses our own line
 * icons; `colors` repaints the disc (the Cards tab follows the card's finish).
 */
export function CircleAction({ icon, glyph, label, onPress, primary, badge, colors, dimmed, accessibilityHint }: { icon?: IconName; glyph?: GlyphName; label: string; onPress: () => void; primary?: boolean; badge?: boolean; colors?: { bg: string; fg: string }; dimmed?: boolean; accessibilityHint?: string }) {
  const c = useColors();
  const bg = colors?.bg ?? (primary ? c.brand : c.surface);
  const fg = colors?.fg ?? (primary ? c.onBrand : c.text);
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} accessibilityHint={accessibilityHint} scaleTo={0.92} style={{ alignItems: "center", gap: spacing.sm, minWidth: 64, opacity: dimmed ? 0.45 : 1 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        {glyph ? <Glyph name={glyph} size={24} color={fg} strokeWidth={2} /> : icon ? <Icon name={icon} size={22} color={fg} /> : null}
        {badge && <View style={{ position: "absolute", top: 4, right: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent, borderWidth: 2, borderColor: bg }} />}
      </View>
      <Text variant="subhead">{label}</Text>
    </PressableScale>
  );
}

export function CircleActionRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", justifyContent: "space-around" }}>{children}</View>;
}
