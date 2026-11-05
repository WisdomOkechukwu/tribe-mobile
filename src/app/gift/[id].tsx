import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { openAssetPicker } from "@/components/asset-picker";
import { Note, TileGrid } from "@/components/bits";
import { GiftCardFace } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Dropdown } from "@/components/dropdown";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { PrivacyGuard } from "@/components/privacy-guard";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { assetByCode, ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import { giftAmounts, giftBrandById, giftSellPayout } from "@/data/catalog";
import { useGiftBrands } from "@/api/queries";
import { exceeds } from "@/utils/decimal";
import { ReviewTicket } from "@/screens/review";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { fonts, radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";
import { useLiveRates } from "@/api/live-rates";

type Mode = "buy" | "sell";

/** Card values as a 3-across tile grid; each tile says what it costs / pays in your chosen currency. */
function ValueGrid({ amounts, value, onPick, sub }: { amounts: number[]; value: number; onPick: (v: number) => void; sub: (v: number) => string }) {
  const c = useColors();
  return (
    <TileGrid>
      {amounts.map((v) => {
        const on = v === value;
        return (
          <PressableScale
            key={v}
            scaleTo={0.96}
            onPress={() => onPick(v)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`$${v} card, ${sub(v)}`}
            style={{ flexGrow: 1, alignItems: "center", gap: 2, paddingVertical: spacing.smd, borderRadius: radius.group, borderCurve: "continuous", backgroundColor: on ? c.brandSoft : c.surface, borderWidth: 1.5, borderColor: on ? c.brand : "transparent" }}
          >
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24, color: on ? c.brandText : c.text }}>${v}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {sub(v)}
            </Text>
          </PressableScale>
        );
      })}
    </TileGrid>
  );
}

/**
 * One gift card: the card itself up top (its value updates as you pick), Buy | Sell, the value
 * as tiles, then — buying: which wallet pays and a receipt-style total; selling: the card code
 * and payout in ANY currency (crypto too), converted from the ₦/$ rate. → review → PIN.
 */
