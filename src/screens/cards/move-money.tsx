import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AmountEntry, groupAmount } from "@/components/amount-entry";
import { EmptyState } from "@/components/bits";
import { Button } from "@/components/button";
import { CardBadge } from "@/components/card-face";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { LEG_ICON, TransferLegs, type Leg } from "@/components/transfer-legs";
import { liveUsd, useQuoteTick } from "@/utils/rates";
import { assetByCode, ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import { cardFundingFee } from "@/data/seed";
import { useCardsStore } from "@/stores/use-cards-store";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";

/**
 * Fund card / Withdraw: a From → To pair (wallet account and card, swapped by mode), the dollar
 * amount in the middle with what it costs or pays out in the other currency, then the keypad.
 */
export function CardMoneyScreen({ mode }: { mode: "fund" | "withdraw" }) {
  const c = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const cards = useCardsStore((s) => s.cards);
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const begin = useFlowStore((s) => s.begin);
  const [cardId, setCardId] = useState(params.id ?? cards[0]?.id);
  const [account, setAccount] = useState<AssetCode>(mode === "fund" ? "NGN" : "USD");
  const [amount, setAmount] = useState("");
  // prices follow the 30-second quote window, the same one review and execution use
  const tick = useQuoteTick();
  const card = cards.find((k) => k.id === cardId) ?? cards[0];
  const fund = mode === "fund";

  if (!card) return null;
  if (card.frozen)
    return (
      <FlowScreen title={fund ? "Fund card" : "Withdraw"}>
        <EmptyState icon="snowflake" title="This card is frozen" body="Unfreeze it from the Cards tab to fund it or move money off it." />
      </FlowScreen>
    );

  const asset = assetByCode(account);
  const usd = Number(amount) || 0;
  const feeUsd = fund ? cardFundingFee(usd) : 0;
  const other = (usd + feeUsd) / liveUsd(account, tick);
  const accountBal = balances[account];
  const over = fund ? other > accountBal + 1e-9 : usd > card.balance + 1e-9;
  const converted = account !== "USD";
  const rate = converted ? `$1 = ${formatAsset(1 / liveUsd(account, tick), account)}` : "No conversion";

  const helper = over
    ? fund
      ? `Not enough ${asset.name}. You have ${formatAsset(accountBal, account)}.`
      : `Your card has $${card.balance.toFixed(2)}.`
    : usd
      ? fund
        ? `${formatAsset(other, account)} from your ${asset.name} balance`
        : `You'll receive ${formatAsset(usd / liveUsd(account, tick), account)}`
      : "Cards are funded in US dollars";

  const pickCard = () =>
    overlay.select({
      title: fund ? "Card to fund" : "Card to withdraw from",
      value: card.id,
      options: cards.map((k) => ({ value: k.id, label: k.label, sub: `•• ${k.last4} · $${k.balance.toFixed(2)}`, leading: <CardBadge theme={k.theme} network={k.network} size={36} /> })),
      onSelect: setCardId,
    });
  const pickAccount = () =>
    overlay.select({
      title: fund ? "Pay from" : "Send to",
      value: account,
      options: ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && (!fund || balances[a.code] > 0)).map((a) => ({ value: a.code, label: a.name, sub: formatAsset(balances[a.code], a.code), leading: <CoinIcon code={a.code} size={36} /> })),
      onSelect: (v) => setAccount(v as AssetCode),
    });

  const cardLeg: Leg = { label: fund ? "To" : "From", title: `${card.label} •• ${card.last4}`, valueLabel: "Balance", value: `$${card.balance.toFixed(2)}`, leading: <CardBadge theme={card.theme} network={card.network} size={LEG_ICON} />, onPress: pickCard };
  const accountLeg: Leg = { label: fund ? "From" : "To", title: asset.name, valueLabel: "Balance", value: formatAsset(accountBal, account), leading: <CoinIcon code={account} size={LEG_ICON} />, onPress: pickAccount };

  const presets = fund
    ? [10, 25, 50, 100].map((n) => ({ label: `$${n}`, value: String(n) }))
    : [
        ...[10, 25].filter((n) => n < card.balance).map((n) => ({ label: `$${n}`, value: String(n) })),
        { label: "Max", value: String(Math.floor(card.balance * 100) / 100) },
      ];

  return (
    <FlowScreen
      title={fund ? "Fund card" : "Withdraw"}
      scroll={false}
      footer={
        <Button
          title="Continue"
          disabled={!usd || over}
          onPress={() => {
            begin(fund ? { kind: "card-fund", cardId: card.id, usd, from: account } : { kind: "card-withdraw", cardId: card.id, usd, to: account });
            router.push(fund ? "/card-fund/review" : "/card-withdraw/review");
          }}
        />
      }
    >
      {fund ? <TransferLegs from={accountLeg} to={cardLeg} /> : <TransferLegs from={cardLeg} to={accountLeg} />}

      {/* amount */}
      <View style={{ flex: 1, minHeight: 112, alignItems: "center", justifyContent: "center", gap: spacing.sm }}>
        <Text variant="hero" adjustsFontSizeToFit numberOfLines={1} accessibilityLabel={`${groupAmount(amount)} US dollars`} style={{ fontSize: 52, lineHeight: 58, color: over ? c.danger : usd ? c.text : c.textSubtle }}>
          ${groupAmount(amount)}
        </Text>
        <Text variant="subhead" align="center" style={{ color: over ? c.danger : c.textMuted }} numberOfLines={2}>
          {helper}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
            <Icon name="swap" size={11} color={c.textMuted} />
            <Text variant="caption" tone="muted">
              {rate}
            </Text>
          </View>
          <View style={{ backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
            <Text variant="caption" tone={fund && usd ? "brand" : "muted"}>
              {fund ? (usd ? `Funding fee $${feeUsd.toFixed(2)}` : "Fee 1%, min $0.50") : "No fee"}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ paddingBottom: spacing.xs }}>
        <AmountEntry value={amount} onChange={setAmount} showDisplay={false} presets={presets} />
      </View>
    </FlowScreen>
  );
}
