import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { billerById, giftBrandById } from "@/data/catalog";
import type { Transaction } from "@/data/seed";
import { fonts, palette, radius, spacing } from "@/theme";
import { fullDate } from "@/utils/format";
import { cardOp, headline, receiptRows, txTitle, type ReceiptRow } from "@/utils/tx";
import { BillerThumb, GiftMark } from "./brand-tiles";
import { CashpointMark } from "./cashpoint-mark";
import { CoinIcon } from "./coin-icon";
import { Icon } from "./icon";
import { PairIcon } from "./pair-icon";
import { SendArt } from "./send-art";
import { Stripes } from "./stripes";
import { Text } from "./text";
import { CardLeading } from "./transaction-row";

/**
 * The receipt as a poster (Gen-Z, shareable): a Midnight band with the logo stripes, a tilted
 * status sticker and a huge amount, then a paper stub with the details, a barcode made from the
 * reference and a scalloped edge. Used by the receipt screen (stub follows the theme) and the
 * share image (always light).
 */

/** What happened, as a sticker. One word or two, never in legal or fee copy. */
export function stickerLabel(tx: Transaction) {
  if (tx.status === "pending") return "On its way";
  if (tx.status === "failed") return "Didn't go through";
  if (tx.status === "cancelled") return "Cancelled";
  switch (tx.type) {
    case "send":
      return "Sent!";
    case "receive":
      return "Received";
    case "swap":
      return "Swapped";
    case "bill":
      return tx.meta?.token ? "Token ready" : "Paid";
    case "giftcard":
      return tx.direction === "in" ? "Sold" : "Bought";
    case "cashpoint":
      return tx.direction === "in" ? "Redeemed" : "Code ready";
    case "referral":
      return "Cashed out";
    case "card": {
      const op = cardOp(tx);
      return op === "created" ? "Card's live" : op === "funding" ? "Topped up" : op === "withdrawal" ? "Withdrawn" : op === "refund" || op === "chargeback" ? "Refunded" : "Paid";
    }
  }
}

function ReferralMark({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.orange[500], alignItems: "center", justifyContent: "center" }}>
      <Icon name="people" size={size * 0.45} color={palette.white} />
    </View>
  );
}

/** The transaction's art: what paid at the back, what it became in front. */
export function TxArt({ tx, size = 64 }: { tx: Transaction; size?: number }) {
  if (tx.type === "swap" && tx.toAsset) return <PairIcon from={tx.asset} to={tx.toAsset} size={size} />;
  if (tx.type === "bill" && tx.meta?.billerId) {
    const b = billerById(tx.meta.billerId);
    return <PairIcon from={tx.asset} front={(s) => <BillerThumb biller={b} size={s} />} size={size} />;
  }
  if (tx.type === "giftcard" && tx.meta?.giftBrand) {
    const g = giftBrandById(tx.meta.giftBrand);
    return <PairIcon from={tx.asset} front={(s) => <GiftMark brand={g} size={s} />} size={size} />;
  }
  if (tx.type === "cashpoint") return <CashpointMark size={size * 0.85} />;
  if (tx.type === "card") return <CardLeading tx={tx} size={size} />;
  // earnings underneath (from), the balance they landed in in front (to)
  if (tx.type === "referral") return <PairIcon from="Referral earnings" to={tx.asset} back={(s) => <ReferralMark size={s} />} size={size} />;
  // the coin (or swap pair, if converted) with a red up-arrow; the badge is cut from the Midnight band
  if (tx.type === "send") return <SendArt tx={tx} size={tx.toAsset && tx.toAsset !== tx.asset ? size : size * 0.85} ring={palette.purple[900]} />;
  return <CoinIcon code={tx.asset} size={size * 0.85} />;
}

/** The line under the amount: who or what, e.g. "USDT to NGN" or "PHED Prepaid · 34.2 kWh". */
const oneLiner = (tx: Transaction) => (tx.type === "bill" && tx.meta?.units ? `${txTitle(tx)} · ${tx.meta.units}` : tx.meta?.face && tx.type === "card" ? `${txTitle(tx)} · ${tx.meta.face}` : txTitle(tx));

