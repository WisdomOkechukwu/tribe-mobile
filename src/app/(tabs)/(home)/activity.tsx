import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { EmptyState } from "@/components/bits";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { TransactionSectionList } from "@/components/transaction-row";
import type { AssetCode } from "@/data/assets";
import type { Transaction, TxType } from "@/data/seed";
import { openAddMoneySheet } from "@/screens/home/sheets";
import { useCardsStore } from "@/stores/use-cards-store";
import { overlay } from "@/stores/use-overlay-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { senderOf, txScope, type TxScope } from "@/utils/tx";

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
  const params = useLocalSearchParams<{ type?: TxType; card?: string; tab?: Tab; asset?: AssetCode; from?: string; fromName?: string }>();
  const all = useWalletStore((s) => s.transactions);
  const card = useCardsStore((s) => s.cards.find((k) => k.id === params.card));
  const [tab, setTab] = useState<Tab>(params.tab ?? "all");
  const [type, setType] = useState<"any" | TxType>(params.type ?? "any");
  const [cardId, setCardId] = useState(params.card);
  const [asset, setAsset] = useState(params.asset);
  // receipt → "More from…": every deposit from one sender
  const [from, setFrom] = useState(params.from);

  const match = (t: Transaction) =>
    (tab === "all" || txScope(t) === tab) && (type === "any" || t.type === type) && (!cardId || t.meta?.cardId === cardId) && (!asset || t.asset === asset || t.toAsset === asset) && (!from || senderOf(t)?.key === from);
  const items = all.filter(match);
  const filtered = type !== "any" || !!cardId || !!asset || !!from;
  const typeLabel = TYPES.find((t) => t.value === type)?.label;

  const clearFilter = () => {
    setType("any");
    setCardId(undefined);
    setAsset(undefined);
    setFrom(undefined);
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

  const header = (
    <>
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
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: c.brandSoft, borderRadius: radius.full, paddingVertical: spacing.xs, paddingLeft: spacing.smd, paddingRight: spacing.sm }}
          >
            <Text variant="subhead" tone="brand">
              {from ? `From ${params.fromName ?? "sender"}` : card && cardId ? `${card.label} •• ${card.last4}` : asset && type === "any" ? asset : typeLabel}
            </Text>
            <Icon name="close" size={10} color={c.brandText} weight="bold" />
          </PressableScale>
        </View>
      )}
    </>
  );

  const empty =
    all.length === 0 ? (
      <EmptyState icon="history" title="No transactions yet" body="Add money to get started. Sending, swapping and paying bills all show up here." action={<Button title="Deposit now" inline onPress={openAddMoneySheet} />} />
    ) : (
      <EmptyState icon="history" title="Nothing here yet" body={filtered ? "Nothing matches this filter. Try another type." : `No ${tab === "all" ? "" : `${tab} `}transactions yet.`} action={filtered ? <Button title="Clear filter" variant="secondary" inline onPress={clearFilter} /> : undefined} />
    );

  // virtualised: only the visible rows are mounted, however long the history gets
  return <TransactionSectionList items={items} header={header} empty={empty} />;
}
