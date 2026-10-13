import { View } from "react-native";
import { palette, radius, spacing, useColors } from "@/theme";
import { CashpointMark } from "./cashpoint-mark";
import { Text } from "./text";

const groupsOf = (code?: string) => (code ? code.replace(/\D/g, "").replace(/(.{4})(?=.)/g, "$1 ") : "•••• •••• ••••");

/**
 * A Cashpoint as a cash ticket. Full: amount on top, the 12-digit code below a perforation.
 * `compact`: one row — amount on the left, the code stub on the right (live preview while typing).
 * Notches are punched in the page background colour.
 */
export function CashpointTicket({ amount, code, note, compact = false }: { amount: string; code?: string; note?: string; compact?: boolean }) {
  const c = useColors();
  const notch = { position: "absolute" as const, width: 22, height: 22, borderRadius: 11, backgroundColor: c.bg };
  const groups = groupsOf(code);
  const label = `Cashpoint for ${amount}${code ? `, code ${groups}` : ""}`;

  if (compact) {
    return (
      <View accessible accessibilityLabel={label} style={{ flexDirection: "row", height: 108, borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.orange[500] }}>
        <View style={{ flex: 1, padding: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <CashpointMark size={22} plain />
            <Text variant="subhead" style={{ color: palette.orange[50] }}>
              Cashpoint
            </Text>
          </View>
          <Text variant="balance" style={{ color: "#fff", fontSize: 34, lineHeight: 40 }} adjustsFontSizeToFit numberOfLines={1}>
            {amount}
          </Text>
        </View>
        {/* vertical perforation with notches */}
        <View style={{ width: 2, zIndex: 2, alignItems: "center" }}>
          <View style={{ flex: 1, borderLeftWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.55)", marginVertical: spacing.md }} />
          <View style={[notch, { top: -11, left: -10 }]} />
          <View style={[notch, { bottom: -11, left: -10 }]} />
        </View>
        <View style={{ width: 112, backgroundColor: palette.orange[600], padding: spacing.md, justifyContent: "center", gap: spacing.xs }}>
          <Text variant="overline" style={{ color: palette.orange[100] }}>
            Code
          </Text>
          {groups.split(" ").map((g, i) => (
            <Text key={i} variant="mono" style={{ color: "#fff", fontSize: 15, lineHeight: 18, letterSpacing: 2 }}>
              {g}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View accessible accessibilityLabel={label} style={{ borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.orange[500] }}>
      {/* watermark: the mark, big and soft, instead of busy stripes */}
      <View style={{ position: "absolute", right: -36, top: -30, opacity: 0.16 }}>
        <CashpointMark size={170} plain />
      </View>
      <View style={{ padding: spacing.mdl, paddingBottom: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <CashpointMark size={28} plain />
          <Text variant="subhead" style={{ color: "#fff", flex: 1 }}>
            Tribe Cashpoint
          </Text>
        </View>
        <Text variant="balance" style={{ color: "#fff" }} adjustsFontSizeToFit numberOfLines={1}>
          {amount}
        </Text>
      </View>
      <View style={{ height: 2, zIndex: 2, justifyContent: "center" }}>
        <View style={{ borderTopWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.55)", marginHorizontal: spacing.lg }} />
        <View style={[notch, { left: -11, top: -10 }]} />
        <View style={[notch, { right: -11, top: -10 }]} />
      </View>
      <View style={{ backgroundColor: palette.orange[600], paddingHorizontal: spacing.mdl, paddingVertical: spacing.md, gap: spacing.xs }}>
        <Text variant="caption" style={{ color: palette.orange[100] }}>
          {code ? "12-digit code" : "Your code appears here"}
        </Text>
        <Text variant="mono" style={{ color: "#fff", fontSize: 22, letterSpacing: 3 }}>
          {groups}
        </Text>
        {note && (
          <Text variant="caption" style={{ color: palette.orange[100] }}>
            {note}
          </Text>
        )}
      </View>
    </View>
  );
}