/** The Midnight band: logo, date, sticker, the amount, and who/what. Same in both themes. */
export function ReceiptPoster({ tx, width }: { tx: Transaction; width: number }) {
  const amountSize = Math.min(44, width * 0.12);
  const dead = tx.status === "failed" || tx.status === "cancelled";
  const money = headline(tx);
  return (
    <View style={{ backgroundColor: palette.purple[900], padding: spacing.mdl, paddingBottom: spacing.lg, gap: spacing.md, overflow: "hidden" }}>
      <View pointerEvents="none" style={{ position: "absolute", right: -24, top: -36, width: "48%", height: 170, overflow: "hidden", opacity: 0.9 }}>
        <Stripes band={14} gap={7} count={10} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.white, alignItems: "center", justifyContent: "center" }}>
          {/* TribeLogo.png carries the wordmark itself */}
          <Image source={require("@/assets/brand/tribe-logo.png")} style={{ width: 30, height: 30 }} contentFit="contain" accessibilityLabel="Tribe" />
        </View>
        <View>
          <Text style={{ fontFamily: fonts.display, fontSize: 15, lineHeight: 19, color: palette.white }}>Receipt</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: palette.purple[100] }}>{fullDate(tx.date)}</Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
        {/* the sticker */}
        <View style={{ alignSelf: "flex-start", transform: [{ rotate: "-4deg" }], backgroundColor: dead ? palette.ink[300] : tx.status === "pending" ? palette.warning[500] : palette.orange[500], borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 5, boxShadow: "0 6px 14px -6px rgba(0,0,0,0.5)" }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, letterSpacing: 0.4, color: tx.status === "pending" ? palette.ink[900] : palette.white, textTransform: "uppercase" }}>{stickerLabel(tx)}</Text>
        </View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ fontFamily: fonts.display, fontSize: amountSize, lineHeight: Math.round(amountSize * 1.12), letterSpacing: -1.2, color: dead ? palette.purple[200] : money.startsWith("+") ? palette.success[300] : palette.white, fontVariant: ["tabular-nums"], textDecorationLine: dead ? "line-through" : "none" }}
        >
          {money}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={{ padding: 3, borderRadius: radius.full, backgroundColor: "rgba(255,255,255,0.12)" }}>
            <TxArt tx={tx} size={30} />
          </View>
          <Text numberOfLines={2} style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: palette.purple[100] }}>
            {oneLiner(tx)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Bars made from the reference, so every receipt's barcode is its own (decorative). */
export function Barcode({ value, color, height = 30, width = 132 }: { value: string; color: string; height?: number; width?: number }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  const seed = `${value}${value}${value}`;
  for (let i = 0; x < width - 3 && i < seed.length * 2; i++) {
    const code = seed.charCodeAt(i % seed.length) + i;
    const w = 1 + (code % 3);
    bars.push({ x, w });
    x += w + 1 + ((code >> 2) % 2);
  }
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        {bars.map((b) => (
          <Rect key={b.x} x={b.x} y={0} width={b.w} height={height} fill={color} />
        ))}
      </Svg>
    </View>
  );
}

/** The scalloped bottom edge of a paper receipt. */
export function Scallops({ width, color }: { width: number; color: string }) {
  const r = 9;
  const n = Math.floor(width / (r * 2.6));
  const gap = width / n;
  return (
    <Svg width={width} height={r} style={{ marginTop: -1 }}>
      {Array.from({ length: n }, (_, i) => (
        <Circle key={i} cx={gap * i + gap / 2} cy={0} r={r} fill={color} />
      ))}
    </Svg>
  );
}

export type StubColors = { paper: string; ink: string; muted: string; line: string; soft: string; success: string; brand: string; notch?: string };

const CODE_ROWS = new Set(["Token", "Redeem code", "12-digit code"]);
/** Shown elsewhere on the poster (date) or at the foot (reference). */
const HIDDEN_ROWS = new Set(["Date & time", "Reference"]);

/**
 * The paper stub under the poster: a tear line, any token or code in its own box, the details,
 * then the barcode and reference. `onCopy` adds copy buttons (the screen); the image has none.
 */
export function ReceiptStub({ tx, colors: k, onCopy }: { tx: Transaction; colors: StubColors; onCopy?: (row: ReceiptRow) => void }) {
  const { title, rows } = receiptRows(tx);
  const codes = rows.filter((r) => CODE_ROWS.has(r.label));
  const details = rows.filter((r) => !CODE_ROWS.has(r.label) && !HIDDEN_ROWS.has(r.label));
  const copyBtn = (r: ReceiptRow) =>
    onCopy && r.copy ? (
      <Pressable onPress={() => onCopy(r)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Copy ${r.label.toLowerCase()}`} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: k.soft, alignItems: "center", justifyContent: "center" }}>
        <Icon name="copy" size={13} color={k.brand} />
      </Pressable>
    ) : null;
  return (
    <View style={{ backgroundColor: k.paper }}>
      {/* tear line between poster and stub */}
      <View style={{ height: 20, justifyContent: "center" }}>
        {k.notch && <View style={{ position: "absolute", left: -10, top: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: k.notch }} />}
        <View style={{ marginHorizontal: spacing.md, height: 1, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: k.line }} />
        {k.notch && <View style={{ position: "absolute", right: -10, top: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: k.notch }} />}
      </View>

      <View style={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.md, gap: spacing.smd }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 1.2, color: k.muted, textTransform: "uppercase" }}>{title}</Text>
        {codes.map((r) => (
          <View key={r.label} style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: k.soft, borderRadius: radius.input, borderCurve: "continuous", padding: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: k.muted }}>{r.label}</Text>
              <Text selectable numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, letterSpacing: 0.6, color: k.ink, fontVariant: ["tabular-nums"] }}>
                {r.value}
              </Text>
            </View>
            {copyBtn(r)}
          </View>
        ))}
        {details.map((r) => (
          <View key={r.label} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 24 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: k.muted }}>{r.label}</Text>
            <Text selectable numberOfLines={2} style={{ flex: 1, textAlign: "right", fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: r.tone === "success" ? k.success : k.ink }}>
              {r.value}
            </Text>
            {copyBtn(r)}
          </View>
        ))}

        {/* the foot: barcode from the reference, the reference itself, where it's from */}
        <View style={{ height: 1, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: k.line, marginTop: spacing.xs }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Barcode value={tx.reference} color={k.ink} />
          <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10.5, color: k.muted }}>Reference</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Text selectable style={{ fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 1.2, color: k.ink }}>{tx.reference}</Text>
              {copyBtn({ label: "Reference", value: tx.reference, copy: tx.reference })}
            </View>
          </View>
        </View>
        <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: k.muted, textAlign: "center" }}>Money moves, sorted · tribe.africa</Text>
      </View>
    </View>
  );
}
