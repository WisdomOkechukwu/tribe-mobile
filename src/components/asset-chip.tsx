import { type AssetCode } from "@/data/assets";
import { radius, spacing, useColors } from "@/theme";
import { CoinIcon } from "./coin-icon";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** "(₿) BTC ⌄" — the currency on an amount card is its picker. */
export function AssetChip({ code, onPress, label }: { code: AssetCode; onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <PressableScale onPress={onPress} hitSlop={6} accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, backgroundColor: c.surfaceAlt, borderRadius: radius.full, paddingLeft: spacing.xs, paddingRight: spacing.smd, paddingVertical: spacing.xs }}>
      <CoinIcon code={code} size={26} />
      <Text variant="bodyStrong">{code}</Text>
      <Icon name="chevronDown" size={10} color={c.textMuted} weight="bold" />
    </PressableScale>
  );
}
