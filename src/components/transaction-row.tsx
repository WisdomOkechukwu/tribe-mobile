import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { memo, type ReactElement } from "react";
import { Pressable, SectionList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { billerById, giftBrandById } from "@/data/catalog";
import type { Transaction } from "@/data/seed";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";
import { txSubtitle, txTitle } from "@/utils/tx";
import { BillerThumb, GiftMark } from "./brand-tiles";
import { useCardsStore } from "@/stores/use-cards-store";
import { CardBadge, CardPairIcon } from "./card-face";
import { CashpointMark } from "./cashpoint-mark";
import { CoinIcon } from "./coin-icon";
import { Icon, type IconName } from "./icon";
import { PairIcon } from "./pair-icon";
import { GLASS_TAB_BAR_HEIGHT } from "./glass-tab-bar";
import { Text } from "./text";

const SIZE = 40;
/** One leading slot for every row (fits a PairIcon), so every title starts at the same x. */
const LEAD = 56;
const SEPARATOR_INSET = spacing.md + LEAD + spacing.smd;

/** The leading art for a transaction (coin pair, biller, card, Cashpoint…) — rows and notifications share it. */
export function TxLeading({ tx }: { tx: Transaction }) {
  const c = useColors();
  if (tx.type === "swap" && tx.toAsset) return <PairIcon from={tx.asset} to={tx.toAsset} size={SIZE} />;
  // bills & gift cards: what paid (coin/flag) underneath, what it bought in front
  if (tx.type === "bill" && tx.meta?.billerId) {
    const b = billerById(tx.meta.billerId);
    return <PairIcon from={tx.asset} front={(s) => <BillerThumb biller={b} size={s} />} size={SIZE} />;
  }
  if (tx.type === "giftcard" && tx.meta?.giftBrand) {
    const g = giftBrandById(tx.meta.giftBrand);
    return <PairIcon from={tx.asset} front={(s) => <GiftMark brand={g} size={s} />} size={SIZE} />;
  }
  if (tx.type === "cashpoint") return <CashpointMark size={SIZE} />;
  if (tx.type === "card") return <CardLeading tx={tx} size={SIZE} />;
  // referral payouts: earnings underneath (from), the balance they landed in in front (to)
  if (tx.type === "referral")
    return (
      <PairIcon
        from="Referral earnings"
        to={tx.asset}
        back={(s) => (
          <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
            <Icon name="people" size={s * 0.45} color="#fff" />
          </View>
        )}
        size={SIZE}
      />
    );
  // converted sends: what paid underneath, what they got in front
  if (tx.type === "send" && tx.toAsset) return <PairIcon from={tx.asset} to={tx.toAsset} size={SIZE} />;
  const badge: Partial<Record<Transaction["type"], { icon: IconName; bg: string; fg: string }>> = {
    send: { icon: "send", bg: c.surfaceAlt, fg: c.text },
  };
  const b = badge[tx.type];
  if (!b) {
    // incoming: the asset's coin with a small green arrow
    return (
      <View>
        <CoinIcon code={tx.asset} size={SIZE} />
        <View style={{ position: "absolute", right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, backgroundColor: c.success, borderWidth: 2, borderColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <Icon name="receive" size={9} color="#fff" weight="bold" />
        </View>
      </View>
    );
  }
  return (
    <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: b.bg, alignItems: "center", justifyContent: "center" }}>
      <Icon name={b.icon} size={17} color={b.fg} />
    </View>
  );
}

/**
 * Card money moves show where the money came from: top-ups = funding coin/flag under the card,
 * withdrawals = card under the coin it landed in. Plain card spends show just the card.
 */
export function CardLeading({ tx, size }: { tx: Transaction; size: number }) {
  const card = useCardsStore((s) => s.cards.find((k) => k.id === (tx.meta?.cardId ?? "c1")));
  const theme = card?.theme ?? "midnight";
  const network = card?.network ?? "mastercard";
  if (!tx.meta?.face) return <CardBadge theme={theme} network={network} size={size} />;
  return <CardPairIcon theme={theme} network={network} asset={tx.asset} direction={tx.direction} size={size} />;
}

/** The thing bought/funded in its own terms — hidden when it would just repeat a Naira amount. */
export const showFace = (tx: Transaction) => !!tx.meta?.face && !(tx.asset === "NGN" && tx.meta.face.startsWith("₦"));

// one formatter each — toLocale*String builds a new Intl formatter on every call
const TIME_FMT = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const DAY_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const time = (iso: string) => TIME_FMT.format(new Date(iso));

/** `interactive={false}` for summaries (e.g. the support form) where tapping shouldn't open the receipt. */
export const TransactionRow = memo(function TransactionRow({ tx, interactive = true }: { tx: Transaction; interactive?: boolean }) {
  const c = useColors();
  const hidden = usePrefsStore((s) => s.hideBalances);
  const incoming = tx.direction === "in";
  const isSwap = tx.type === "swap" && tx.toAsset;
  const failed = tx.status === "failed" || tx.status === "cancelled";
  const status = { completed: ["Success", c.success, c.successSoft], pending: ["Pending", c.pending, c.warningSoft], failed: ["Failed", c.danger, c.dangerSoft], cancelled: ["Cancelled", c.textMuted, c.surfaceAlt] }[tx.status];

  return (
    <Pressable
      disabled={!interactive}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        router.push({ pathname: "/transaction/[id]", params: { id: tx.id } });
      }}
      accessibilityRole={interactive ? "button" : undefined}
      accessibilityLabel={`${txTitle(tx)}, ${formatAsset(tx.amount, tx.asset)}, ${tx.status}`}
    >
      {({ pressed }) => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingVertical: spacing.smd, paddingHorizontal: spacing.md, minHeight: 64, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
          <View style={{ width: LEAD, alignItems: "center" }}>
            <TxLeading tx={tx} />
          </View>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {txTitle(tx)}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {`${time(tx.date)} · ${txSubtitle(tx)}`}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: spacing.xxs }}>
            {isSwap ? (
              <>
                <Text variant="amount" tone="success">
                  {hidden ? "•••" : formatAsset(tx.toAmount!, tx.toAsset!, { sign: "+" })}
                </Text>
                <Text variant="caption" tone="danger">
                  {hidden ? "•••" : formatAsset(tx.amount, tx.asset, { sign: "−" })}
                </Text>
              </>
            ) : (
              <>
                <Text variant="amount" style={{ color: failed ? c.textSubtle : incoming ? c.success : c.danger, textDecorationLine: failed ? "line-through" : "none" }}>
                  {hidden ? "•••" : formatAsset(tx.amount, tx.asset, { sign: incoming ? "+" : "−" })}
                </Text>
                {/* the utility / card in its own terms, under what was paid */}
                {showFace(tx) && tx.status === "completed" && (
                  <Text variant="caption" tone="muted">
                    {hidden ? "•••" : tx.meta!.face}
                  </Text>
                )}
              </>
            )}
            {/* status chip (Transaction.png) — quiet for successes, loud otherwise */}
            {tx.status !== "completed" && (
              <View style={{ backgroundColor: status[2], borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 1, marginTop: 2 }}>
                <Text variant="caption" style={{ color: status[1], fontSize: 10, lineHeight: 14, fontFamily: "Poppins_600SemiBold" }}>
                  {status[0]}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
});

/** "Today" / "Yesterday" / "Mon 6 Oct" */
export function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(d)) / 864e5);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return DAY_FMT.format(d);
}

