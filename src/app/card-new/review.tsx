import { router } from "expo-router";
import { useWindowDimensions, View } from "react-native";
import { Button } from "@/components/button";
import { CARD_THEMES, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { CoinIcon } from "@/components/coin-icon";
import { CARD_STEPS, FlowProgress } from "@/components/flow-progress";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { Text } from "@/components/text";
import { assetByCode } from "@/data/assets";
import { CARD_FEE_USD, cardFundingFee } from "@/data/seed";
import { ReviewScreen, useKeptPending } from "@/screens/review";
import { type PendingAction } from "@/stores/use-flow-store";
import { useSessionStore } from "@/stores/use-session-store";
import { fonts, palette, radius, spacing } from "@/theme";
import { formatAsset } from "@/utils/format";

const usd = (n: number) => `$${n.toFixed(2)}`;

/**
 * Last step of card creation. Stays in the chosen finish's page tint (like the steps before it):
 * the card as it'll be issued, what it costs in total, the fee breakdown and the wallet it's paid from.
 */
export default function CardCreateReview() {
  const pending = useKeptPending();
  if (pending?.kind !== "card-create") return <ReviewScreen />;
  return <CardReview action={pending} />;
}

function CardReview({ action: a }: { action: Extract<PendingAction, { kind: "card-create" }> }) {
  const { width } = useWindowDimensions();
  const tint = useCardPalette(a.theme);
  const user = useSessionStore((s) => s.user);

  const fundingFee = cardFundingFee(a.usd);
  const total = a.usd + CARD_FEE_USD + fundingFee;
  const from = assetByCode(a.from);
  const cost = total / from.usd;
  const network = a.network === "visa" ? "Visa" : "Mastercard";

  return (
    <FlowScreen
      title="Review"
      cancel="back"
      tint={tint.page}
      footer={<Button colors={{ bg: tint.accent, fg: tint.accentFg }} icon="lock" title={`Create card · ${usd(total)}`} onPress={() => router.push("/pin")} />}
    >
      <FlowProgress steps={CARD_STEPS} at={3} color={tint.accent} />

      {/* the card exactly as it'll be issued, its name on the same sticker as the details step */}
      <View style={{ alignItems: "center", paddingTop: spacing.sm }}>
        {/* sized to the card so the sticker stays on its corner when the card is capped (iPad) */}
        <View>
          <VirtualCardFace card={{ theme: a.theme, network: a.network, holder: `${user.firstName} ${user.lastName}`, number: a.network === "visa" ? "4532" : "5399", last4: "••••", expiry: "09/29", cvv: "", frozen: false }} width={width - spacing.mdl * 2} />
          <View style={{ position: "absolute", left: spacing.md, top: -2, transform: [{ rotate: "-5deg" }] }}>
            <View style={{ backgroundColor: palette.white, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs, boxShadow: "0 6px 14px -6px rgba(0,0,0,0.45)" }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: palette.purple[700] }}>{a.label}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* the one number that matters */}
      <View style={{ alignItems: "center", gap: spacing.xs }}>
        <Text variant="overline" tone="muted">
          Total to pay
        </Text>
        <Text variant="balance" adjustsFontSizeToFit numberOfLines={1}>
          {usd(total)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: tint.soft, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint.accent }} />
          <Text variant="subhead">
            {CARD_THEMES[a.theme].name} · {network} · USD
          </Text>
        </View>
      </View>

      <ListSection title="Breakdown" inset={spacing.md}>
        <ListRow key="topup" compact title="First top-up" value={a.usd ? usd(a.usd) : "None"} valueTone="text" />
        <ListRow key="create" compact title="Card creation fee" value={usd(CARD_FEE_USD)} valueTone="text" />
        {a.usd ? <ListRow key="fund" compact title="Funding fee" value={usd(fundingFee)} valueTone="text" /> : null}
        <View key="total" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.smd, minHeight: 52, backgroundColor: tint.soft }}>
          <Text variant="bodyStrong">Total</Text>
          <Text variant="amount">{usd(total)}</Text>
        </View>
      </ListSection>

      <ListSection title="Paying from" inset={spacing.md}>
        <ListRow
          key="from"
          leading={<CoinIcon code={a.from} size={38} />}
          title={`${from.name} wallet`}
          subtitle={a.from === "USD" ? "No conversion" : `$1 = ${formatAsset(1 / from.usd, a.from)}`}
          value={formatAsset(cost, a.from)}
        />
      </ListSection>

      <View style={{ flexDirection: "row", gap: spacing.smd, alignItems: "center", backgroundColor: tint.soft, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
        <Icon name="sparkles" size={18} color={tint.accent} />
        <Text variant="caption" style={{ flex: 1 }}>
          Ready the moment you confirm. Add it to Apple Pay or Google Wallet from the Cards tab.
        </Text>
      </View>
    </FlowScreen>
  );
}
