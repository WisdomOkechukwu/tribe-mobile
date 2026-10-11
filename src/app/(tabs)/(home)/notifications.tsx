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
import { groupByDay } from "@/components/transaction-row";
import type { InboxItem, InboxKind } from "@/data/inbox";
import { useInboxStore } from "@/stores/use-inbox-store";
import { radius, spacing, useColors, type ThemeColors } from "@/theme";
import { relativeDate } from "@/utils/format";

const KIND: Record<InboxKind, { icon: IconName; bg: keyof ThemeColors; fg: keyof ThemeColors }> = {
  money: { icon: "receive", bg: "successSoft", fg: "success" },
  swap: { icon: "swap", bg: "brandSoft", fg: "brandText" },
  security: { icon: "shield", bg: "dangerSoft", fg: "danger" },
  cashpoint: { icon: "cashpoint", bg: "accentSoft", fg: "accentText" },
  referral: { icon: "people", bg: "accentSoft", fg: "accentText" },
  vault: { icon: "bolt", bg: "warningSoft", fg: "text" },
  card: { icon: "card", bg: "brandSoft", fg: "brandText" },
  promo: { icon: "megaphone", bg: "brandSoft", fg: "brandText" },
  support: { icon: "chatLine", bg: "brandSoft", fg: "brandText" },
};

function Leading({ n }: { n: InboxItem }) {
  const c = useColors();
  if (n.kind === "cashpoint") return <CashpointMark size={42} />;
  if (n.asset && n.kind === "money") return <CoinIcon code={n.asset} size={42} />;
  const k = KIND[n.kind];
  return (
    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c[k.bg], alignItems: "center", justifyContent: "center" }}>
      <Icon name={k.icon} size={18} color={c[k.fg]} />
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
          <View style={{ flex: 1, gap: 2 }}>
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
  const items = useInboxStore((s) => s.items);
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
        {items.length === 0 ? (
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
                    {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: 70 }} />}
                    <Row n={n} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </Screen>
    </>
  );
}
