import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { billerById, giftBrandById } from "@/data/catalog";
import type { Transaction } from "@/data/seed";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";
import { BillerThumb, GiftMark } from "./brand-tiles";
import { useCardsStore } from "@/stores/use-cards-store";
import { CardBadge } from "./card-face";
import { CashpointMark } from "./cashpoint-mark";
import { CoinIcon } from "./coin-icon";
import { Icon, type IconName } from "./icon";
import { PairIcon } from "./pair-icon";
import { Text } from "./text";

const SIZE = 40;

function Leading({ tx }: { tx: Transaction }) {
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
  if (tx.type === "referral")
    return (
      <PairIcon
        from={tx.asset}
        front={(s) => (
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
  if (tx.direction === "out") return <PairIcon from={tx.asset} front={(s) => <CardBadge theme={theme} network={network} size={s} />} size={size} />;
  return <PairIcon from="card" back={(s) => <CardBadge theme={theme} network={network} size={s} />} to={tx.asset} size={size} />;
}

/** The thing bought/funded in its own terms — hidden when it would just repeat a Naira amount. */
export const showFace = (tx: Transaction) => !!tx.meta?.face && !(tx.asset === "NGN" && tx.meta.face.startsWith("₦"));

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** `interactive={false}` for summaries (e.g. the support form) where tapping shouldn't open the receipt. */
export function TransactionRow({ tx, interactive = true }: { tx: Transaction; interactive?: boolean }) {
  const c = useColors();
  const hidden = usePrefsStore((s) => s.hideBalances);
  const incoming = tx.direction === "in";
  const isSwap = tx.type === "swap" && tx.toAsset;
  const failed = tx.status === "failed" || tx.status === "cancelled";
  const pair = isSwap || tx.type === "referral" || (tx.type === "send" && !!tx.toAsset) || ((tx.type === "bill" || tx.type === "giftcard") && !!(tx.meta?.billerId || tx.meta?.giftBrand)) || (tx.type === "card" && !!tx.meta?.face);
  const status = { completed: ["Success", c.success, c.successSoft], pending: ["Pending", c.pending, c.warningSoft], failed: ["Failed", c.danger, c.dangerSoft], cancelled: ["Cancelled", c.textMuted, c.surfaceAlt] }[tx.status];

  return (
    <Pressable
      disabled={!interactive}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        router.push({ pathname: "/transaction/[id]", params: { id: tx.id } });
      }}
      accessibilityRole={interactive ? "button" : undefined}
      accessibilityLabel={`${tx.title}, ${formatAsset(tx.amount, tx.asset)}, ${tx.status}`}
    >
      {({ pressed }) => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingVertical: spacing.smd, paddingHorizontal: spacing.md, minHeight: 64, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
          <View style={{ width: pair ? 56 : SIZE }}>
            <Leading tx={tx} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {tx.title}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {`${time(tx.date)} · ${tx.subtitle}`}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 1 }}>
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
}

/** "Today" / "Yesterday" / "Mon 6 Oct" */
export function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(d)) / 864e5);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Day buckets, newest first — merges by day even if the list isn't strictly sorted. */
export function groupByDay<T extends { date: string }>(items: T[]) {
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  const map = new Map<string, T[]>();
  for (const tx of sorted) {
    const day = dayLabel(tx.date);
    map.set(day, [...(map.get(day) ?? []), tx]);
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
          {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: spacing.md + SIZE + spacing.smd + 8 }} />}
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
