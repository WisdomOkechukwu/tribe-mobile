import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { AmountEntry, groupAmount } from "@/components/amount-entry";
import { openAssetPicker } from "@/components/asset-picker";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { CountryFlag } from "@/components/country-flag";
import { EmptyState } from "@/components/bits";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { QuoteTimer } from "@/components/quote-timer";
import { Text } from "@/components/text";
import { ASSETS_FIAT_FIRST, assetByCode, type AssetCode } from "@/data/assets";
import { channelById } from "@/data/channels";
import { openAddMoneySheet } from "@/screens/home/sheets";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { useSendDraft } from "@/stores/use-send-draft";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset, quote, quoteFor } from "@/utils/format";
import { liveUsd, useQuoteTick } from "@/utils/rates";

/** Same currency if you hold it; otherwise the balance worth the most. */
function defaultDebit(receive: AssetCode, balances: Record<AssetCode, number>, opened: AssetCode[]): AssetCode {
  if (opened.includes(receive) && balances[receive] > 0) return receive;
  const funded = ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && balances[a.code] > 0).sort((x, y) => balances[y.code] * liveUsd(y.code) - balances[x.code] * liveUsd(x.code));
  return funded[0]?.code ?? receive;
}

type Side = "pay" | "receive";

/** A number as keypad input: at most `decimals` places, no trailing zeros, "" for nothing. */
function toInput(n: number, decimals: number) {
  return n > 0 ? String(Number(n.toFixed(Math.min(decimals, 6)))) : "";
}

/** Blinking insertion bar after the amount being typed (static with Reduce Motion). */
function Caret() {
  const c = useColors();
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.set(withRepeat(withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })), -1));
    return () => cancelAnimation(o);
  }, [o, reduce]);
  const blink = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ width: 2, height: 28, borderRadius: 1, marginLeft: 3, backgroundColor: c.brand }, blink]} />;
}

/** "(₿) BTC ⌄" — the currency on an amount card is its picker. */
function AssetChip({ code, onPress, label }: { code: AssetCode; onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <PressableScale onPress={onPress} hitSlop={6} accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, backgroundColor: c.surfaceAlt, borderRadius: radius.full, paddingLeft: spacing.xs, paddingRight: spacing.smd, paddingVertical: spacing.xs }}>
      <CoinIcon code={code} size={26} />
      <Text variant="bodyStrong">{code}</Text>
      <Icon name="chevronDown" size={10} color={c.textMuted} weight="bold" />
    </PressableScale>
  );
}

/**
 * One side of the send: label and note on top, the amount and its currency picker below. The
 * side being typed carries the brand outline and caret; tap the other card to type there. The
 * card's tap target sits behind the content (not around it), so the chip and Max stay their own
 * buttons instead of nesting inside one.
 */
