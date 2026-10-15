import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { Pressable, View } from "react-native";
import { EmptyState } from "@/components/bits";
import { CashpointMark } from "@/components/cashpoint-mark";
import { CoinIcon } from "@/components/coin-icon";
import { Icon, type IconName } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { groupByDay, TxLeading } from "@/components/transaction-row";
import { BillerThumb } from "@/components/brand-tiles";
import { billerById } from "@/data/catalog";
import { useInbox, useTransactions } from "@/api/queries";
import { Loaded, SkeletonList } from "@/components/skeletons";
import type { ReactNode } from "react";
import type { InboxItem, InboxKind } from "@/data/inbox";
import { useInboxStore } from "@/stores/use-inbox-store";
import { palette, radius, spacing, useColors, type ThemeColors } from "@/theme";
import { relativeDate } from "@/utils/format";

/** Fallback art per kind, when a notification isn't about a transaction, bill or currency. */
const KIND: Record<InboxKind, { icon: IconName; bg: keyof ThemeColors; fg: keyof ThemeColors }> = {
  money: { icon: "wallet2", bg: "successSoft", fg: "success" },
  swap: { icon: "swap", bg: "brandSoft", fg: "brandText" },
  security: { icon: "shield", bg: "dangerSoft", fg: "danger" },
  cashpoint: { icon: "cashpoint", bg: "accentSoft", fg: "accentText" },
  referral: { icon: "people", bg: "accentSoft", fg: "accentText" },
  vault: { icon: "vault", bg: "warningSoft", fg: "pending" },
  card: { icon: "card", bg: "brandSoft", fg: "brandText" },
  promo: { icon: "megaphone", bg: "brandSoft", fg: "brandText" },
  support: { icon: "chatLine", bg: "brandSoft", fg: "brandText" },
};

/** Corner badge per kind when the art alone doesn't say what happened (a token saved, a ticket…). */
const KIND_BADGE: Partial<Record<InboxKind, IconName>> = { vault: "bolt", security: "warning" };

const SIZE = 44;

/** Older notifications only carry a link; the transaction id is in it. */
const txIdOf = (n: InboxItem) => n.txId ?? n.href?.match(/^\/transaction\/(.+)$/)?.[1];

/**
 * The notification's picture says what it's about, the same way History does: the coin pair of a
 * swap, the biller over the coin that paid, the card, the Cashpoint ticket, the currency that
 * opened, the device that signed in… plus a small badge for what happened (bolt = token saved,
 * repeat = scheduled, plus = opened, chat = ticket).
 */
function Leading({ n }: { n: InboxItem }) {
  const c = useColors();
  const id = txIdOf(n);
  const tx = useTransactions().data?.find((t) => t.id === id);
  const k = KIND[n.kind];
  const badge = n.badge ?? KIND_BADGE[n.kind];

  let art: ReactNode;
  if (tx) art = <TxLeading tx={tx} />;
  else if (n.billerId) art = <BillerThumb biller={billerById(n.billerId)} size={SIZE - 4} />;
  else if (n.assets && n.assets.length > 1)
    art = (
      // several currencies: a small overlapping stack
      <View style={{ flexDirection: "row" }}>
        {n.assets.slice(0, 3).map((code, i) => (
          <View key={code} style={{ marginLeft: i ? -16 : 0, borderRadius: 14, borderWidth: 2, borderColor: c.surface, zIndex: 3 - i }}>
            <CoinIcon code={code} size={24} />
          </View>
        ))}
      </View>
    );
  else if (n.asset) art = <CoinIcon code={n.asset} size={SIZE - 4} />;
  else if (n.kind === "cashpoint") art = <CashpointMark size={SIZE - 4} />;
  else
    art = (
      <View style={{ width: SIZE - 4, height: SIZE - 4, borderRadius: (SIZE - 4) / 2, backgroundColor: c[k.bg], alignItems: "center", justifyContent: "center" }}>
        <Icon name={n.icon ?? k.icon} size={18} color={c[k.fg]} />
      </View>
    );

  return (
    <View style={{ width: SIZE + 12, height: SIZE, alignItems: "center", justifyContent: "center" }}>
      {art}
      {badge && (
        <View style={{ position: "absolute", right: 2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: c[k.fg], borderWidth: 2, borderColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <Icon name={badge} size={9} color={palette.white} weight="bold" />
        </View>
      )}
    </View>
  );
}

function Row({ n }: { n: InboxItem }) {
  const c = useColors();
  const markRead = useInboxStore((s) => s.markRead);
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        markRead(n.id);
        if (n.href) router.push(n.href as never, { withAnchor: true });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${n.read ? "" : "Unread. "}${n.title}. ${n.body}`}
    >
      {({ pressed }) => (
        <View style={{ flexDirection: "row", gap: spacing.smd, padding: spacing.md, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
          <Leading n={n} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                {n.title}
              </Text>
              <Text variant="caption" tone="subtle">
                {relativeDate(n.date)}
              </Text>
            </View>
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {n.body}
            </Text>
          </View>
          {!n.read && <View style={{ position: "absolute", left: 6, top: spacing.md + 17, width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent }} />}
        </View>
      )}
    </Pressable>
  );
}

/** In-app inbox: money in/out, security alerts, Cashpoint redemptions, referral rewards. */
export default function Notifications() {
  const c = useColors();
  const inbox = useInbox();
  const items = inbox.data ?? [];
  const markAllRead = useInboxStore((s) => s.markAllRead);
  const unread = items.filter((n) => !n.read).length;

  const groups = groupByDay(items);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: unread
            ? () => (
                <PressableScale onPress={markAllRead} hitSlop={10} accessibilityLabel="Mark all as read">
                  <Text variant="body" tone="brand">
                    Read all
                  </Text>
                </PressableScale>
              )
            : undefined,
        }}
      />
      <Screen>
        <Loaded query={inbox} skeleton={<SkeletonList rows={6} />}>
          {() =>
            items.length === 0 ? (
              <EmptyState icon="bell" title="All quiet" body="Money moves, security alerts and Cashpoint redemptions land here." />
            ) : (
              groups.map((g) => (
                <View key={g.day} style={{ gap: spacing.sm }}>
                  <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
                    {g.day}
                  </Text>
                  <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
                    {g.items.map((n, i) => (
                      <View key={n.id}>
                        {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: spacing.md + SIZE + 12 + spacing.smd }} />}
                        <Row n={n} />
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )
          }
        </Loaded>
      </Screen>
    </>
  );
}
