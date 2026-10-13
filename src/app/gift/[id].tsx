import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { GiftCardFace } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { ListRow, ListSection } from "@/components/list";
import { Segmented } from "@/components/segmented";
import { ChipRow, useChipText } from "@/components/sheet";
import { Text } from "@/components/text";
import { assetByCode, ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import { GIFT_AMOUNTS, GIFT_CARD_BUY_MARKUP, giftBrandById } from "@/data/catalog";
import { useFlowStore } from "@/stores/use-flow-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";

type Mode = "buy" | "sell";

/** Gift cards: buy (pay with anything) or sell (paid in NGN/USDT) → review → PIN. */
export default function Gift() {
  const c = useColors();
  const chipText = useChipText();
  const params = useLocalSearchParams<{ id: string; mode?: Mode }>();
  const brand = giftBrandById(params.id);
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const begin = useFlowStore((s) => s.begin);
  const [mode, setMode] = useState<Mode>(params.mode === "sell" ? "sell" : "buy");
  const [usd, setUsd] = useState(50);
  const [payWith, setPayWith] = useState<AssetCode>("USDT");
  const [payout, setPayout] = useState<"NGN" | "USDT">("NGN");
  const [cardCode, setCardCode] = useState("");

  const cost = (usd * (1 + GIFT_CARD_BUY_MARKUP)) / assetByCode(payWith).usd;
  const over = mode === "buy" && cost > balances[payWith];
  const payoutNgn = usd * brand.sellRate;
  const payoutAmt = payout === "NGN" ? payoutNgn : payoutNgn * assetByCode("NGN").usd;
  const ok = mode === "buy" ? !over : cardCode.replace(/\W/g, "").length >= 10;

  return (
    <FlowScreen
      title={`${brand.name} gift card`}
      footer={
        <Button
          title="Continue"
          disabled={!ok}
          onPress={() => {
            begin(mode === "buy" ? { kind: "gift-buy", brandId: brand.id, usd, payWith } : { kind: "gift-sell", brandId: brand.id, usd, payout }, `/gift/${brand.id}`);
            router.push("/gift/review");
          }}
        />
      }
    >
      <GiftCardFace brand={brand} amount={`$${usd}`} width={300} style={{ alignSelf: "center", boxShadow: "0 24px 40px -22px rgba(0,0,0,0.6)" }} />
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "buy", label: "Buy" },
          { value: "sell", label: "Sell" },
        ]}
      />
      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          Card value
        </Text>
        <ChipRow
          options={GIFT_AMOUNTS}
          value={usd}
          onChange={setUsd}
          bleed={spacing.mdl}
          render={(v, on) => (
            <Text variant="subhead" style={{ color: chipText(on) }}>
              ${v}
            </Text>
          )}
        />
      </View>

      {mode === "buy" ? (
        <>
          <View style={{ gap: spacing.sm }}>
            <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
              Pay with
            </Text>
            <ChipRow
              options={ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && balances[a.code] > 0).map((a) => a.code)}
              value={payWith}
              onChange={setPayWith}
              bleed={spacing.mdl}
              render={(v, on) => (
                <>
                  <CoinIcon code={v} size={20} />
                  <Text variant="subhead" style={{ color: chipText(on) }}>
                    {v}
                  </Text>
                </>
              )}
            />
          </View>
          <ListSection inset={spacing.md}>
            <ListRow title="You pay" value={formatAsset(cost, payWith)} valueTone={over ? "danger" : "text"} compact />
            <ListRow title="Includes fee" value={`${GIFT_CARD_BUY_MARKUP * 100}%`} compact />
            <ListRow title="Delivery" value="Code in-app, instantly" compact />
          </ListSection>
        </>
      ) : (
        <>
          <Field label="Card code" value={cardCode} onChangeText={setCardCode} placeholder="XXXX-XXXX-XXXX-XXXX" autoCapitalize="characters" mono />
          <View style={{ gap: spacing.sm }}>
            <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
              Get paid in
            </Text>
            <Segmented<"NGN" | "USDT">
              value={payout}
              onChange={setPayout}
              options={[
                { value: "NGN", label: "Naira" },
                { value: "USDT", label: "USDT" },
              ]}
            />
          </View>
          <View style={{ backgroundColor: c.successSoft, borderRadius: radius.group, padding: spacing.md, gap: spacing.xs }}>
            <Text variant="subhead" tone="muted">
              You get
            </Text>
            <Text variant="title" tone="success">
              {formatAsset(payoutAmt, payout)}
            </Text>
            <Text variant="caption" tone="muted">
              ₦{brand.sellRate.toLocaleString()}/$ · paid after a quick check
            </Text>
          </View>
        </>
      )}
    </FlowScreen>
  );
}
