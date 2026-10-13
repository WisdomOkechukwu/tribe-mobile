import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { QUOTE_SECONDS, useQuoteClock } from "@/utils/rates";
import { fonts, spacing, useColors } from "@/theme";
import { Text } from "./text";

/**
 * Swap.png's quote countdown: a small ring that empties until the rate refreshes. It owns the
 * one-second clock, so only this little ring re-renders each second — not the whole screen.
 */
export function QuoteTimer({ size = 18 }: { size?: number }) {
  const c = useColors();
  const { left } = useQuoteClock();
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }} accessible accessibilityLabel={`Rate refreshes in ${left} seconds`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.border} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.brand} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(circ * left) / QUOTE_SECONDS} ${circ}`} />
      </Svg>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: c.brandText, fontVariant: ["tabular-nums"], minWidth: 22 }}>{left}s</Text>
    </View>
  );
}
