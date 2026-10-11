import { router, type Href } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { CashpointMark } from "@/components/cashpoint-mark";
import { Icon, type IconName } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { overlay } from "@/stores/use-overlay-store";
import { spacing, useColors, type ThemeColors } from "@/theme";

type Close = (after?: () => void) => void;
type Item = { label: string; href: Href; icon?: IconName; art?: ReactNode; bg: keyof ThemeColors; fg: keyof ThemeColors };

const MORE: Item[] = [
  { label: "Receive", href: { pathname: "/receive/[code]", params: { code: "NGN" } }, icon: "receive", bg: "successSoft", fg: "success" },
  { label: "Cashpoint", href: "/cashpoint", art: <CashpointMark size={54} />, bg: "accentSoft", fg: "accentText" },
  { label: "Pay bills", href: "/pay", icon: "bolt", bg: "warningSoft", fg: "text" },
  { label: "Recurring", href: "/pay/recurring", icon: "repeat", bg: "brandSoft", fg: "brandText" },
  { label: "Gift cards", href: "/pay/gift-cards", icon: "gift", bg: "brandSoft", fg: "brandText" },
  { label: "Cards", href: "/cards", icon: "card", bg: "brandSoft", fg: "brandText" },
  { label: "Scan to pay", href: "/scan", icon: "scan", bg: "surfaceAlt", fg: "text" },
  { label: "Token Vault", href: "/pay/vault", icon: "vault", bg: "surfaceAlt", fg: "text" },
];

function MoreGrid({ close }: { close: Close }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
      {MORE.map((it) => (
        <PressableScale key={it.label} accessibilityLabel={it.label} onPress={() => close(() => router.push(it.href, { withAnchor: true }))} style={{ width: "25%", alignItems: "center", gap: spacing.sm }}>
          {it.art ?? (
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: c[it.bg], alignItems: "center", justifyContent: "center" }}>
              <Icon name={it.icon!} size={22} color={c[it.fg]} />
            </View>
          )}
          <Text variant="caption" align="center" numberOfLines={1}>
            {it.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

function AddMoneyList({ close }: { close: Close }) {
  const c = useColors();
  const go = (href: Href) => close(() => router.push(href, { withAnchor: true }));
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.sm }} bounces={false}>
      <ListSection>
        <ListRow icon="bank" iconBg={c.successSoft} iconTint={c.success} title="Bank transfer" subtitle="Your Naira account · lands in minutes" onPress={() => go({ pathname: "/receive/[code]", params: { code: "NGN" } })} />
        <ListRow icon="globe" iconBg={c.brandSoft} iconTint={c.brandText} title="From abroad" subtitle="USD, GBP and EUR account details" onPress={() => go({ pathname: "/receive/[code]", params: { code: "USD" } })} />
        <ListRow icon="bitcoin" iconBg={c.accentSoft} iconTint={c.accentText} title="Deposit crypto" subtitle="USDT, BTC, ETH, USDC, SOL" onPress={() => go({ pathname: "/receive/[code]", params: { code: "USDT" } })} />
        <ListRow leading={<CashpointMark size={38} />} title="Redeem a Cashpoint" subtitle="Got a 12-digit code? Load it here" onPress={() => go({ pathname: "/cashpoint", params: { mode: "redeem" } })} />
        <ListRow icon="people" iconBg={c.surfaceAlt} title="Ask a friend" subtitle="Share your @tag or QR code" onPress={() => go("/me/qr")} />
      </ListSection>
    </ScrollView>
  );
}

/** Home → More: every other action, as a grid in our own bottom sheet. */
export const openMoreSheet = () => overlay.sheet({ title: "More", content: (close) => <MoreGrid close={close} /> });

/** Home → Add: every way money gets into Tribe. */
export const openAddMoneySheet = () => overlay.sheet({ title: "Add money", content: (close) => <AddMoneyList close={close} /> });
