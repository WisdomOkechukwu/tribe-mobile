import { Image } from "expo-image";
import { useEffect, type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { billerById, giftBrandById } from "@/data/catalog";
import { fonts, palette, radius, shadows, spacing, useColors } from "@/theme";
import { BillerThumb, GiftMark } from "./brand-tiles";
import { VirtualCardFace } from "./card-face";
import { CashpointMark } from "./cashpoint-mark";
import { CoinIcon } from "./coin-icon";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

/**
 * The intro carousel's art (Onboarding.png's idea, Tribe's own pictures): composed from the
 * app's real coins, flags, card faces, biller and gift marks around the Tribe mark — so they
 * stay crisp, follow dark mode and never drift from the product. Motion is a gentle float that
 * only runs on the visible slide and switches off under reduced motion.
 */

type Spot = { x: number; y: number };

/** Absolutely placed piece that pops in when its slide shows, then floats. */
function Piece({ at, w, active, delay = 0, amp = 5, rotate = 0, children }: { at: Spot; w: number; active: boolean; delay?: number; amp?: number; rotate?: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const pop = useSharedValue(reduce ? 1 : 0);
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    if (!active) {
      cancelAnimation(y);
      return;
    }
    pop.set(withDelay(delay, withSpring(1, { damping: 13, stiffness: 160 })));
    y.set(withDelay(delay + 400, withRepeat(withSequence(withTiming(-amp, { duration: 1500, easing: Easing.inOut(Easing.sin) }), withTiming(amp, { duration: 1500, easing: Easing.inOut(Easing.sin) })), -1, true)));
    return () => cancelAnimation(y);
  }, [active, reduce, delay, amp, pop, y]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.get() * 1.4), transform: [{ translateY: y.get() + (1 - pop.get()) * 18 }, { scale: 0.85 + 0.15 * pop.get() }] }));
  const pos: ViewStyle = { position: "absolute", left: at.x * w, top: at.y * w };
  return (
    <Animated.View style={[pos, style]}>
      <View style={{ transform: [{ rotate: `${rotate}deg` }] }}>{children}</View>
    </Animated.View>
  );
}

type ArtProps = { width: number; active: boolean; /** on a full-bleed brand colour (intro bands) */ onColour?: boolean };

/** Soft round stage the pieces sit on. On a brand colour it turns into a translucent white disc. */
function Stage({ w, h, tint: soft, ring: line, onColour }: { w: number; h: number; tint: string; ring?: string; onColour?: boolean }) {
  const tint = onColour ? "rgba(255,255,255,0.14)" : soft;
  const ring = onColour ? "rgba(255,255,255,0.4)" : line;
  const d = w * 0.82;
  return (
    <>
      <View style={{ position: "absolute", width: d, height: d, borderRadius: d / 2, left: (w - d) / 2, top: (h - d) / 2, backgroundColor: tint }} />
      {ring && (
        <Svg width={w} height={h} style={{ position: "absolute" }}>
          <Circle cx={w / 2} cy={h / 2} r={w * 0.47} stroke={ring} strokeWidth={1.5} strokeDasharray="3 7" fill="none" strokeLinecap="round" />
        </Svg>
      )}
    </>
  );
}

function Ring({ children, size }: { children: ReactNode; size: number }) {
  return <View style={{ borderRadius: size, borderWidth: 3, borderColor: "#fff", boxShadow: shadows.lift }}>{children}</View>;
}

function Chip({ icon, tint, label }: { icon: IconName; tint: string; label: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surface, borderRadius: radius.full, paddingVertical: 7, paddingLeft: 7, paddingRight: spacing.smd, boxShadow: shadows.lift }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={11} color="#fff" weight="bold" />
      </View>
      <Text variant="caption" style={{ fontFamily: fonts.semibold }}>
        {label}
      </Text>
    </View>
  );
}

