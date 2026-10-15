import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, TextInput, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { pushDigit } from "@/components/amount-entry";
import { Button } from "@/components/button";
import { cardLook, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { CoinIcon } from "@/components/coin-icon";
import { CARD_STEPS, FlowProgress } from "@/components/flow-progress";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { KeypadDock } from "@/components/keypad-field";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { assetByCode, ASSETS_FIAT_FIRST, NGN_PER_USD, type AssetCode } from "@/data/assets";
import { CARD_FEE_USD, CARD_MIN_TOPUP_USD, cardFundingFee, type CardNetwork } from "@/data/seed";
import { useCardsStore } from "@/stores/use-cards-store";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { fonts, palette, radius, spacing, useColors } from "@/theme";
import { parseFinish } from "@/utils/card-finish";
import { formatAsset } from "@/utils/format";

const NAMES = ["Everyday", "Subscriptions", "Shopping", "Travel", "Education"];
const TOPUPS = ["10", "25", "50", "100"];

/** A section label in the page's tint. */
function Label({ children }: { children: string }) {
  return (
    <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
      {children}
    </Text>
  );
}

/**
 * New card · Details ("Make it yours"): the card as it will look, its name, where the money
 * comes from, the first top-up (required, at least CARD_MIN_TOPUP_USD — our keypad, quick
 * amounts), and a receipt-style summary of exactly what leaves your wallet and what lands on the card.
 */
export default function CardCreateDetails() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ theme?: string; network?: CardNetwork }>();
  const theme = parseFinish(params.theme);
  const network = (params.network ?? "mastercard") as CardNetwork;
  const tint = useCardPalette(theme);
  const user = useSessionStore((s) => s.user);
  const count = useCardsStore((s) => s.cards.length);
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const begin = useFlowStore((s) => s.begin);
  const [label, setLabel] = useState(count ? "Subscriptions" : "Everyday");
  const [from, setFrom] = useState<AssetCode>("NGN");
  const [amount, setAmount] = useState("");
  const [typing, setTyping] = useState(false);

  const usd = Number(amount) || 0;
  const fundingFee = cardFundingFee(usd);
  const total = usd + CARD_FEE_USD + fundingFee;
  const cost = total / assetByCode(from).usd;
  const over = cost > balances[from] + 1e-9;
  const short = usd < CARD_MIN_TOPUP_USD;
  const name = label.trim();
  const rate = from === "USD" ? null : from === "NGN" ? `$1 = ₦${NGN_PER_USD.toLocaleString()}` : `$1 = ${formatAsset(1 / assetByCode(from).usd, from)}`;

  const pickFrom = () =>
    overlay.select({
      title: "Fund from",
      subtitle: "Any wallet with money in it can pay for your card.",
      value: from,
      options: ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && balances[a.code] > 0).map((a) => ({ value: a.code, label: `${a.name} wallet`, sub: `Balance ${formatAsset(balances[a.code], a.code)}`, leading: <CoinIcon code={a.code} size={36} /> })),
      onSelect: (v) => setFrom(v as AssetCode),
    });

  return (
    <FlowScreen
      title="Make it yours"
      cancel="back"
      tint={tint.page}
      footer={
        <>
          {typing && <KeypadDock label="First top-up" onKey={(d) => setAmount((v) => pushDigit(v, d, 0))} onDelete={() => setAmount((v) => v.slice(0, -1))} onDone={() => setTyping(false)} />}
          <Button
            colors={over || short ? undefined : { bg: tint.accent, fg: tint.accentFg }}
            title={short ? `Add at least $${CARD_MIN_TOPUP_USD} to continue` : over ? `Not enough in your ${assetByCode(from).name} wallet` : `Review · ${formatAsset(cost, from)}`}
            disabled={!name || over || short}
            onPress={() => {
              begin({ kind: "card-create", label: name, theme, network, usd, from });
              router.push("/card-new/review");
            }}
          />
        </>
      }
    >
      <FlowProgress steps={CARD_STEPS} at={2} color={tint.accent} />

      {/* the card as it will be, with its name on a sticker */}
      <View style={{ alignItems: "center", paddingTop: spacing.sm }}>
        {/* sized to the card so the sticker stays on its corner when the card is capped (iPad) */}
        <View>
          <VirtualCardFace card={{ theme, network, holder: `${user.firstName} ${user.lastName}` }} width={width - spacing.mdl * 2} />
          <Animated.View key={name} entering={FadeIn.duration(180)} style={{ position: "absolute", left: spacing.md, top: -2, transform: [{ rotate: "-5deg" }] }}>
            <View style={{ backgroundColor: palette.white, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs, boxShadow: "0 6px 14px -6px rgba(0,0,0,0.45)" }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: palette.purple[700] }}>{name || "Name me"}</Text>
            </View>
          </Animated.View>
        </View>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
          {cardLook(theme).name} · {network === "visa" ? "Visa" : "Mastercard"} · USD
        </Text>
      </View>

      {/* name: type it, or tap a quick one */}
      <View style={{ gap: spacing.sm }}>
        <Label>Name your card</Label>
        <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.smd }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Icon name="pencil" size={14} color={c.textMuted} />
            <TextInput
              value={label}
              onChangeText={(v) => setLabel(v.slice(0, 18))}
              onFocus={() => setTyping(false)}
              placeholder="Card name"
              placeholderTextColor={c.textSubtle}
              autoCapitalize="words"
              selectionColor={tint.accent}
              style={[{ flex: 1, fontFamily: fonts.semibold, fontSize: 17, color: c.text, paddingVertical: spacing.xs }, Platform.OS === "web" ? ({ outlineWidth: 0, outlineStyle: "none" } as object) : null]}
            />
            <Text variant="caption" tone="subtle">
              {label.length}/18
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {NAMES.map((n) => {
              const on = n === name;
              return (
                <PressableScale key={n} onPress={() => setLabel(n)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ paddingHorizontal: spacing.smd, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: on ? tint.accent : c.surfaceAlt }}>
                  <Text variant="subhead" style={{ color: on ? tint.accentFg : c.text }}>
                    {n}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <Text variant="caption" tone="muted">
            Only you see this.
          </Text>
        </View>
      </View>

      {/* where the money comes from + the first top-up */}
      <View style={{ gap: spacing.sm }}>
        <Label>Fund it</Label>
        <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
          <Pressable onPress={pickFrom} accessibilityRole="button" accessibilityLabel={`Fund from ${assetByCode(from).name} wallet, change`}>
            {({ pressed }) => (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, padding: spacing.md, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
                <CoinIcon code={from} size={32} />
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <Text variant="caption" tone="muted">
                    From
                  </Text>
                  <Text variant="bodyStrong">{assetByCode(from).name} wallet</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: spacing.xxs }}>
                  <Text variant="subhead">{formatAsset(balances[from], from)}</Text>
                  {rate && (
                    <Text variant="caption" tone="muted">
                      {rate}
                    </Text>
                  )}
                </View>
                <Icon name="chevronDown" size={11} color={c.textMuted} weight="bold" />
              </View>
            )}
          </Pressable>
          <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: spacing.md }} />
          <View style={{ padding: spacing.md, gap: spacing.md }}>
            <Pressable onPress={() => setTyping(true)} accessibilityRole="button" accessibilityLabel={`First top-up: ${usd} dollars, at least ${CARD_MIN_TOPUP_USD}`} accessibilityHint="Opens the keypad" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ gap: spacing.xxs }}>
                <Text variant="caption" tone={usd && short ? "danger" : "muted"}>
                  First top-up · min ${CARD_MIN_TOPUP_USD}
                </Text>
                <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: usd ? c.text : c.textSubtle }}>${usd.toLocaleString()}</Text>
              </View>
              <View style={{ backgroundColor: typing ? tint.accent : c.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.sm }}>
                <Text variant="subhead" style={{ color: typing ? tint.accentFg : c.text }}>
                  {typing ? "Typing…" : "Enter amount"}
                </Text>
              </View>
            </Pressable>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {TOPUPS.map((v) => {
                const on = v === amount;
                return (
                  <PressableScale key={v} onPress={() => setAmount(on ? "" : v)} style={{ flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: on ? tint.accent : c.surfaceAlt }}>
                    <Text variant="label" style={{ color: on ? tint.accentFg : c.text }}>
                      ${v}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* receipt: what leaves the wallet, what lands on the card */}
      <View style={{ gap: spacing.sm }}>
        <Label>Summary</Label>
        <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.smd }}>
          {(
            [
              ["Card creation", `$${CARD_FEE_USD.toFixed(2)}`],
              ["First top-up", usd ? `$${usd.toFixed(2)}` : "Required"],
              ["Funding fee", usd ? `$${fundingFee.toFixed(2)}` : "1% (min $0.50)"],
            ] as const
          ).map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="body" tone="muted">
                {k}
              </Text>
              <Text variant="body">{v}</Text>
            </View>
          ))}
          <View style={{ height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.borderStrong }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View style={{ gap: spacing.xxs }}>
              <Text variant="caption" tone="muted">
                From your {assetByCode(from).name} wallet
              </Text>
              <Text variant="title" style={{ color: over ? c.danger : c.text }}>
                {formatAsset(cost, from)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: spacing.xxs }}>
              <Text variant="caption" tone="muted">
                Card balance
              </Text>
              <Text variant="headline" style={{ color: c.success }}>
                ${usd.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </FlowScreen>
  );
}
