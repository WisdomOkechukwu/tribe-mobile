import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AmountEntry, groupAmount } from "@/components/amount-entry";
import { openAssetPicker } from "@/components/asset-picker";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { LEG_ICON, TransferLegs, type Leg } from "@/components/transfer-legs";
import { assetByCode, type AssetCode } from "@/data/assets";
import { REFERRAL } from "@/data/referrals";
import { useFlowStore } from "@/stores/use-flow-store";
import { useReferralStore } from "@/stores/use-referral-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { palette, radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";
import { liveUsd } from "@/utils/rates";

/**
 * Withdraw referral earnings into ANY currency: Naira, dollars, pounds, euros or crypto.
 * Referral balance → asset you pick (a wallet you don't have yet is created) → review → PIN.
 */
export default function ReferralWithdraw() {
  const c = useColors();
  const balance = useReferralStore((s) => s.balance);
  const balances = useWalletStore((s) => s.balances);
  const begin = useFlowStore((s) => s.begin);
  const [to, setTo] = useState<AssetCode>("NGN");
  const [amount, setAmount] = useState("");
  const value = Number(amount) || 0;
  const a = assetByCode(to);
  const received = (value * liveUsd("NGN")) / liveUsd(to);
  const over = value > balance + 1e-9;
  const under = value > 0 && value < REFERRAL.minWithdrawNgn;
  const rate = to === "NGN" ? "No conversion" : liveUsd(to) > liveUsd("NGN") ? `1 ${to} = ${formatAsset(liveUsd(to) / liveUsd("NGN"), "NGN")}` : `₦1 = ${formatAsset(liveUsd("NGN") / liveUsd(to), to)}`;

  const from: Leg = {
    label: "From",
    title: "Referral balance",
    valueLabel: "Available",
    value: `₦${balance.toLocaleString()}`,
    leading: (
      <View style={{ width: LEG_ICON, height: LEG_ICON, borderRadius: LEG_ICON / 2, backgroundColor: palette.orange[500], alignItems: "center", justifyContent: "center" }}>
        <Icon name="people" size={18} color="#fff" />
      </View>
    ),
  };
  const toLeg: Leg = { label: "To", title: a.name, valueLabel: "Balance", value: formatAsset(balances[to], to), leading: <CoinIcon code={to} size={LEG_ICON} />, onPress: () => openAssetPicker({ title: "Withdraw into", value: to, onSelect: setTo }) };
  const helper = over ? `You have ₦${balance.toLocaleString()} to withdraw.` : under ? `The minimum is ₦${REFERRAL.minWithdrawNgn.toLocaleString()}.` : value ? `You'll receive ${formatAsset(received, to)}` : "Withdraw into any balance, crypto included";

  return (
    <FlowScreen
      title="Withdraw earnings"
      scroll={false}
      footer={
        <Button
          title="Continue"
          disabled={!value || over || under}
          onPress={() => {
            begin({ kind: "referral-withdraw", amountNgn: value, to });
            router.push("/referral-withdraw/review");
          }}
        />
      }
    >
      <TransferLegs from={from} to={toLeg} />
      <View style={{ flex: 1, minHeight: 112, alignItems: "center", justifyContent: "center", gap: spacing.sm }}>
        <Text variant="hero" adjustsFontSizeToFit numberOfLines={1} style={{ fontSize: 52, lineHeight: 58, color: over || under ? c.danger : value ? c.text : c.textSubtle }}>
          ₦{groupAmount(amount)}
        </Text>
        <Text variant="subhead" align="center" style={{ color: over || under ? c.danger : c.textMuted }}>
          {helper}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
          <Icon name="swap" size={11} color={c.textMuted} />
          <Text variant="caption" tone="muted">
            {rate} · no fee
          </Text>
        </View>
      </View>
      <View style={{ paddingBottom: spacing.xs }}>
        <AmountEntry
          value={amount}
          onChange={setAmount}
          decimals={0}
          showDisplay={false}
          presets={[
            ...[1_000, 2_500].filter((n) => n <= balance).map((n) => ({ label: `₦${n.toLocaleString()}`, value: String(n) })),
            { label: "Max", value: String(Math.floor(balance)) },
          ]}
        />
      </View>
    </FlowScreen>
  );
}
