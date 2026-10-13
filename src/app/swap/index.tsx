import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { AmountEntry, groupAmount } from "@/components/amount-entry";
import { openAssetPicker, SWAP_TIP } from "@/components/asset-picker";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { QuoteTimer } from "@/components/quote-timer";
import { Text } from "@/components/text";
import { assetByCode, type AssetCode } from "@/data/assets";
import { openAddMoneySheet } from "@/screens/home/sheets";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { useSwapDraft } from "@/stores/use-swap-draft";
import { useWalletStore } from "@/stores/use-wallet-store";
import { motion, radius, spacing, useColors } from "@/theme";
import { formatAsset, quote } from "@/utils/format";
import { useQuoteTick } from "@/utils/rates";

function pick(side: "from" | "to") {
  const draft = useSwapDraft.getState();
  openAssetPicker({ title: side === "from" ? "Swap from" : "Swap to", value: side === "from" ? draft.from : draft.to, tip: SWAP_TIP, onSelect: (code) => draft.pick(side, code) });
}

/** "USDT ›" — the asset name is the picker (Swap.png). */
function AssetButton({ code, side, label }: { code: AssetCode; side: "from" | "to"; label: string }) {
  const c = useColors();
  return (
    <PressableScale onPress={() => pick(side)} accessibilityLabel={`${label} ${assetByCode(code).name}, change`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <CoinIcon code={code} size={36} />
      <View>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <Text variant="bodyStrong">{code}</Text>
          <Icon name="chevron" size={10} color={c.textMuted} weight="bold" />
        </View>
      </View>
    </PressableScale>
  );
}

/**
 * Swap (Swap.png): available balance, a FROM card with a live rate and its 30s countdown, the
 * amount with the swap fee, a flip, the TO card with what you'll receive, then the keypad.
 * Too much? A sheet offers to fund the wallet instead of a dead button.
 */
export default function Swap() {
  const c = useColors();
  const params = useLocalSearchParams<{ from?: string }>();
  const balances = useWalletStore((s) => s.balances);
  const begin = useFlowStore((s) => s.begin);
  const from = useSwapDraft((s) => s.from);
  const to = useSwapDraft((s) => s.to);
  const start = useSwapDraft((s) => s.start);
  const flip = useSwapDraft((s) => s.flip);
  const [amount, setAmount] = useState("");
  const [spins, setSpins] = useState(0);
  // re-price when the quote window rolls over (the countdown ring ticks on its own)
  const tick = useQuoteTick();

  useEffect(() => {
    start(params.from ? assetByCode(params.from).code : undefined);
  }, [params.from, start]);

  const value = Number(amount) || 0;
  const q = quote(value, from, to, tick);
  const fromA = assetByCode(from);
  const over = value > balances[from] + 1e-9;
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: withSpring(`${spins * 180}deg`, motion.spring) }] }), [spins]);
  const unit = quote(1, from, to, tick).rate;
  const rateText = unit >= 1 ? `1 ${from} ⇄ ${formatAsset(unit, to)}` : `1 ${to} ⇄ ${formatAsset(1 / unit, from)}`;

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
    begin({ kind: "swap", from, to, amount: value }, "/swap");
    router.push("/swap/review");
  };

  return (
    <FlowScreen title="Swap" scroll={false} footer={<Button title="Continue" disabled={!value} onPress={review} />}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted">
          Available bal.: <Text variant="subhead">{formatAsset(balances[from], from)}</Text>
        </Text>
        <View>
          <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.smd }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <AssetButton code={from} side="from" label="From" />
              <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
                <QuoteTimer />
                <Text variant="caption" tone="muted">
                  {rateText}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm, maxWidth: "100%" }}>
                <Text variant="balance" style={{ color: over ? c.danger : value ? c.text : c.textSubtle, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>
                  {groupAmount(amount)}
                </Text>
                <Text variant="headline" tone="muted">
                  {from}
                </Text>
              </View>
              <Text variant="caption" tone={over ? "danger" : "muted"}>
                {over ? `More than your ${from} balance` : <>Swap fee: <Text variant="caption" tone="brand">{formatAsset(q.fee, from)}</Text></>}
              </Text>
            </View>
            <PressableScale onPress={() => setAmount(String(Number(balances[from].toFixed(Math.min(fromA.decimals, 6)))))} hitSlop={8} style={{ position: "absolute", right: spacing.md, bottom: spacing.md }} accessibilityLabel="Use maximum">
              <Text variant="subhead" tone="brand">
                Max
              </Text>
            </PressableScale>
          </View>
          <View style={{ alignItems: "center", marginVertical: -16, zIndex: 2 }}>
            <PressableScale
              accessibilityLabel="Flip currencies"
              onPress={() => {
                flip();
                setSpins((s) => s + 1);
              }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brand, borderWidth: 4, borderColor: c.bg, alignItems: "center", justifyContent: "center" }}
            >
              <Animated.View style={spin}>
                <Icon name="swapVertical" size={15} color={c.onBrand} weight="bold" />
              </Animated.View>
            </PressableScale>
          </View>
          <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <AssetButton code={to} side="to" label="To receive" />
            <Text variant="amount" style={{ color: value && !over ? c.success : c.textSubtle, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>
              {value ? formatAsset(q.receive, to) : formatAsset(0, to)}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.sm }}>
        <AmountEntry value={amount} onChange={setAmount} decimals={Math.min(fromA.decimals, 6)} showDisplay={false} />
      </View>
    </FlowScreen>
  );
}