/** 1 · Crypto that spends like cash: coins drift into a Tribe card; a payment lands. */
export function CryptoSpendArt({ width: w, active, onColour }: ArtProps) {
  const c = useColors();
  const h = w * 0.92;
  const coin = (code: string, s: number) => (
    <Ring size={s}>
      <CoinIcon code={code} size={s} />
    </Ring>
  );
  return (
    <View style={{ width: w, height: h }} accessible accessibilityLabel="Bitcoin, Ether, Tether and Solana coins flowing into a Tribe card">
      <Stage w={w} h={h} tint={c.brandSoft} ring={c.borderStrong} onColour={onColour} />
      <Piece at={{ x: 0.2, y: 0.36 }} w={w} active={active} delay={60} amp={3} rotate={-9}>
        <VirtualCardFace card={{ theme: "midnight", network: "mastercard", holder: "Ada Okafor", number: "5399", last4: "4821", expiry: "09/29", cvv: "", frozen: false }} width={w * 0.62} />
      </Piece>
      <Piece at={{ x: 0.08, y: 0.08 }} w={w} active={active} delay={180}>
        {coin("BTC", w * 0.17)}
      </Piece>
      <Piece at={{ x: 0.42, y: 0.0 }} w={w} active={active} delay={260} amp={6}>
        {coin("ETH", w * 0.14)}
      </Piece>
      <Piece at={{ x: 0.7, y: 0.12 }} w={w} active={active} delay={340}>
        {coin("USDT", w * 0.16)}
      </Piece>
      <Piece at={{ x: 0.02, y: 0.4 }} w={w} active={active} delay={420} amp={4}>
        {coin("SOL", w * 0.12)}
      </Piece>
      <Piece at={{ x: 0.36, y: 0.8 }} w={w} active={active} delay={560} amp={3}>
        <Chip icon="check" tint={c.success} label="Paid ₦24,500 with USDT" />
      </Piece>
    </View>
  );
}

