import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { AmountEntry, groupAmount } from "@/components/amount-entry";
import { AssetChip } from "@/components/asset-chip";
import { openAssetPicker, SWAP_TIP } from "@/components/asset-picker";
import { Button } from "@/components/button";
import { Caret } from "@/components/caret";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { assetByCode, type AssetCode } from "@/data/assets";
import { openAddMoneySheet } from "@/screens/home/sheets";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { useSwapDraft } from "@/stores/use-swap-draft";
import { useWalletStore } from "@/stores/use-wallet-store";
import { motion, radius, spacing, useColors } from "@/theme";
import { formatAsset, quote, quoteFor } from "@/utils/format";
import { exceeds } from "@/utils/decimal";
import { RateFlash } from "@/components/rate-flash";
import { useLiveRates } from "@/api/live-rates";

/** What the keypad types: the amount you pay, the amount you get, or its value in dollars. */
type Mode = "from" | "to" | "usd";

/** A number as keypad input: at most `decimals` places, no trailing zeros, "" for nothing. */
function toInput(n: number, decimals: number) {
  return n > 0 ? String(Number(n.toFixed(Math.min(decimals, 6)))) : "";
}

/** Typed digits cut to a currency's decimal places (after picking a currency with fewer). */
function trim(v: string, decimals: number) {
  const [whole, frac] = v.split(".");
  return frac === undefined ? v : decimals === 0 ? whole : `${whole}.${frac.slice(0, decimals)}`;
}

/**
 * One side of the swap, in Send's amount-card language: label and a note on top, then the amount
 * with its currency picker, and what it's worth underneath. The side being typed carries the
 * brand outline and caret; tap the other card to type there. The tap target sits behind the
 * content, so the picker and Max stay their own buttons.
 */
