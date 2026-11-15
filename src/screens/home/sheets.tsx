import { router, type Href } from "expo-router";
import { ScrollView, View } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { overlay } from "@/stores/use-overlay-store";
import { spacing, useColors } from "@/theme";
import { BILL_SERVICES, useServiceOff, type ServiceCode } from "@/utils/services";

type Close = (after?: () => void) => void;
/** `services`: what the tile leads to. It is greyed out only when an admin has switched ALL of them off. */
type Item = { label: string; href: Href; icon: IconName; services?: ServiceCode[] };

/** One quiet style for every tile: neutral circle, line icon. The colour lives on the screens they open. */
const MORE: Item[] = [
  { label: "Receive", href: { pathname: "/receive/[code]", params: { code: "NGN" } }, icon: "receive", services: ["receive"] },
  { label: "Cashpoint", href: "/cashpoint", icon: "cashpoint", services: ["cashpoint_create", "cashpoint_redeem"] },
  { label: "Pay bills", href: "/pay", icon: "bolt", services: BILL_SERVICES },
  { label: "Recurring", href: "/pay/recurring", icon: "repeat", services: ["recurring_bills"] },
  { label: "Gift cards", href: "/pay/gift-cards", icon: "gift", services: ["gift_card_buy", "gift_card_sell"] },
  { label: "Cards", href: "/cards", icon: "card", services: ["virtual_cards"] },
  { label: "Scan to pay", href: "/scan", icon: "scan" },
  { label: "Token Vault", href: "/pay/vault", icon: "vault" },
];

function MoreTile({ it, close }: { it: Item; close: Close }) {
  const c = useColors();
  const off = useServiceOff(...(it.services ?? []));
  return (
    <PressableScale accessibilityLabel={it.label} accessibilityHint={off ?? undefined} disabled={!!off} onPress={() => close(() => router.push(it.href, { withAnchor: true }))} style={{ width: "25%", alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
        <Icon name={it.icon} size={22} color={c.text} />
      </View>
      <Text variant="caption" align="center" numberOfLines={1}>
        {it.label}
      </Text>
    </PressableScale>
  );
}

function MoreGrid({ close }: { close: Close }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
      {MORE.map((it) => (
        <MoreTile key={it.label} it={it} close={close} />
      ))}
    </View>
  );
}

function AddMoneyList({ close }: { close: Close }) {
  const c = useColors();
  const go = (href: Href) => close(() => router.push(href, { withAnchor: true }));
  const receiveOff = useServiceOff("receive");
  const redeemOff = useServiceOff("cashpoint_redeem");
  return (
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.sm }} bounces={false}>
      {/* one quiet style: our own line glyphs on soft brand circles; the Cashpoint keeps its orange moment */}
      <ListSection>
        <ListRow glyph="bank" iconBg={c.brandSoft} iconTint={c.brandText} off={receiveOff} title="Bank transfer" subtitle="Your Naira account · lands in minutes" onPress={() => go({ pathname: "/receive/[code]", params: { code: "NGN" } })} />
        <ListRow glyph="globe" iconBg={c.brandSoft} iconTint={c.brandText} off={receiveOff} title="From abroad" subtitle="USD, GBP and EUR account details" onPress={() => go({ pathname: "/receive/[code]", params: { code: "USD" } })} />
        <ListRow glyph="crypto" iconBg={c.brandSoft} iconTint={c.brandText} off={receiveOff} title="Crypto deposit" subtitle="USDT, BTC, ETH, USDC, SOL" onPress={() => go({ pathname: "/receive/[code]", params: { code: "USDT" } })} />
        <ListRow glyph="cashpoint" iconBg={c.accentSoft} iconTint={c.accentText} off={redeemOff} title="Redeem a Cashpoint" subtitle="Got a 12-digit code? Load it here" onPress={() => go({ pathname: "/cashpoint", params: { mode: "redeem" } })} />
        <ListRow glyph="at" iconBg={c.brandSoft} iconTint={c.brandText} title="From a Tribe friend" subtitle="Share your @tag or QR code" onPress={() => go("/me/qr")} />
      </ListSection>
    </ScrollView>
  );
}

/** Home → More: every other action, as a grid in our own bottom sheet. */
export const openMoreSheet = () => overlay.sheet({ title: "More", content: (close) => <MoreGrid close={close} /> });

/** Home → Receive: every way money gets into Tribe. */
export const openAddMoneySheet = () => overlay.sheet({ title: "Receive money", content: (close) => <AddMoneyList close={close} /> });
