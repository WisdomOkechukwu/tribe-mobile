import { Image } from "expo-image";
import { forwardRef } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { Transaction } from "@/data/seed";
import { fonts, palette, spacing } from "@/theme";
import { fullDate } from "@/utils/format";
import { headline, receiptRows } from "@/utils/tx";
import { Text } from "./text";

const INK = "#14101A";
const MUTED = "#6E6878";
const STATUS = { completed: ["Successful", "#1E9A45", "#E6F6EB"], pending: ["Pending", "#B07D00", "#FFF7DB"], failed: ["Failed", "#E0322B", "#FDECEB"], cancelled: ["Cancelled", "#6E6878", "#EFEBF3"] } as const;

function Dashes() {
  return <View style={{ height: 0, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: palette.purple[300], marginVertical: spacing.md }} />;
}

/** The scalloped bottom edge of a paper receipt. */
function Scallops({ width }: { width: number }) {
  const r = 11;
  const n = Math.floor(width / (r * 2.6));
  const gap = width / n;
  return (
    <Svg width={width} height={r} style={{ marginTop: -1 }}>
      {Array.from({ length: n }, (_, i) => (
        <Circle key={i} cx={gap * i + gap / 2} cy={0} r={r} fill="#ffffff" />
      ))}
    </Svg>
  );
}

/**
 * The shareable receipt image (Transaction.png's receipt cards): always light, brand bar on
 * top, the amount and status, the same detail rows as the receipt screen, a faint Tribe mark
 * watermark and a scalloped paper edge. Rendered visibly in the share sheet, then captured.
 */
export const ReceiptTicket = forwardRef<View, { tx: Transaction; width: number }>(function ReceiptTicket({ tx, width }, ref) {
  const { title, rows } = receiptRows(tx);
  const [label, fg, bg] = STATUS[tx.status];
  return (
    <View ref={ref} collapsable={false} style={{ width, backgroundColor: "transparent" }}>
      <View style={{ backgroundColor: "#ffffff", borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden" }}>
        <View style={{ height: 6, backgroundColor: palette.purple[500] }} />
        <View style={{ position: "absolute", top: 120, left: width * 0.15, opacity: 0.05 }} pointerEvents="none">
          <Image source={require("@/assets/brand/tribe-mark.png")} style={{ width: width * 0.7, height: width * 0.51 }} contentFit="contain" />
        </View>
        <View style={{ padding: spacing.mdl, paddingBottom: spacing.sm }}>
          <View style={{ alignItems: "center", gap: 6 }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: MUTED }}>{tx.title}</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, color: INK, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
              {headline(tx)}
            </Text>
            <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: fg }}>{label}</Text>
            </View>
          </View>
          <Dashes />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: INK, marginBottom: spacing.sm }}>{title}</Text>
          <View style={{ gap: 9 }}>
            {rows.map((r) => (
              <View key={r.label} style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: MUTED }}>{r.label}</Text>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: INK, flexShrink: 1, textAlign: "right" }}>{r.value}</Text>
              </View>
            ))}
          </View>
          <Dashes />
          <View style={{ alignItems: "center", gap: 4, paddingBottom: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Image source={require("@/assets/brand/tribe-mark.png")} style={{ width: 22, height: 16 }} contentFit="contain" />
              <Text style={{ fontFamily: fonts.display, fontSize: 14, letterSpacing: 2, color: INK }}>TRIBE</Text>
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: MUTED }}>Generated {fullDate(new Date().toISOString())} · tribe.africa</Text>
          </View>
        </View>
      </View>
      <Scallops width={width} />
    </View>
  );
});