function SwapCard({ code, label, shown, sub, color, active, aside, onActivate, onPick }: { code: AssetCode; label: string; shown: string; sub: string; color: string; active: boolean; aside?: ReactNode; onActivate: () => void; onPick: () => void }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1.5, borderColor: active ? c.brand : "transparent", paddingHorizontal: spacing.md, paddingVertical: spacing.smd, gap: spacing.xxs }}>
      <Pressable
        onPress={active ? undefined : onActivate}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${shown}`}
        accessibilityHint={active ? undefined : "Tap to enter this amount instead"}
        accessibilityState={{ selected: active }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      {/* as tall as the "Rates updated" chip, so the card doesn't grow when it flashes */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, minHeight: 22, pointerEvents: "box-none" }}>
        <Text variant="subhead" tone={active ? "brand" : "muted"} style={{ pointerEvents: "none" }}>
          {label}
        </Text>
        {aside}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 40, pointerEvents: "box-none" }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", pointerEvents: "none" }}>
          {/* long figures step down a size (native also shrinks to fit) */}
          <Text variant={shown.length > 11 ? "title" : "largeTitle"} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, color }}>
            {shown}
          </Text>
          {active && <Caret />}
        </View>
        <AssetChip code={code} onPress={onPick} label={`${label} ${assetByCode(code).name}, change`} />
      </View>
      <Text variant="caption" tone="muted" numberOfLines={1} style={{ pointerEvents: "none" }}>
        {sub}
      </Text>
    </View>
  );
}

/**
 * Swap (Swap.png): "You pay" and "You get" cards with the flip on their seam, the live rate and
 * fee under them, then the keypad. The amount can be typed three ways: what you pay, what you
 * get, or its worth in dollars (the coin switch above the keypad, or tap a card). Whatever is
 * typed is exact; the rest follows the live rates. Too much? A sheet offers to fund the wallet
 * instead of a dead button.
 */
export default function Swap() {
  const c = useColors();
  const params = useLocalSearchParams<{ from?: string }>();
  const balances = useWalletStore((s) => s.balances);
  const balancesRaw = useWalletStore((s) => s.balancesRaw);
  const begin = useFlowStore((s) => s.begin);
  const from = useSwapDraft((s) => s.from);
  const to = useSwapDraft((s) => s.to);
  const start = useSwapDraft((s) => s.start);
  const flip = useSwapDraft((s) => s.flip);
  const pickAsset = useSwapDraft((s) => s.pick);
  const [mode, setMode] = useState<Mode>("from");
  const [amount, setAmount] = useState("");
  // the unit left behind on a switch, so switching back untouched restores it exactly (no drift)
  const [back, setBack] = useState<{ mode: Mode; amount: string; seeded: string } | null>(null);
  const [spins, setSpins] = useState(0);
  // short phones: shorter keys, so the cards and the keypad both fit
  const compact = useWindowDimensions().height < 760;

  // live rates while this screen is open (the estimate re-prices as they move)
  const { version, has, usd } = useLiveRates();

  useEffect(() => {
    start(params.from ? assetByCode(params.from).code : undefined);
  }, [params.from, start]);

  const fromA = assetByCode(from);
  const toA = assetByCode(to);
  // dollars are already one of the sides when the pair holds USD: no third unit then
  const typing: Mode = mode === "usd" && (from === "USD" || to === "USD") ? (from === "USD" ? "from" : "to") : mode;
  const value = Number(amount) || 0;
  // whichever unit is typed is exact; the others are derived from the live rates
  const places = 10 ** Math.min(fromA.decimals, 8);
  const pay = !value ? 0 : typing === "from" ? value : typing === "to" ? quoteFor(value, from, to, version).amount : Math.floor((value / usd(from)) * places + 1e-9) / places;
  const q = quote(pay, from, to, version);
  const receive = typing === "to" ? value : q.receive;
  const over = typing === "from" ? exceeds(amount || "0", balancesRaw[from] ?? "0") : Number.isFinite(pay) && exceeds(pay.toFixed(Math.min(fromA.decimals, 8)), balancesRaw[from] ?? "0");
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: withSpring(`${spins * 180}deg`, motion.spring) }] }), [spins]);
  // the server's rates for both sides: until they arrive the estimate shows "—" and Continue waits
  const priced = has([from, to]);
  const unit = quote(1, from, to, version).rate;
  const rateText = !priced ? "Getting the latest rate…" : unit >= 1 ? `1 ${from} ⇄ ${formatAsset(unit, to)}` : `1 ${to} ⇄ ${formatAsset(1 / unit, from)}`;

  // each card: the typed digits as they are, or the derived figure; its worth in dollars underneath
  const digits = (a: typeof fromA) => `${a.kind === "fiat" ? a.symbol : ""}${groupAmount(amount)}`;
  const derived = (n: number, a: typeof fromA) => (!value ? `${a.kind === "fiat" ? a.symbol : ""}0` : !priced ? "—" : a.kind === "fiat" ? formatAsset(n, a.code) : groupAmount(toInput(n, a.decimals)));
  const worth = (n: number, code: AssetCode) => (code === "USD" ? " " : priced ? `≈ ${formatAsset(n * usd(code), "USD")}` : " ");
  const fromShown = typing === "usd" ? `$${groupAmount(amount)}` : typing === "from" ? digits(fromA) : derived(pay, fromA);
  const toShown = typing === "to" ? digits(toA) : derived(receive, toA);

  /** Type in another unit, starting from the figure it already shows. */
  const activate = (next: Mode) => {
    if (next === typing) return;
    if (back?.mode === next && amount === back.seeded) {
      setAmount(back.amount);
      setBack(null);
    } else {
      const seeded = next === "from" ? toInput(pay, fromA.decimals) : next === "to" ? toInput(receive, toA.decimals) : toInput(pay * usd(from), 2);
      setBack({ mode: typing, amount, seeded });
      setAmount(seeded);
    }
    setMode(next);
  };
  /** The typed amount stays with its currency: "pay 100 USDT" becomes "get 100 USDT". */
  const flipPair = () => {
    flip();
    setSpins((s) => s + 1);
    setBack(null);
    if (typing !== "usd") setMode(typing === "from" ? "to" : "from");
  };
  const choose = (side: "from" | "to") =>
    openAssetPicker({
      title: side === "from" ? "Swap from" : "Swap to",
      value: side === "from" ? from : to,
      tip: SWAP_TIP,
      onSelect: (code) => {
        // picking the other side's asset just flips the pair
        if (code === (side === "from" ? to : from)) return flipPair();
        pickAsset(side, code);
        setBack(null);
        if (typing === side) setAmount((v) => trim(v, Math.min(assetByCode(code).decimals, 6)));
      },
    });
  const fillMax = () => {
    const cut = 10 ** Math.min(fromA.decimals, 6);
    setAmount(toInput(Math.floor(balances[from] * cut) / cut, fromA.decimals));
    setBack(null);
    setMode("from");
  };

  const review = () => {
    if (over) {
      overlay.notice({
        icon: "wallet2",
        tone: "accent",
        title: "Insufficient balance",
        body: `You have ${formatAsset(balances[from], from)}. Add money or swap a smaller amount.`,
        actions: [
          { label: "Fund wallet", onPress: () => setTimeout(openAddMoneySheet, 50) },
          { label: "Change amount", tone: "secondary" },
        ],
      });
      return;
    }
    // a typed "you get" is exact: the quote prices what it costs
    begin({ kind: "swap", from, to, amount: pay, receive: typing === "to" ? value : undefined });
    router.push("/swap/review");
  };

  const units: { value: Mode; label: string; icon: ReactNode }[] = [
    { value: "from", label: from, icon: <CoinIcon code={from} size={16} /> },
    { value: "to", label: to, icon: <CoinIcon code={to} size={16} /> },
  ];
  if (from !== "USD" && to !== "USD") units.push({ value: "usd", label: "USD", icon: <CoinIcon code="USD" size={16} /> });

  return (
    <FlowScreen title="Swap" scroll={false} footer={<Button title={value && !priced ? "Getting the latest rate…" : "Continue"} disabled={!(pay > 0) || !priced} onPress={review} />}>
      <View style={{ gap: spacing.sm }}>
        <View>
          <SwapCard
            code={from}
            label="You pay"
            shown={fromShown}
            sub={typing === "usd" ? (priced ? `≈ ${formatAsset(pay, from)}` : " ") : worth(pay, from)}
            color={over ? c.danger : value ? c.text : c.textSubtle}
            active={typing !== "to"}
            onActivate={() => activate("from")}
            onPick={() => choose("from")}
            aside={
              over ? (
                <Text variant="caption" tone="danger" numberOfLines={1}>
                  More than your {from} balance
                </Text>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 }}>
                  <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                    Balance {formatAsset(balances[from], from)}
                  </Text>
                  <PressableScale onPress={fillMax} hitSlop={8} accessibilityLabel="Swap your whole balance">
                    <Text variant="subhead" tone="brand">
                      Max
                    </Text>
                  </PressableScale>
                </View>
              )
            }
          />
          <View style={{ alignItems: "center", marginVertical: -16, zIndex: 2 }}>
            <PressableScale accessibilityLabel="Flip currencies" onPress={flipPair} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brand, borderWidth: 4, borderColor: c.bg, alignItems: "center", justifyContent: "center" }}>
              <Animated.View style={spin}>
                <Icon name="swapVertical" size={15} color={c.onBrand} weight="bold" />
              </Animated.View>
            </PressableScale>
          </View>
          <SwapCard
            code={to}
            label="You get"
            shown={toShown}
            sub={worth(receive, to)}
            color={!value ? c.textSubtle : typing === "to" ? c.text : over ? c.textSubtle : c.success}
            active={typing === "to"}
            onActivate={() => activate("to")}
            onPick={() => choose("to")}
            aside={<RateFlash />}
          />
        </View>
        {/* rate and fee, once, under the cards */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, paddingHorizontal: spacing.xs }}>
          <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {rateText}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            Fee <Text variant="caption" tone="text">{formatAsset(q.fee, from)}</Text>
          </Text>
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", gap: compact ? spacing.sm : spacing.md, paddingBottom: spacing.sm }}>
        {/* the unit the keypad types in: either side of the pair, or its worth in dollars */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
          <Text variant="caption" tone="muted">
            Enter in
          </Text>
          <Segmented style={{ flex: 1 }} options={units} value={typing} onChange={activate} />
        </View>
        <AmountEntry value={amount} onChange={setAmount} decimals={typing === "usd" ? 2 : Math.min((typing === "from" ? fromA : toA).decimals, 6)} showDisplay={false} compact={compact} />
      </View>
    </FlowScreen>
  );
}
