import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AmountEntry } from "@/components/amount-entry";
import { openAssetPicker } from "@/components/asset-picker";
import { EmptyState } from "@/components/bits";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Dropdown } from "@/components/dropdown";
import { FlowScreen } from "@/components/flow-screen";
import { QuoteTimer } from "@/components/quote-timer";
import { Text } from "@/components/text";
import { assetByCode, ASSETS, type AssetCode } from "@/data/assets";
import { useFlowStore } from "@/stores/use-flow-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing } from "@/theme";
import { formatAsset, quote, quoteFor, rateLine } from "@/utils/format";
import { useLiveRates } from "@/api/live-rates";

/** Close the add-currency modal, then open the new currency's Receive screen (account details / address). */
const receiveInstead = (code: string) => {
  if (router.canDismiss()) router.dismissAll();
  router.back();
  router.push({ pathname: "/receive/[code]", params: { code } });
};

/**
 * Open a new currency · fund it: right after opening, move money in from a balance you already
 * have. You type what should LAND in the new wallet; the screen shows what it costs from the
 * source at the live quote. Continue → review → PIN → success (a swap, worded as funding).
 * Nothing to move? Receive into it instead.
 */
export default function FundNewCurrency() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const a = assetByCode(code);
  const balances = useWalletStore((s) => s.balances);
  const begin = useFlowStore((s) => s.begin);
  // live rates while this screen is open (the estimate re-prices as they move)
  const rates = useLiveRates();
  // where it comes from: your biggest cash balance first (then crypto), never the new currency itself
  const worth = (code: AssetCode) => balances[code] * rates.usd(code) || 0;
  const funded = ASSETS.filter((x) => x.code !== a.code && balances[x.code] > 0).sort((x, y) => Number(y.kind === "fiat") - Number(x.kind === "fiat") || worth(y.code) - worth(x.code));
  const [from, setFrom] = useState<AssetCode | undefined>(() => funded[0]?.code);
  const [amount, setAmount] = useState("");

  if (!from) {
    return (
      <FlowScreen title={`Add money to ${a.code}`} cancel="back">
        <EmptyState icon="wallet2" title="Nothing to move yet" body={`Your balances are empty. Receive ${a.code} straight into your new ${a.kind === "fiat" ? "account" : "wallet"} instead.`} action={<Button title={`Receive ${a.code}`} icon="receive" inline onPress={() => receiveInstead(a.code)} />} />
      </FlowScreen>
    );
  }

  const decimals = Math.min(a.decimals, 6);
  const want = Number(amount) || 0;
  // the server's rates for both sides: until they arrive the estimate shows "—" and Continue waits
  const priced = rates.has([from, a.code]);
  const cost = quoteFor(want, from, a.code, rates.version);
  // "Max" can round up by one unit of the source: pay the whole balance instead
  const unit = 10 ** -assetByCode(from).decimals;
  const pay = cost.amount > balances[from] && cost.amount - balances[from] <= unit + 1e-12 ? balances[from] : cost.amount;
  const over = want > 0 && pay > balances[from] + 1e-9;
  // presets are shares of the source balance, shown as what lands
  const land = (share: number) => {
    const got = quote(balances[from] * share, from, a.code, rates.version).receive;
    return Number.isFinite(got) ? String(Math.floor(got * 10 ** decimals) / 10 ** decimals) : "";
  };
  const pickFrom = () =>
    openAssetPicker({
      title: "Pay from",
      value: from,
      exclude: [a.code, ...ASSETS.filter((x) => !(balances[x.code] > 0)).map((x) => x.code)],
      onSelect: (v) => setFrom(v),
    });
  const next = () => {
    // what lands is exact (the server's quote prices what it costs), unless it's the whole balance
    begin({ kind: "swap", from, to: a.code, amount: pay, receive: pay === cost.amount ? want : undefined, fund: true });
    router.push("/add-currency/review");
  };

  return (
    <FlowScreen
      title={`Add money to ${a.code}`}
      cancel="back"
      scroll={false}
      footer={
        <>
          <Button title={want && !priced ? "Getting the latest rate…" : over ? `Not enough ${assetByCode(from).name}` : "Continue"} disabled={!want || over || !priced} onPress={next} />
          <Button title={`Receive ${a.code} instead`} variant="tertiary" size="md" onPress={() => receiveInstead(a.code)} />
        </>
      }
    >
      <Dropdown label="Pay from" value={assetByCode(from).name} sub={`Balance ${formatAsset(balances[from], from)}`} leading={<CoinIcon code={from} size={32} />} onPress={pickFrom} />

      <View style={{ alignItems: "center", gap: spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <CoinIcon code={a.code} size={20} />
          <Text variant="subhead" tone="muted">
            Lands in your {a.code} {a.kind === "fiat" ? "account" : "wallet"}
          </Text>
        </View>
        <AmountEntry
          value={amount}
          onChange={setAmount}
          suffix={a.code}
          decimals={decimals}
          pad={false}
          error={over ? `More than your ${from} balance` : undefined}
          helper={want ? `You pay ${formatAsset(pay, from)} · fee included` : " "}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <QuoteTimer />
          <Text variant="caption" tone="muted">
            {priced ? rateLine(from, a.code, 1, cost.rate) : "Getting the latest rate…"}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.sm, gap: spacing.md }}>
        <AmountEntry
          value={amount}
          onChange={setAmount}
          decimals={decimals}
          showDisplay={false}
          presets={[
            { label: "25%", value: land(0.25) },
            { label: "50%", value: land(0.5) },
            { label: "Max", value: land(1) },
          ]}
        />
      </View>
    </FlowScreen>
  );
}
