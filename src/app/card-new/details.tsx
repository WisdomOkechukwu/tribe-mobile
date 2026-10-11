import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Button } from "@/components/button";
import { CARD_THEMES, VirtualCardFace } from "@/components/card-face";
import { CoinIcon } from "@/components/coin-icon";
import { Dropdown } from "@/components/dropdown";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { ChipRow, useChipText } from "@/components/sheet";
import { Text } from "@/components/text";
import { assetByCode, ASSETS_FIAT_FIRST, NGN_PER_USD, type AssetCode } from "@/data/assets";
import { CARD_FEE_USD, cardFundingFee, type CardNetwork, type CardTheme } from "@/data/seed";
import { useCardsStore } from "@/stores/use-cards-store";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";

const NAMES = ["Everyday", "Subscriptions", "Shopping", "Travel", "Education"];

/** New card · 3: "Create a new card" — name, account to fund from, first top-up, fees. */
export default function CardCreateDetails() {
  const c = useColors();
  const chipText = useChipText();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ theme?: CardTheme; network?: CardNetwork }>();
  const theme = (params.theme ?? "midnight") as CardTheme;
  const network = (params.network ?? "mastercard") as CardNetwork;
  const user = useSessionStore((s) => s.user);
  const count = useCardsStore((s) => s.cards.length);
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const begin = useFlowStore((s) => s.begin);
  const [label, setLabel] = useState(count ? "Subscriptions" : "Everyday");
  const [from, setFrom] = useState<AssetCode>("NGN");
  const [amount, setAmount] = useState("");
  const usd = Number(amount) || 0;
  const fundingFee = cardFundingFee(usd);
  const total = usd + CARD_FEE_USD + fundingFee;
  const cost = total / assetByCode(from).usd;
  const over = cost > balances[from] + 1e-9;
  const name = label.trim();
  const rate = from === "USD" ? "USD 1 = USD 1" : from === "NGN" ? `USD 1 = NGN ${NGN_PER_USD.toLocaleString()}` : `USD 1 = ${formatAsset(1 / assetByCode(from).usd, from)}`;

  const pickFrom = () =>
    overlay.select({
      title: "Account to fund from",
      value: from,
      options: ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && balances[a.code] > 0).map((a) => ({ value: a.code, label: a.name, sub: `Bal. ${formatAsset(balances[a.code], a.code)}`, leading: <CoinIcon code={a.code} size={36} /> })),
      onSelect: (v) => setFrom(v as AssetCode),
    });

  return (
    <FlowScreen
      title="Create a new card"
      step="Step 3 of 3"
      cancel="back"
      footer={
        <Button
          title={over ? `Not enough ${from}` : "Create card"}
          disabled={!name || over}
          onPress={() => {
            begin({ kind: "card-create", label: name, theme, network, usd, from }, "/card-new");
            router.push("/card-new/review");
          }}
        />
      }
    >
      <View style={{ alignItems: "center" }}>
        <VirtualCardFace card={{ theme, network, holder: `${user.firstName} ${user.lastName}`, number: network === "visa" ? "4532" : "5399", last4: "••••", expiry: "09/29", cvv: "", frozen: false }} width={width - spacing.mdl * 2} />
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
          {CARD_THEMES[theme].name} · {network === "visa" ? "Visa" : "Mastercard"} · USD
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="headline" style={{ paddingHorizontal: spacing.xs }}>
          Card details
        </Text>
        <Field value={label} onChangeText={(v) => setLabel(v.slice(0, 18))} placeholder="Card name" autoCapitalize="words" hint="Only you see this." />
        <ChipRow
          options={NAMES}
          value={NAMES.includes(name) ? name : ""}
          onChange={setLabel}
          bleed={spacing.mdl}
          render={(n, on) => (
            <Text variant="subhead" style={{ color: chipText(on) }}>
              {n}
            </Text>
          )}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="headline" style={{ paddingHorizontal: spacing.xs }}>
          Select account to fund from
        </Text>
        <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing.xs, marginTop: -4 }}>
          Rate: {rate}
        </Text>
        <Dropdown value={assetByCode(from).name} sub={`Bal. ${formatAsset(balances[from], from)}`} leading={<CoinIcon code={from} size={36} />} onPress={pickFrom} />
        <Field value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" placeholder="First top-up (optional)" leading={<Text variant="bodyStrong" tone="muted">USD</Text>} />
      </View>

      <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.sm }}>
        {[
          ["Card creation fee", `USD ${CARD_FEE_USD.toFixed(2)}`],
          ["Funding fee", usd ? `USD ${fundingFee.toFixed(2)}` : "—"],
          ["Net funding", `USD ${usd.toFixed(2)}`],
          ["Amount to debit", formatAsset(cost, from)],
        ].map(([k, v], i, all) => {
          const last = i === all.length - 1;
          return (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="body" tone={last ? "text" : "muted"}>
                • {k}
              </Text>
              <Text variant={last ? "bodyStrong" : "body"} tone={last && over ? "danger" : "text"}>
                {v}
              </Text>
            </View>
          );
        })}
      </View>
    </FlowScreen>
  );
}