/** Day buckets, newest first — merges by day even if the list isn't strictly sorted. */
export function groupByDay<T extends { date: string }>(items: T[]) {
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  const map = new Map<string, T[]>();
  for (const tx of sorted) {
    const day = dayLabel(tx.date);
    const list = map.get(day);
    if (list) list.push(tx);
    else map.set(day, [tx]);
  }
  return [...map].map(([day, list]) => ({ day, items: list }));
}

/** One inset-grouped block of rows. */
export function TransactionGroup({ items }: { items: Transaction[] }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
      {items.map((tx, i) => (
        <View key={tx.id}>
          {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: SEPARATOR_INSET }} />}
          <TransactionRow tx={tx} />
        </View>
      ))}
    </View>
  );
}

/** Transactions grouped by day: a quiet day label above each block. */
export function TransactionList({ items, grouped = true }: { items: Transaction[]; grouped?: boolean }) {
  if (!grouped) return <TransactionGroup items={items} />;
  return (
    <View style={{ gap: spacing.md }}>
      {groupByDay(items).map((g) => (
        <View key={g.day} style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
            {g.day}
          </Text>
          <TransactionGroup items={g.items} />
        </View>
      ))}
    </View>
  );
}

/**
 * Full history, virtualised: only the rows on screen (plus a small window) are mounted, so a long
 * history costs the same as a short one. Day labels and inset groups look like `TransactionList`.
 * Use it as a screen's body (it scrolls); `header` sits above the first day.
 */
export function TransactionSectionList({ items, header, empty }: { items: Transaction[]; header?: ReactElement; empty?: ReactElement }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sections = groupByDay(items).map((g) => ({ title: g.day, data: g.items }));
  return (
    <SectionList
      sections={sections}
      keyExtractor={(tx) => tx.id}
      stickySectionHeadersEnabled={false}
      initialNumToRender={12}
      maxToRenderPerBatch={10}
      windowSize={7}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: insets.bottom + GLASS_TAB_BAR_HEIGHT + spacing.xl }}
      ListHeaderComponent={header ? <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>{header}</View> : undefined}
      ListEmptyComponent={empty}
      renderSectionHeader={({ section }) => (
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs, paddingBottom: spacing.sm }}>
          {section.title}
        </Text>
      )}
      SectionSeparatorComponent={({ leadingItem, trailingSection }) =>
        // gap after a finished group, before the next day's label
        leadingItem && trailingSection ? <View style={{ height: spacing.md }} /> : null
      }
      renderItem={({ item, index, section }) => {
        const first = index === 0;
        const last = index === section.data.length - 1;
        return (
          <View
            style={{
              backgroundColor: c.surface,
              overflow: "hidden",
              borderCurve: "continuous",
              borderTopLeftRadius: first ? radius.group : 0,
              borderTopRightRadius: first ? radius.group : 0,
              borderBottomLeftRadius: last ? radius.group : 0,
              borderBottomRightRadius: last ? radius.group : 0,
            }}
          >
            {!first && <View style={{ height: 1, backgroundColor: c.border, marginLeft: SEPARATOR_INSET }} />}
            <TransactionRow tx={item} />
          </View>
        );
      }}
    />
  );
}
