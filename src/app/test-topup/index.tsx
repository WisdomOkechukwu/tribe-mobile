import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AmountEntry } from "@/components/amount-entry";
import { Note } from "@/components/bits";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { assetByCode, ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import { overlay } from "@/stores/use-overlay-store";
import { toast } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";

/** Quick amounts worth about $50, $500 and $5,000 in the chosen currency, rounded to one figure. */
function presetsFor(code: AssetCode) {
  const a = assetByCode(code);
  return [50, 500, 5_000].map((usd) => {
    const raw = usd / a.usd;
    const step = 10 ** Math.floor(Math.log10(raw));
    const n = Math.max(Math.round(raw / step) * step, 10 ** -a.decimals);
    const fixed = n.toFixed(a.decimals);
    const value = fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
    // short labels so three fit on a 375pt phone ("₦800,000", "0.005 BTC")
    return { label: a.kind === "fiat" ? `${a.symbol}${Number(value).toLocaleString("en-US")}` : `${value} ${code}`, value };
  });
}

/**
 * Test top-up (Me › Testing): add any amount of any currency to the demo wallet so every flow can
 * be tried. Opens the wallet if it isn't open yet, and logs a "Test top-up" deposit in History.
 * Testing only: there's no money behind it. TODO(launch): remove with the mock data.
 */
export default function TestTopUp() {
  const c = useColors();
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const openAccount = useWalletStore((s) => s.openAccount);
  const record = useWalletStore((s) => s.record);
  const [code, setCode] = useState<AssetCode>("NGN");
  const [amount, setAmount] = useState("");
  const asset = assetByCode(code);
  const n = Number(amount) || 0;

  const pick = () =>
    overlay.select({
      title: "Top up which currency?",
      subtitle: "Any currency or coin. New wallets open on the spot.",
      value: code,
      options: ASSETS_FIAT_FIRST.map((a) => ({ value: a.code, label: a.name, sub: opened.includes(a.code) ? `Balance ${formatAsset(balances[a.code], a.code)}` : `${a.code} · not open yet`, leading: <CoinIcon code={a.code} size={36} /> })),
      onSelect: (v) => {
        setCode(v as AssetCode);
        setAmount("");
      },
    });

  const add = () => {
    openAccount(code);
    record({ type: "receive", asset: code, amount: n, direction: "in", title: "Test top-up", subtitle: "Testing only · not real money", meta: { channel: "Test top-up" } }, { [code]: n });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast(`${formatAsset(n, code)} added to your ${code} wallet`, "success");
    setAmount("");
  };

  return (
    <FlowScreen title="Test top-up" footer={<Button title={n ? `Add ${formatAsset(n, code)}` : "Enter an amount"} disabled={!n} onPress={add} />}>
      <Note icon="info">For testing only. This adds pretend money to your wallet so you can try every flow. Nothing real moves.</Note>

      <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel={`Currency: ${asset.name}, change`}>
        {({ pressed }) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, padding: spacing.md, borderRadius: radius.group, borderCurve: "continuous", backgroundColor: pressed ? c.surfaceAlt : c.surface }}>
            <CoinIcon code={code} size={36} />
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="caption" tone="muted">
                Top up
              </Text>
              <Text variant="bodyStrong">{asset.name}</Text>
            </View>
            <Text variant="subhead" tone="muted">
              {opened.includes(code) ? formatAsset(balances[code], code) : "Not open yet"}
            </Text>
            <Icon name="chevronDown" size={11} color={c.textMuted} weight="bold" />
          </View>
        )}
      </Pressable>

      <AmountEntry
        value={amount}
        onChange={setAmount}
        prefix={asset.kind === "fiat" ? asset.symbol : undefined}
        suffix={asset.kind === "crypto" ? code : undefined}
        decimals={asset.decimals}
        helper={n ? `New balance ${formatAsset(balances[code] + n, code)}` : "Any amount"}
        presets={presetsFor(code)}
      />
    </FlowScreen>
  );
}