function AccountCard({ code, name, amount, detail, width }: { code: string; name: string; amount: string; detail: string; width: number }) {
  const c = useColors();
  return (
    <View style={{ width, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: c.surface, padding: spacing.smd, gap: 6, boxShadow: shadows.pop }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <CoinIcon code={code} size={26} />
        <Text variant="subhead" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {name}
        </Text>
      </View>
      <Text variant="amount" style={{ fontSize: 20, lineHeight: 24 }} numberOfLines={1}>
        {amount}
      </Text>
      <Text variant="caption" tone="subtle" numberOfLines={1}>
        {detail}
      </Text>
    </View>
  );
}

/** 2 · Dollar, pound and euro accounts in your name, fanned over the Naira. */
export function GlobalAccountsArt({ width: w, active, onColour }: ArtProps) {
  const c = useColors();
  const h = w * 0.92;
  const cw = w * 0.52;
  return (
    <View style={{ width: w, height: h }} accessible accessibilityLabel="US dollar, British pound and euro accounts fanned over a Naira coin">
      <Stage w={w} h={h} tint={c.brandSoft} ring={c.borderStrong} onColour={onColour} />
      <Piece at={{ x: 0.05, y: 0.1 }} w={w} active={active} delay={80} amp={3} rotate={-11}>
        <AccountCard code="EUR" name="Euro account" amount="€96.75" detail="IBAN •• 7702 · SEPA" width={cw} />
      </Piece>
      <Piece at={{ x: 0.43, y: 0.06 }} w={w} active={active} delay={160} amp={4} rotate={9}>
        <AccountCard code="GBP" name="Pound account" amount="£318.20" detail="Sort 04-00-04 · FPS" width={cw} />
      </Piece>
      <Piece at={{ x: 0.22, y: 0.36 }} w={w} active={active} delay={240} amp={3} rotate={-2}>
        <AccountCard code="USD" name="US dollar account" amount="$1,240.00" detail="Routing •• 0021 · ACH" width={cw * 1.06} />
      </Piece>
      <Piece at={{ x: 0.07, y: 0.68 }} w={w} active={active} delay={380}>
        <Ring size={w * 0.17}>
          <CoinIcon code="NGN" size={w * 0.17} />
        </Ring>
      </Piece>
      <Piece at={{ x: 0.24, y: 0.66 }} w={w} active={active} delay={440} amp={2}>
        <View style={{ width: w * 0.1, height: w * 0.1, borderRadius: w * 0.05, backgroundColor: c.brand, alignItems: "center", justifyContent: "center", boxShadow: shadows.lift }}>
          <Icon name="swap" size={w * 0.045} color="#fff" weight="bold" />
        </View>
      </Piece>
      {(["GHS", "KES", "CAD"] as const).map((code, i) => (
        <Piece key={code} at={[{ x: 0.83, y: 0.5 }, { x: 0.74, y: 0.74 }, { x: 0.52, y: 0.84 }][i]} w={w} active={active} delay={520 + i * 70} amp={4}>
          <Ring size={w * 0.09}>
            <CoinIcon code={code} size={w * 0.09} />
          </Ring>
        </Piece>
      ))}
    </View>
  );
}

/** 3 · Bills, gift cards and Cashpoints orbiting the Tribe mark. */
export function EverydayArt({ width: w, active, onColour }: ArtProps) {
  const c = useColors();
  const h = w * 0.92;
  const hub = w * 0.34;
  const thumb = w * 0.15;
  return (
    <View style={{ width: w, height: h }} accessible accessibilityLabel="The Tribe mark surrounded by a Cashpoint ticket, MTN, PHED and DStv bills and a gift card">
      <Stage w={w} h={h} tint={c.accentSoft} ring={c.borderStrong} onColour={onColour} />
      <Piece at={{ x: 0.5 - 0.17, y: 0.46 - 0.17 }} w={w} active={active} delay={60} amp={2}>
        <View style={{ width: hub, height: hub, borderRadius: hub / 2, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", boxShadow: shadows.pop }}>
          <Image source={require("@/assets/brand/tribe-logo.png")} style={{ width: hub * 0.66, height: hub * 0.66 }} contentFit="contain" />
        </View>
      </Piece>
      <Piece at={{ x: 0.6, y: 0.06 }} w={w} active={active} delay={180} rotate={8}>
        <View style={{ width: w * 0.32, borderRadius: radius.chip, borderCurve: "continuous", backgroundColor: palette.orange[500], padding: 10, gap: 4, boxShadow: shadows.lift }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <CashpointMark size={16} plain />
            <Text variant="caption" style={{ color: palette.orange[50], fontFamily: fonts.semibold }}>
              Cashpoint
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 20, color: "#fff" }}>₦5,000</Text>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.5, color: palette.orange[100] }}>4827 1930 ••••</Text>
        </View>
      </Piece>
      <Piece at={{ x: 0.06, y: 0.16 }} w={w} active={active} delay={260}>
        <Ring size={thumb}>
          <BillerThumb biller={billerById("mtn")} size={thumb} />
        </Ring>
      </Piece>
      <Piece at={{ x: 0.02, y: 0.56 }} w={w} active={active} delay={320} amp={4}>
        <Ring size={thumb}>
          <BillerThumb biller={billerById("phed")} size={thumb} />
        </Ring>
      </Piece>
      <Piece at={{ x: 0.74, y: 0.5 }} w={w} active={active} delay={380} amp={6}>
        <Ring size={thumb}>
          <BillerThumb biller={billerById("dstv")} size={thumb} />
        </Ring>
      </Piece>
      <Piece at={{ x: 0.26, y: 0.02 }} w={w} active={active} delay={440} amp={4}>
        <Ring size={w * 0.13}>
          <GiftMark brand={giftBrandById("steam")} size={w * 0.13} />
        </Ring>
      </Piece>
      <Piece at={{ x: 0.2, y: 0.8 }} w={w} active={active} delay={560} amp={3}>
        <Chip icon="bolt" tint={palette.orange[500]} label="34.2 kWh token saved" />
      </Piece>
    </View>
  );
}
