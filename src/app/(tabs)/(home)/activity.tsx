import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { EmptyState } from "@/components/bits";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { TransactionList } from "@/components/transaction-row";
import type { Transaction, TxType } from "@/data/seed";
import { openAddMoneySheet } from "@/screens/home/sheets";
import { useCardsStore } from "@/stores/use-cards-store";
import { overlay } from "@/stores/use-overlay-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { txScope, type TxScope } from "@/utils/tx";

type Tab = "all" | TxScope;
const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "local", label: "Local" },
  { value: "crypto", label: "Crypto" },
  { value: "global", label: "Global" },
];

/** The type filter (Transaction.png's filter menu), in our own picker. */
const TYPES: { value: "any" | TxType; label: string }[] = [
  { value: "any", label: "All types" },
  { value: "receive", label: "Deposits" },
  { value: "send", label: "Sends" },
  { value: "swap", label: "Swaps" },
  { value: "bill", label: "Bills" },
  { value: "giftcard", label: "Gift cards" },
  { value: "card", label: "Cards" },
  { value: "cashpoint", label: "Cashpoints" },
  { value: "referral", label: "Referrals" },
];

/**
 * History (Transaction.png): All / Local / Crypto / Global, a type filter in the header, status
 * chips on rows, and an empty state that gets you to a first deposit. `?type=card&card=c1`
 * opens it pre-filtered (Cards → All transactions).
 */
export default function History() {
  const c = useColors();
  const params = useLocalSearchParams<{ type?: TxType; card?: string; tab?: Tab }>();
  const all = useWalletStore((s) => s.transactions);
  const card = useCardsStore((s) => s.cards.find((k) => k.id === params.card));
  const [tab, setTab] = useState<Tab>(params.tab ?? "all");
  const [type, setType] = useState<"any" | TxType>(params.type ?? "any");
  const [cardId, setCardId] = useState(params.card);

  const match = (t: Transaction) => (tab === "all" || txScope(t) === tab) && (type === "any" || t.type === type) && (!cardId || t.meta?.cardId === cardId);
  const items = all.filter(match);
  const filtered = type !== "any" || !!cardId;
  const typeLabel = TYPES.find((t) => t.value === type)?.label;

  const clearFilter = () => {
    setType("any");
    setCardId(undefined);
  };
  const pickType = () =>
    overlay.select({
      title: "Show",
      value: type,
      options: TYPES.map((t) => ({ value: t.value, label: t.label })),
      onSelect: (v) => {
        setType(v as "any" | TxType);
        if (v !== "card") setCardId(undefined);
      },
    });

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "History",
          headerRight: () => (
            <PressableScale onPress={pickType} hitSlop={10} accessibilityLabel={filtered ? `Filter: ${typeLabel}` : "Filter by type"} style={{ paddingHorizontal: 4 }}>
              <Icon name="filter" size={22} color={filtered ? c.brandText : c.text} />
            </PressableScale>
          ),
        }}
      />
      <Segmented options={TABS} value={tab} onChange={setTab} />
      {filtered && (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <PressableScale
            onPress={clearFilter}
            accessibilityLabel="Clear filter"
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.brandSoft, borderRadius: radius.full, paddingVertical: 5, paddingLeft: spacing.smd, paddingRight: spacing.sm }}
          >
            <Text variant="subhead" tone="brand">
              {card && cardId ? `${card.label} •• ${card.last4}` : typeLabel}
            </Text>
            <Icon name="close" size={10} color={c.brandText} weight="bold" />
          </PressableScale>
        </View>
      )}
      {items.length ? (
        <TransactionList items={items} />
      ) : all.length === 0 ? (
        <EmptyState icon="history" title="No transactions yet" body="Add money to get started. Sending, swapping and paying bills all show up here." action={<Button title="Deposit now" inline onPress={openAddMoneySheet} />} />
      ) : (
        <EmptyState icon="history" title="Nothing here yet" body={filtered ? "Nothing matches this filter. Try another type." : `No ${tab === "all" ? "" : `${tab} `}transactions yet.`} action={filtered ? <Button title="Clear filter" variant="secondary" inline onPress={clearFilter} /> : undefined} />
      )}
    </Screen>
  );
}
