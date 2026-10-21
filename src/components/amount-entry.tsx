import { View } from "react-native";
import { radius, spacing, useColors } from "@/theme";
import { NumberPad } from "./pin-pad";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Append a keypad digit to an amount string, respecting decimals. */
export function pushDigit(v: string, d: string, decimals: number) {
  if (d === "." && (v.includes(".") || decimals === 0)) return v;
  const [, frac] = v.split(".");
  if (frac !== undefined && frac.length >= decimals) return v;
  if (v === "0" && d !== ".") return d;
  if (v.replace(".", "").length >= 12) return v;
  return (v || (d === "." ? "0" : "")) + d;
}

export const groupAmount = (v: string) => {
  if (!v) return "0";
  const [i, f] = v.split(".");
  return Number(i || 0).toLocaleString("en-US") + (f !== undefined ? `.${f}` : "");
};

/** Big brand amount + number pad (with decimal key) + optional quick presets. */
export function AmountEntry({
  value,
  onChange,
  prefix,
  suffix,
  decimals = 2,
  helper,
  presets,
  error,
  showDisplay = true,
  pad = true,
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  helper?: string;
  presets?: { label: string; value: string }[];
  error?: string;
  /** false when the screen renders the amount itself (e.g. Swap's pay card) */
  showDisplay?: boolean;
  /** false when the screen docks one shared `KeypadDock` instead (bills, recurring) */
  pad?: boolean;
  /** shorter keys, for short screens that also show cards above the pad (Send) */
  compact?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.md }}>
      {showDisplay && (
      <View style={{ alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm }}>
        <Text variant="hero" adjustsFontSizeToFit numberOfLines={1} style={{ color: error ? c.danger : value ? c.text : c.textSubtle, fontSize: 48, lineHeight: 54 }}>
          {prefix}
          {groupAmount(value)}
          {suffix ? <Text variant="title" tone="muted">{` ${suffix}`}</Text> : null}
        </Text>
        <Text variant="label" style={{ color: error ? c.danger : c.textMuted }}>
          {error ?? helper ?? " "}
        </Text>
      </View>
      )}
      {presets && (
        <View style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "center" }}>
          {presets.map((p) => (
            <PressableScale key={p.label} onPress={() => onChange(p.value)} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: c.surface }}>
              <Text variant="label">{p.label}</Text>
            </PressableScale>
          ))}
        </View>
      )}
      {pad && (
      <NumberPad
        compact={compact}
        onKey={(d) => onChange(pushDigit(value, d, decimals))}
        onDelete={() => onChange(value.slice(0, -1))}
        extra={
          decimals > 0 ? (
            <PressableScale haptic={false} onPress={() => onChange(pushDigit(value, ".", decimals))} accessibilityLabel="Decimal point" style={{ width: 76, height: compact ? 46 : 64, alignItems: "center", justifyContent: "center" }}>
              <Text variant="display" style={{ fontSize: 30 }}>
                .
              </Text>
            </PressableScale>
          ) : null
        }
      />
      )}
    </View>
  );
}
