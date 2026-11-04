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
import { usdRate } from "@/utils/rates";
import { useLiveRates } from "@/api/live-rates";
import { useReferrals } from "@/api/queries";
import { exceeds } from "@/utils/decimal";

/**
 * Withdraw referral earnings into ANY currency: Naira, dollars, pounds, euros or crypto.
 * Referral balance → asset you pick (a wallet you don't have yet is created) → review → PIN.
 */
export default function ReferralWithdraw() {
  const c = useColors();
  // the balance comes from the API (never kept on the device): "—" until it's loaded
  const loaded = !!useReferrals().data;
  const { version, has } = useLiveRates();
  const balance = useReferralStore((s) => s.balance);
  const balanceRaw = useReferralStore((s) => s.balanceRaw);
  const balances = useWalletStore((s) => s.balances);
  const begin = useFlowStore((s) => s.begin);
  const [to, setTo] = useState<AssetCode>("NGN");
  const [amount, setAmount] = useState("");
  const value = Number(amount) || 0;
  const a = assetByCode(to);
  // the server's rates for NGN and the target: until they arrive, "—" and Continue waits
  const priced = to === "NGN" || has(["NGN", to]);
  const received = to === "NGN" ? value : (value * usdRate("NGN", version)) / usdRate(to, version);
  const over = loaded && exceeds(amount || "0", balanceRaw);
  const under = value > 0 && value < REFERRAL.minWithdrawNgn;
  const rate = to === "NGN" ? "No conversion" : !priced ? "Getting the latest rate…" : usdRate(to) > usdRate("NGN") ? `1 ${to} = ${formatAsset(usdRate(to) / usdRate("NGN"), "NGN")}` : `₦1 = ${formatAsset(usdRate("NGN") / usdRate(to), to)}`;

  const from: Leg = {
    label: "From",
    title: "Referral balance",
    valueLabel: "Available",
    value: loaded ? `₦${balance.toLocaleString()}` : "—",
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
          title={value && !priced ? "Getting the latest rate…" : "Continue"}
          disabled={!value || over || under || !loaded || !priced}
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
