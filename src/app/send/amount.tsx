import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
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
import { Text } from "@/components/text";
import { ASSETS_FIAT_FIRST, assetByCode, type AssetCode } from "@/data/assets";
import { channelById } from "@/data/channels";
import { openAddMoneySheet } from "@/screens/home/sheets";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { useSendDraft } from "@/stores/use-send-draft";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset, quote } from "@/utils/format";
import { liveUsd } from "@/utils/rates";

/** Same currency if you hold it; otherwise the balance worth the most. */
function defaultDebit(receive: AssetCode, balances: Record<AssetCode, number>, opened: AssetCode[]): AssetCode {
  if (opened.includes(receive) && balances[receive] > 0) return receive;
  const funded = ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && balances[a.code] > 0).sort((x, y) => balances[y.code] * liveUsd(y.code) - balances[x.code] * liveUsd(x.code));
  return funded[0]?.code ?? receive;
}

/**
 * How much (Send boards' amount step), laid out like Swap: who it's for (with "Change"), what you
 * send (any balance, with your balance beside it), the fee and total on the card's own line, the
 * rate on the seam, and what they receive and when (tap to change currency). We convert on the way.
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
  const [amount, setAmount] = useState("");

  if (!recipient) {
    return (
      <FlowScreen title="Send" cancel="back">
        <EmptyState icon="send" title="Pick a recipient first" body="Go back and choose who you're paying." />
      </FlowScreen>
    );
  }

  const d = assetByCode(debit);
  const r = assetByCode(receive);
  const value = Number(amount) || 0;
  const same = debit === receive;
  const channel = channelById(recipient.channelId);
  const net = r.networks?.find((n) => n.id === recipient.network);
  const tribe = recipient.kind === "tribe";
  // fees: free between Tribe users; channel fee (USD) or network fee (in the received crypto) otherwise
  const feeUsd = tribe ? 0 : channel ? channel.feeUsd : net ? net.fee * liveUsd(receive) : 0;
  const fee = feeUsd / liveUsd(debit);
  const q = quote(value, debit, receive);
  const toAmount = same ? value : q.receive;
  const rate = same ? 1 : quote(1, debit, receive).rate;
  const over = value + fee > balances[debit] + 1e-9;
  const eta = tribe ? "Instantly" : (channel?.eta ?? net?.eta ?? "Within minutes");
  const channelName = tribe ? "Tribe transfer" : (channel?.name ?? net?.name ?? "Transfer");
  const rateText = rate >= 1 ? `1 ${debit} = ${formatAsset(rate, receive)}` : `1 ${receive} = ${formatAsset(1 / rate, debit)}`;

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
        amount: value,
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

  const debitCard = (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.smd }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm }}>
        <PressableScale onPress={() => openAssetPicker({ title: "Pay with", value: debit, onSelect: setDebit })} accessibilityLabel={`You send ${d.name}. Change`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <CoinIcon code={debit} size={36} />
          <View>
            <Text variant="caption" tone="muted">
              You send
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Text variant="bodyStrong">{debit}</Text>
              <Icon name="chevron" size={10} color={c.textMuted} weight="bold" />
            </View>
          </View>
        </PressableScale>
        <View style={{ alignItems: "flex-end" }}>
          <Text variant="caption" tone="muted">
            Balance
          </Text>
          <Text variant="subhead" numberOfLines={1}>
            {formatAsset(balances[debit], debit)}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "center", gap: spacing.xxs }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm, maxWidth: "100%" }}>
          <Text variant="balance" style={{ color: over ? c.danger : value ? c.text : c.textSubtle, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>
            {groupAmount(amount)}
          </Text>
          <Text variant="headline" tone="muted">
            {debit}
          </Text>
        </View>
        {over && (
          <Text variant="caption" tone="danger">
            More than your balance
          </Text>
        )}
      </View>
      {/* fee and total on one line, on the card's own grid */}
      <View style={{ height: 1, backgroundColor: c.border }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text variant="caption" tone="muted">
          Fee <Text variant="caption" tone={fee ? "text" : "success"}>{fee ? formatAsset(fee, debit) : "Free"}</Text>
        </Text>
        <Text variant="caption" tone="muted">
          Total <Text variant="caption" tone="text">{formatAsset(value + fee, debit)}</Text>
        </Text>
      </View>
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

      {/* you send → they receive, with the rate on the seam */}
      <View>
        {debitCard}
        <View style={{ alignItems: "center", marginVertical: -16, zIndex: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, height: 36, minWidth: 36, paddingHorizontal: same ? 0 : spacing.smd, justifyContent: "center", borderRadius: 18, backgroundColor: c.surface, borderWidth: 4, borderColor: c.bg }}>
            <Icon name="arrowDown" size={12} color={c.textMuted} weight="bold" />
            {!same && (
              <Text variant="caption" numberOfLines={1}>
                {rateText}
              </Text>
            )}
          </View>
        </View>
        <PressableScale onPress={changeCurrency} scaleTo={0.99} accessibilityLabel={`They receive ${formatAsset(toAmount, receive)}. Change currency`} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <CoinIcon code={receive} size={36} />
            <View>
              <Text variant="caption" tone="muted">
                They receive
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Text variant="bodyStrong">{receive}</Text>
                <Icon name="chevron" size={10} color={c.textMuted} weight="bold" />
              </View>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
            <Text variant="amount" style={{ color: value && !over ? c.success : c.textSubtle }} numberOfLines={1} adjustsFontSizeToFit>
              {formatAsset(toAmount, receive)}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              Arrives {eta.toLowerCase()}
            </Text>
          </View>
        </PressableScale>
      </View>

      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xs }}>
        <AmountEntry value={amount} onChange={setAmount} decimals={Math.min(d.decimals, 6)} showDisplay={false} />
      </View>
    </FlowScreen>
  );
}
