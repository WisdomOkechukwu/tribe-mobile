import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { EmptyState } from "@/components/bits";
import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { ChipRow, useChipText } from "@/components/sheet";
import { Text } from "@/components/text";
import { SwipePager } from "@/components/swipe-switch";
import { TransactionSectionList } from "@/components/transaction-row";
import type { AssetCode } from "@/data/assets";
import type { TxType } from "@/data/seed";
import { openAddMoneySheet } from "@/screens/home/sheets";
import { useCards, useTransactions } from "@/api/queries";
import { QueryError, SkeletonList } from "@/components/skeletons";
import { overlay } from "@/stores/use-overlay-store";
import { radius, spacing, useColors } from "@/theme";
import { senderOf, txScope, type TxScope } from "@/utils/tx";

/** What happened: the chips under the title. Gift cards and referrals only show under All. */
type Category = "all" | "swap" | "utility" | "cashpoint" | "card" | "deposit" | "withdrawal";
const CATEGORIES: { value: Category; label: string; icon?: IconName; type?: TxType }[] = [
  { value: "all", label: "All" },
  { value: "swap", label: "Swap", icon: "swap", type: "swap" },
  { value: "utility", label: "Utility", icon: "bill", type: "bill" },
  { value: "cashpoint", label: "Cashpoint", icon: "cashpoint", type: "cashpoint" },
  { value: "card", label: "Virtual cards", icon: "card", type: "card" },
  { value: "deposit", label: "Deposits", icon: "receive", type: "receive" },
  { value: "withdrawal", label: "Withdrawals", icon: "send", type: "send" },
];
const CATEGORY_VALUES = CATEGORIES.map((k) => k.value);
const categoryOf = (type?: TxType): Category => CATEGORIES.find((k) => k.type === type)?.value ?? "all";

/** Which balances: the filter button in the header. */
type Scope = "all" | TxScope;
const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "All accounts" },
  { value: "local", label: "Local (NGN)" },
  { value: "crypto", label: "Crypto" },
  { value: "global", label: "Global accounts" },
];

/**
 * History: category chips (All · Swap · Utility · Cashpoint · Virtual cards · Deposits ·
 * Withdrawals), an account filter in the header, status chips on rows, and an empty state that
 * gets you to a first deposit. `?type=card&card=c1` opens it pre-filtered (Cards → All transactions).
 */
export default function History() {
  const c = useColors();
  const chipText = useChipText();
  const params = useLocalSearchParams<{ type?: TxType; card?: string; tab?: Scope; asset?: AssetCode; from?: string; fromName?: string }>();
  const history = useTransactions();
  const all = history.data ?? [];
  const card = useCards().data?.find((k) => k.id === params.card);
  const [category, setCategory] = useState<Category>(categoryOf(params.type));
  const [scope, setScope] = useState<Scope>(params.tab ?? "all");
  const [cardId, setCardId] = useState(params.card);
  const [asset, setAsset] = useState(params.asset);
  // receipt → "More from…": every deposit from one sender
  const [from, setFrom] = useState(params.from);

  // what one category page shows, under the account / card / asset / sender filters
  const itemsFor = (cat: Category) => {
    const type = CATEGORIES.find((k) => k.value === cat)?.type;
    return all.filter((t) => (scope === "all" || txScope(t) === scope) && (!type || t.type === type) && (!cardId || (t.type === "card" && (t.meta?.cardId ?? "c1") === cardId)) && (!asset || t.asset === asset || t.toAsset === asset) && (!from || senderOf(t)?.key === from));
  };
  // narrowing beyond the chips: shown as removable pills
  const pills = [
    scope !== "all" && { key: "scope", label: SCOPES.find((x) => x.value === scope)?.label, clear: () => setScope("all") },
    !!cardId && { key: "card", label: card ? `${card.label} •• ${card.last4}` : "This card", clear: () => setCardId(undefined) },
    !!asset && { key: "asset", label: asset, clear: () => setAsset(undefined) },
    !!from && { key: "from", label: `From ${params.fromName ?? "sender"}`, clear: () => setFrom(undefined) },
  ].filter((x) => !!x);

  const clearFilter = () => {
    setCategory("all");
    setScope("all");
    setCardId(undefined);
    setAsset(undefined);
    setFrom(undefined);
  };
  const pickCategory = (v: Category) => {
    setCategory(v);
    if (v !== "card") setCardId(undefined);
  };
  const pickScope = () =>
    overlay.select({
      title: "Accounts",
      value: scope,
      options: SCOPES.map((x) => ({ value: x.value, label: x.label })),
      onSelect: (v) => setScope(v as Scope),
    });

  const header = (
    <>
      <Stack.Screen
        options={{
          title: "History",
          headerRight: () => (
            <PressableScale onPress={pickScope} hitSlop={10} accessibilityLabel={scope === "all" ? "Filter by account" : `Accounts: ${SCOPES.find((x) => x.value === scope)?.label}`} style={{ paddingHorizontal: 4 }}>
              <Icon name="sliders" size={22} color={scope !== "all" ? c.brandText : c.text} />
            </PressableScale>
          ),
        }}
      />
      <View style={{ gap: spacing.smd }}>
        <ChipRow
          options={CATEGORY_VALUES}
          value={category}
          onChange={pickCategory}
          bleed={spacing.md}
          render={(v, on) => {
            const k = CATEGORIES.find((x) => x.value === v)!;
            return (
              <>
                {k.icon && <Icon name={k.icon} size={15} color={chipText(on)} />}
                <Text variant="subhead" style={{ color: chipText(on), fontFamily: on ? "Poppins_600SemiBold" : "Poppins_500Medium" }}>
                  {k.label}
                </Text>
              </>
            );
          }}
        />
        {pills.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {pills.map((p) => (
              <PressableScale
                key={p.key}
                onPress={p.clear}
                accessibilityLabel={`Remove filter: ${p.label}`}
                style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: c.brandSoft, borderRadius: radius.full, paddingVertical: spacing.xs, paddingLeft: spacing.smd, paddingRight: spacing.sm }}
              >
                <Text variant="caption" tone="brand">
                  {p.label}
                </Text>
                <Icon name="close" size={10} color={c.brandText} weight="bold" />
              </PressableScale>
            ))}
          </View>
        )}
      </View>
    </>
  );

  const emptyFor = (cat: Category) =>
    all.length === 0 ? (
      <EmptyState icon="history" title="No transactions yet" body="Add money to get started. Sending, swapping and paying bills all show up here." action={<Button title="Deposit now" inline onPress={openAddMoneySheet} />} />
    ) : (
      <EmptyState
        icon="history"
        title="Nothing here yet"
        body={cat !== "all" || pills.length > 0 ? "Nothing matches these filters yet. Try another category or account." : "No transactions yet."}
        action={cat !== "all" || pills.length > 0 ? <Button title="Clear filter" variant="secondary" inline onPress={clearFilter} /> : undefined}
      />
    );

  // each list is virtualised: only the visible rows are mounted
  // the chips stay put; the categories are a carousel of lists (swipe, or tap a chip to slide)
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.smd }}>{header}</View>
      <SwipePager fill options={CATEGORY_VALUES} value={category} onChange={pickCategory} renderPage={(cat) => (history.data ? <TransactionSectionList items={itemsFor(cat)} empty={emptyFor(cat)} /> : history.isError ? <QueryError onRetry={() => history.refetch()} /> : <SkeletonList rows={7} style={{ paddingHorizontal: spacing.md }} />)} />
    </View>
  );
}
