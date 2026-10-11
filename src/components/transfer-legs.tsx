import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

const LEAD = 40;

export type Leg = {
  leading: ReactNode;
  /** "From" / "To" / "You paid" … */
  label: string;
  title: string;
  value?: string;
  /** small caption above the value, e.g. "Balance" */
  valueLabel?: string;
  valueTone?: "text" | "success";
  /** makes the leg a picker (shows a chevron) */
  onPress?: () => void;
};

function LegRow({ leg }: { leg: Leg }) {
  const c = useColors();
  const row = (pressed: boolean) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd, backgroundColor: pressed ? c.surfaceAlt : c.surface }}>
      {leg.leading}
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone="muted">
          {leg.label}
        </Text>
        <Text variant="bodyStrong" numberOfLines={1}>
          {leg.title}
        </Text>
      </View>
      {leg.value !== undefined && (
        <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
          {leg.valueLabel && (
            <Text variant="caption" tone="muted">
              {leg.valueLabel}
            </Text>
          )}
          <Text variant={leg.valueLabel ? "subhead" : "amount"} numberOfLines={1} style={{ color: leg.valueTone === "success" ? c.success : c.text }}>
            {leg.value}
          </Text>
        </View>
      )}
      {leg.onPress && <Icon name="chevronDown" size={11} color={c.textSubtle} weight="bold" />}
    </View>
  );
  if (!leg.onPress) return row(false);
  return (
    <Pressable onPress={leg.onPress} accessibilityRole="button" accessibilityLabel={`${leg.label}: ${leg.title}${leg.value ? `, ${leg.valueLabel ?? ""} ${leg.value}` : ""}. Change`}>
      {({ pressed }) => row(pressed)}
    </Pressable>
  );
}

/**
 * Two places money moves between, stacked with an arrow on the seam (Fund card, Withdraw,
 * swap results). Legs with `onPress` become pickers.
 */
export function TransferLegs({ from, to }: { from: Leg; to: Leg }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
      <LegRow leg={from} />
      <View style={{ height: 1, backgroundColor: c.border, marginLeft: spacing.md + LEAD + spacing.smd, zIndex: 2 }}>
        <View style={{ position: "absolute", left: -(spacing.smd + LEAD / 2) - 12, top: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}>
          <Icon name="arrowDown" size={11} color={c.textMuted} weight="bold" />
        </View>
      </View>
      <LegRow leg={to} />
    </View>
  );
}

export const LEG_ICON = LEAD;