function AmountCard({ label, code, digits, active, danger, aside, onActivate, chip }: { label: string; code: AssetCode; digits: string; active: boolean; danger: boolean; aside: ReactNode; onActivate?: () => void; chip: ReactNode }) {
  const c = useColors();
  const a = assetByCode(code);
  const filled = Number(digits) > 0;
  const shown = `${a.kind === "fiat" ? a.symbol : ""}${groupAmount(digits)}`;
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1.5, borderColor: active ? c.brand : "transparent", paddingHorizontal: spacing.md, paddingVertical: spacing.smd, gap: spacing.xs }}>
      <Pressable
        onPress={active ? undefined : onActivate}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${formatAsset(Number(digits) || 0, code)}`}
        accessibilityHint={active ? undefined : "Tap to enter this amount instead"}
        accessibilityState={{ selected: active }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, minHeight: 20, pointerEvents: "box-none" }}>
        <Text variant="subhead" tone={active ? "brand" : "muted"} style={{ pointerEvents: "none" }}>
          {label}
        </Text>
        {aside}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44, pointerEvents: "box-none" }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", pointerEvents: "none" }}>
          {/* long figures step down a size (native also shrinks to fit) */}
          <Text variant={shown.length > 10 ? "title" : "largeTitle"} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, color: danger ? c.danger : active && filled ? c.text : c.textSubtle }}>
            {shown}
          </Text>
          {active && <Caret />}
        </View>
        {chip}
      </View>
    </View>
  );
}

/**
 * How much (Send boards' amount step). You type what the recipient receives — "₦50,000" — and we
 * work out what it costs from the balance you pay with; tap "You pay" to type that side instead.
 * Changing "Pay with" keeps what they receive and re-prices the debit, so balances are easy to
 * compare. The live rate and its 30s countdown sit on the seam; fee and total sit under the cards.
 * Same currency both ways collapses to one amount with a slim "Pay with" row.
 */
export default function SendAmount() {
  const c = useColors();
  const scope = useSendDraft((s) => s.scope);
  const receive = useSendDraft((s) => s.asset);
  const country = useSendDraft((s) => s.country);
  const recipient = useSendDraft((s) => s.recipient);
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const begin = useFlowStore((s) => s.begin);
  const [debit, setDebit] = useState<AssetCode>(() => defaultDebit(receive, balances, opened));
  const [side, setSide] = useState<Side>("receive");
  const [amount, setAmount] = useState("");
  // the side left behind on a switch, so switching back untouched restores it exactly (no drift)
  const [back, setBack] = useState<{ side: Side; amount: string; seeded: string } | null>(null);
  const compact = useWindowDimensions().height < 760;
  // re-price when the quote window rolls over (the countdown ring ticks on its own)
  const tick = useQuoteTick();

  if (!recipient) {
    return (
      <FlowScreen title="Send" cancel="back">
        <EmptyState icon="send" title="Pick a recipient first" body="Go back and choose who you're paying." />
      </FlowScreen>
    );
  }

  const d = assetByCode(debit);
  const r = assetByCode(receive);
  const same = debit === receive;
  const typing: Side = same ? "receive" : side;
  const value = Number(amount) || 0;
  const channel = channelById(recipient.channelId);
  const net = r.networks?.find((n) => n.id === recipient.network);
  const tribe = recipient.kind === "tribe";
  // fees: free between Tribe users; channel fee (USD) or network fee (in the received crypto) otherwise
  const feeUsd = tribe ? 0 : channel ? channel.feeUsd : net ? net.fee * liveUsd(receive, tick) : 0;
  const fee = feeUsd / liveUsd(debit, tick);
  // whichever side is typed is exact; the other is derived from the live quote
  const payAmount = same || typing === "pay" ? value : value ? quoteFor(value, debit, receive, tick).amount : 0;
  const toAmount = same || typing === "receive" ? value : quote(value, debit, receive, tick).receive;
  const rate = liveUsd(debit, tick) / liveUsd(receive, tick);
  const over = payAmount + fee > balances[debit] + 1e-9;
  const eta = tribe ? "Instantly" : (channel?.eta ?? net?.eta ?? "Within minutes");
  const channelName = tribe ? "Tribe transfer" : (channel?.name ?? net?.name ?? "Transfer");
  const rateText = rate >= 1 ? `1 ${debit} = ${formatAsset(rate, receive)}` : `1 ${receive} = ${formatAsset(1 / rate, debit)}`;

  /** Type on the other side, starting from the figure it already shows. */
  const activate = (next: Side) => {
    if (next === typing) return;
    if (back?.side === next && amount === back.seeded) {
      setAmount(back.amount);
      setBack(null);
    } else {
      const seeded = toInput(next === "pay" ? payAmount : toAmount, (next === "pay" ? d : r).decimals);
      setBack({ side: typing, amount, seeded });
      setAmount(seeded);
    }
    setSide(next);
  };
  const pickDebit = () =>
    openAssetPicker({
      title: "Pay with",
      value: debit,
      onSelect: (code) => {
        // what they receive stays put; only the cost re-prices
        if (typing === "pay" && code !== debit) activate("receive");
        setDebit(code);
      },
    });
  const fillMax = () => {
    const places = 10 ** Math.min(d.decimals, 6);
    setAmount(toInput(Math.floor(Math.max(0, balances[debit] - fee) * places) / places, d.decimals));
    setBack(null);
    setSide("pay");
  };

  const changeRecipient = () =>
    overlay.confirm({ icon: "people", title: "Change recipient?", body: "You'll be taken back to choose a new recipient.", confirmLabel: "Yes, change", cancelLabel: "Keep", onConfirm: () => router.back() });
  const changeCurrency = () =>
    overlay.confirm({
      icon: "globe",
      title: "Change receive currency?",
      body: "Your recipient's details will be cleared and you'll need to enter them again.",
      confirmLabel: "Yes, change",
      cancelLabel: "Keep",
      onConfirm: () => router.dismissTo(scope === "global" ? "/send/global" : scope === "crypto" ? "/send/crypto" : "/send"),
    });

  const review = () => {
    if (over) {
      overlay.notice({
        icon: "wallet2",
        tone: "accent",
        title: "Insufficient balance",
        body: `You have ${formatAsset(balances[debit], debit)}${fee ? ` and the fee is ${formatAsset(fee, debit)}` : ""}. Add money or pay with another balance.`,
        actions: [
          { label: "Fund wallet", onPress: () => setTimeout(openAddMoneySheet, 50) },
          { label: "Change amount", tone: "secondary" },
        ],
      });
      return;
    }
    begin(
      {
        kind: "send",
        asset: debit,
        amount: payAmount,
        fee,
        toAsset: receive,
        toAmount,
        to: recipient.handle,
        name: recipient.name,
        channel: channelName,
        channelId: recipient.channelId,
        network: net?.name,
        country,
        scope,
        eta,
        recipientKind: recipient.kind,
        details: recipient.details,
        beneficiaryId: recipient.beneficiaryId,
      },
    );
    router.push("/send/review");
  };

  const payChip = <AssetChip code={debit} onPress={pickDebit} label={`Pay with ${d.name}, change`} />;
  const receiveChip = <AssetChip code={receive} onPress={changeCurrency} label={`They receive ${r.name}, change currency`} />;
  const arrives = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }} accessible accessibilityLabel={`Arrives: ${eta}`}>
      <Icon name="clock" size={11} color={c.textMuted} />
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {eta}
      </Text>
    </View>
  );

  return (
    <FlowScreen title={scope === "crypto" ? "Send crypto" : scope === "global" ? "Global send" : "Send Naira"} cancel="back" scroll={false} footer={<Button title="Continue" disabled={!value} onPress={review} />}>
      {/* who it's for: their currency flag on their avatar, and one way to change them */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", paddingHorizontal: spacing.md, paddingVertical: spacing.smd }}>
        <View>
          <Avatar size={40} name={recipient.name} />
          <View style={{ position: "absolute", right: -4, bottom: -3, borderRadius: 11, borderWidth: 2, borderColor: c.surface }}>
            {country ? <CountryFlag iso={country} size={18} /> : <CoinIcon code={receive} size={18} />}
          </View>
        </View>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {recipient.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {recipient.handle}
          </Text>
        </View>
        <PressableScale onPress={changeRecipient} hitSlop={8} accessibilityRole="button" accessibilityLabel="Change recipient" style={{ backgroundColor: c.brandSoft, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs + 2 }}>
          <Text variant="subhead" tone="brand">
            Change
          </Text>
        </PressableScale>
      </View>

      {same ? (
        /* one currency both ways: one amount, and a slim row to pay from another balance */
        <View style={{ gap: spacing.sm }}>
          <PressableScale onPress={pickDebit} scaleTo={0.99} accessibilityLabel={`Pay with your ${d.name} balance, ${formatAsset(balances[debit], debit)}. Change`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", paddingHorizontal: spacing.md, paddingVertical: spacing.smd }}>
            <CoinIcon code={debit} size={32} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" tone="muted">
                Pay with
              </Text>
              <Text variant="bodyStrong" numberOfLines={1}>
                {d.name} balance
              </Text>
            </View>
            <Text variant="subhead" tone="muted" numberOfLines={1}>
              {formatAsset(balances[debit], debit)}
            </Text>
            <Icon name="chevron" size={10} color={c.textMuted} weight="bold" />
          </PressableScale>
          <AmountCard
            label="They receive"
            code={receive}
            digits={amount}
            active
            danger={over}
            chip={receiveChip}
            aside={
              over ? (
                <Text variant="caption" tone="danger" numberOfLines={1}>
                  More than your balance
                </Text>
              ) : (
                arrives
              )
            }
          />
        </View>
      ) : (
        /* you pay → they receive, the live rate and its countdown on the seam */
        <View>
          <AmountCard
            label="You pay"
            code={debit}
            digits={typing === "pay" ? amount : toInput(payAmount, d.decimals)}
            active={typing === "pay"}
            danger={over}
            onActivate={() => activate("pay")}
            chip={payChip}
            aside={
              over ? (
                <Text variant="caption" tone="danger" numberOfLines={1}>
                  More than your {debit} balance
                </Text>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 }}>
                  <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                    Balance {formatAsset(balances[debit], debit)}
                  </Text>
                  <PressableScale onPress={fillMax} hitSlop={8} accessibilityLabel="Pay with your whole balance">
                    <Text variant="subhead" tone="brand">
                      Max
                    </Text>
                  </PressableScale>
                </View>
              )
            }
          />
          <View style={{ alignItems: "center", marginVertical: -14, zIndex: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 34, paddingHorizontal: spacing.smd, borderRadius: radius.full, backgroundColor: c.surface, borderWidth: 4, borderColor: c.bg }}>
              <Icon name="arrowDown" size={11} color={c.textMuted} weight="bold" />
              <Text variant="caption" numberOfLines={1}>
                {rateText}
              </Text>
              <QuoteTimer size={14} />
            </View>
          </View>
          <AmountCard label="They receive" code={receive} digits={typing === "receive" ? amount : toInput(toAmount, r.decimals)} active={typing === "receive"} danger={false} onActivate={() => activate("receive")} chip={receiveChip} aside={arrives} />
        </View>
      )}

      {/* fee and total, once, under the cards */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, paddingHorizontal: spacing.xs }}>
        <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          Fee <Text variant="caption" tone={fee ? "text" : "success"}>{fee ? formatAsset(fee, debit) : "Free"}</Text>
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          Total <Text variant="caption" tone="text">{formatAsset(payAmount + fee, debit)}</Text>
        </Text>
      </View>

      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xs }}>
        <AmountEntry value={amount} onChange={setAmount} decimals={Math.min((typing === "pay" ? d : r).decimals, 6)} showDisplay={false} compact={compact} />
      </View>
    </FlowScreen>
  );
}