export default function Gift() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id: string; mode?: Mode }>();
  // the brand's live rate, markup and limits (GET gift-cards/brands)
  const brandsLoaded = useGiftBrands().dataUpdatedAt;
  const brand = giftBrandById(params.id, brandsLoaded);
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const begin = useFlowStore((s) => s.begin);
  const funded = ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && balances[a.code] > 0);
  const [mode, setMode] = useState<Mode>(params.mode === "sell" ? "sell" : "buy");
  const [usd, setUsd] = useState(50);
  
  // live rates while this screen is open (the estimate re-prices as they move)
  const rates = useLiveRates();
  const [payWith, setPayWith] = useState<AssetCode>(() => (funded.find((a) => a.code === "USDT") ?? funded[0])?.code ?? "NGN");
  const [payout, setPayout] = useState<AssetCode>("NGN");
  const [cardCode, setCardCode] = useState("");

  const balancesRaw = useWalletStore((s) => s.balancesRaw);
  // the server's rate for the wallet that pays / the payout currency: until it arrives, "—" and the button waits
  const priced = mode === "buy" ? payWith === "USD" || rates.has(payWith) : payout === "NGN" || rates.has(["NGN", payout]);
  const costIn = (code: AssetCode, v: number) => (code === "USD" ? v * (1 + brand.markup) : (v * (1 + brand.markup)) / rates.usd(code));
  const costOf = (v: number) => costIn(payWith, v);
  const cost = costOf(usd);
  const fee = usd * brand.markup;
  const over = mode === "buy" && exceeds(cost, balancesRaw[payWith] ?? "0");
  const payoutAmt = giftSellPayout(usd, brand, payout, rates.version);
  const ok = priced && (mode === "buy" ? !over : cardCode.replace(/\W/g, "").length >= 10);
  const faceW = Math.min(width - spacing.mdl * 2 - 24, 320);

  const pickWallet = () =>
    overlay.select({
      title: "Pay with",
      subtitle: `Any wallet can buy a $${usd} card.`,
      value: payWith,
      options: funded.map((a) => ({
        value: a.code,
        label: `${a.name} wallet`,
        sub: `Balance ${formatAsset(balances[a.code], a.code)}`,
        leading: <CoinIcon code={a.code} size={36} />,
        trailing: costIn(a.code, usd) > balances[a.code] ? "Not enough" : formatAsset(costIn(a.code, usd), a.code),
      })),
      onSelect: (v) => setPayWith(v as AssetCode),
    });

  return (
    <FlowScreen
      title={brand.name}
      footer={
        <Button
          title={!priced ? "Getting the latest rate…" : mode === "buy" ? (over ? `Not enough in ${assetByCode(payWith).name}` : `Buy for ${formatAsset(cost, payWith)}`) : `Sell for ${formatAsset(payoutAmt, payout)}`}
          disabled={!ok}
          onPress={() => {
            begin(mode === "buy" ? { kind: "gift-buy", brandId: brand.id, usd, payWith } : { kind: "gift-sell", brandId: brand.id, usd, payout, code: cardCode.trim() });
            router.push("/gift/review");
          }}
        />
      }
    >
      {/* selling: the card code is worth money, so no screenshots or recordings */}
      {mode === "sell" && <PrivacyGuard />}
      {/* the card itself, value on its face */}
      <View style={{ alignItems: "center", paddingVertical: spacing.sm }}>
        <View style={{ transform: [{ rotate: "-3deg" }] }}>
          <GiftCardFace brand={brand} amount={`$${usd}`} width={faceW} style={{ boxShadow: "0 24px 40px -22px rgba(0,0,0,0.6)" }} />
        </View>
      </View>

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
        <ValueGrid amounts={giftAmounts(brand)} value={usd} onPick={setUsd} sub={(v) => (!priced ? "—" : mode === "buy" ? `≈ ${formatAsset(costOf(v), payWith)}` : `≈ ${formatAsset(giftSellPayout(v, brand, payout, rates.version), payout)}`)} />
      </View>

      {mode === "buy" ? (
        <>
          <View style={{ gap: spacing.sm }}>
            <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
              Pay with
            </Text>
            <Pressable onPress={pickWallet} accessibilityRole="button" accessibilityLabel={`Pay with ${assetByCode(payWith).name} wallet, change`}>
              {({ pressed }) => (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: pressed ? c.surfaceAlt : c.surface, borderRadius: radius.input, borderCurve: "continuous", paddingHorizontal: spacing.md, minHeight: 60 }}>
                  <CoinIcon code={payWith} size={32} />
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <Text variant="bodyStrong">{assetByCode(payWith).name} wallet</Text>
                    <Text variant="caption" tone={over ? "danger" : "muted"}>
                      {over ? "Not enough for this card" : `Balance ${formatAsset(balances[payWith], payWith)}`}
                    </Text>
                  </View>
                  <Icon name="chevronDown" size={11} color={c.textMuted} weight="bold" />
                </View>
              )}
            </Pressable>
          </View>
          <ReviewTicket
            rows={[
              ["Card value", `$${usd}`],
              ["Fee", `$${fee.toFixed(2)} (${+(brand.markup * 100).toFixed(2)}%)`],
              ...(payWith !== "USD" ? ([["Rate", priced ? `$1 = ${formatAsset(1 / rates.usd(payWith), payWith)}` : "Getting the latest rate…"]] as [string, string][]) : []),
            ]}
            total={["You pay", formatAsset(cost, payWith)]}
          />
          <Note icon="gift">Your {brand.name} code lands in the app the second you pay.</Note>
        </>
      ) : (
        <>
          <Field label="Card code" value={cardCode} onChangeText={setCardCode} placeholder="XXXX-XXXX-XXXX-XXXX" autoCapitalize="characters" mono />
          <Dropdown
            label="Get paid in"
            value={assetByCode(payout).name}
            sub={`${payout} · any currency, crypto too`}
            leading={<CoinIcon code={payout} size={36} />}
            onPress={() => openAssetPicker({ title: "Get paid in", value: payout, onSelect: setPayout })}
          />
          <View style={{ backgroundColor: c.successSoft, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.xs }}>
            <Text variant="subhead" tone="muted">
              You get
            </Text>
            <Text variant="largeTitle" tone="success" adjustsFontSizeToFit numberOfLines={1}>
              {formatAsset(payoutAmt, payout)}
            </Text>
            <Text variant="caption" tone="muted">
              ${usd} × ₦{brand.sellRate.toLocaleString()}/$ = ₦{(usd * brand.sellRate).toLocaleString()}
              {payout !== "NGN" ? ` → ${payout} at today's rate` : ""}
            </Text>
            <Text variant="caption" tone="muted">
              Paid after a quick check, usually minutes.
            </Text>
          </View>
        </>
      )}
    </FlowScreen>
  );
}
