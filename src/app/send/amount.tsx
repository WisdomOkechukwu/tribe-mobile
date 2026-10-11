import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AmountEntry, groupAmount } from "@/components/amount-entry";
import { openAssetPicker } from "@/components/asset-picker";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
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
 * How much (Send boards' amount step): who it's for (with "Change recipient?"), your available
 * balance, the asset to debit with the rate, the amount and fee, and what they'll receive (with
 * "Change receive currency?"). Pay with any balance; we convert on the way.
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
      "/send",
    );
    router.push("/send/review");
  };

  return (
    <FlowScreen title={scope === "crypto" ? "Send crypto" : scope === "global" ? "Global send" : "Send Naira"} cancel="back" scroll={false} footer={<Button title="Continue" disabled={!value} onPress={review} />}>
      {/* recipient's details */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.brandSoft, borderRadius: radius.group, borderCurve: "continuous", borderWidth: 1, borderColor: c.brand, overflow: "hidden" }}>
          <PressableScale onPress={changeCurrency} accessibilityLabel={`Receive currency ${receive}, change`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.smd, borderRightWidth: 1, borderRightColor: c.border }}>
            <CoinIcon code={receive} size={28} />
            <View>
              <Text variant="subhead">{receive}</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {scope === "crypto" ? r.name : "Receives"}
              </Text>
            </View>
          </PressableScale>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.smd }}>
            <Avatar size={28} name={recipient.name} />
            <View style={{ flex: 1 }}>
              <Text variant="subhead" numberOfLines={1}>
                {recipient.name}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {recipient.handle}
              </Text>
            </View>
          </View>
        </View>
        <PressableScale onPress={changeRecipient} hitSlop={8} style={{ alignSelf: "flex-end" }} accessibilityRole="button">
          <Text variant="caption" tone="brand">
            Change recipient
          </Text>
        </PressableScale>
      </View>

      <View>
        <Text variant="subhead" tone="muted" style={{ marginBottom: spacing.sm }}>
          Available bal.: <Text variant="subhead">{formatAsset(balances[debit], debit)}</Text>
        </Text>
        {/* asset to debit */}
        <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <PressableScale onPress={() => openAssetPicker({ title: "Asset to debit", value: debit, onSelect: setDebit })} accessibilityLabel={`Pay with ${d.name}, change`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <CoinIcon code={debit} size={34} />
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text variant="bodyStrong">{debit}</Text>
                  <Icon name="chevron" size={10} color={c.textMuted} weight="bold" />
                </View>
                <Text variant="caption" tone="muted">
                  Asset to debit
                </Text>
              </View>
            </PressableScale>
            <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                Total: <Text variant="caption">{formatAsset(value + fee, debit)}</Text>
              </Text>
              {!same && (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {rateText}
                </Text>
              )}
            </View>
          </View>
          <View style={{ alignItems: "center", paddingVertical: spacing.xs }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, maxWidth: "100%" }}>
              <Text variant="balance" style={{ color: over ? c.danger : value ? c.text : c.textSubtle, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>
                {groupAmount(amount)}
              </Text>
              <Text variant="headline" tone="muted">
                {debit}
              </Text>
            </View>
            <Text variant="caption" tone={over ? "danger" : "muted"}>
              {over ? "More than your balance" : <>Send fee: <Text variant="caption" tone={fee ? "brand" : "success"}>{fee ? formatAsset(fee, debit) : "Free"}</Text></>}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "center", marginVertical: -10, zIndex: 2 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon name="arrowDown" size={13} color={c.textMuted} weight="bold" />
          </View>
        </View>
        {/* to receive */}
        <PressableScale onPress={changeCurrency} scaleTo={0.99} accessibilityLabel={`They receive ${formatAsset(toAmount, receive)}`} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <CoinIcon code={receive} size={34} />
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text variant="bodyStrong">{receive}</Text>
                <Icon name="chevron" size={10} color={c.textMuted} weight="bold" />
              </View>
              <Text variant="caption" tone="muted">
                To receive · {eta.toLowerCase()}
              </Text>
            </View>
          </View>
          <Text variant="amount" style={{ color: value && !over ? c.success : c.textSubtle, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>
            {formatAsset(toAmount, receive)}
          </Text>
        </PressableScale>
      </View>

      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.sm }}>
        <AmountEntry value={amount} onChange={setAmount} decimals={Math.min(d.decimals, 6)} showDisplay={false} />
      </View>
    </FlowScreen>
  );
}
