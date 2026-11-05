import * as Clipboard from "expo-clipboard";
import { View } from "react-native";
import { toast } from "@/stores/use-ui-store";
import { fonts, palette, radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { useCompactPad } from "./keypad-field";
import { NumberPad } from "./pin-pad";
import { PressableScale } from "./pressable-scale";
import { Stripes } from "./stripes";
import { Text } from "./text";

/** Digit indexes per group, read as 3 · 4 · 4. */
const GROUPS = [
  [0, 1, 2],
  [3, 4, 5, 6],
  [7, 8, 9, 10],
];

/**
 * BVN / NIN entry: the number fills in on a branded "ID slip" (grouped 3·4·4, the next digit
 * underlined), typed on our keypad — never the system keyboard. Paste takes the first 11 digits.
 */
export function IdNumberEntry({ label, value, onChange, length = 11, help, disabled = false }: { label: "BVN" | "NIN" | string; value: string; onChange: (v: string) => void; length?: number; help?: string; disabled?: boolean }) {
  const c = useColors();
  const compact = useCompactPad();

  const paste = async () => {
    const digits = (await Clipboard.getStringAsync().catch(() => "")).replace(/\D/g, "");
    if (digits.length >= length) {
      onChange(digits.slice(0, length));
      toast(`${label} pasted`);
    } else toast(`No ${length}-digit ${label} on your clipboard`, "danger");
  };

  return (
    <View style={{ gap: spacing.lg, flexGrow: 1 }}>
      {/* the slip */}
      <View accessible accessibilityLabel={`${label}, ${value.length} of ${length} digits entered`} style={{ borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[900], padding: spacing.mdl, gap: spacing.md }}>
        <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 56, overflow: "hidden", opacity: 0.9 }}>
          <Stripes band={9} gap={5} count={18} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="shield" size={13} color={palette.orange[400]} />
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, letterSpacing: 2, color: palette.purple[100] }}>{label}</Text>
          <Text variant="caption" style={{ color: palette.purple[200], marginLeft: "auto", marginRight: 56 }}>
            {value.length}/{length}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.smd, marginRight: 48 }}>
          {GROUPS.map((g, gi) => (
            <View key={gi} style={{ flexDirection: "row", gap: 2 }}>
              {g.map((idx) => {
                const ch = value[idx];
                const next = idx === value.length && !disabled;
                return (
                  <View key={idx} style={{ width: compact ? 15 : 17, alignItems: "center", gap: 3 }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: compact ? 22 : 25, lineHeight: compact ? 27 : 30, color: ch ? palette.white : "rgba(255,255,255,0.28)" }}>{ch ?? "0"}</Text>
                    <View style={{ height: 2, width: "100%", borderRadius: 1, backgroundColor: next ? palette.orange[400] : ch ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)" }} />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        {help ? (
          <Text variant="caption" tone="muted" style={{ flex: 1, paddingHorizontal: spacing.xs }}>
            {help}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {!disabled && (
          <PressableScale onPress={paste} accessibilityRole="button" accessibilityLabel={`Paste ${label}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.sm }}>
            <Icon name="copy" size={13} color={c.brandText} />
            <Text variant="subhead">Paste</Text>
          </PressableScale>
        )}
      </View>

      {!disabled && (
        <View style={{ flexGrow: 1, justifyContent: "flex-end" }}>
          <NumberPad compact={compact} onKey={(d) => value.length < length && onChange(value + d)} onDelete={() => onChange(value.slice(0, -1))} />
        </View>
      )}
    </View>
  );
}
