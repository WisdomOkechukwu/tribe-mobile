import { router } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { cardLook, VirtualCardFace } from "@/components/card-face";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import type { VirtualCard } from "@/data/seed";
import { useCardsStore } from "@/stores/use-cards-store";
import { useCards } from "@/api/queries";
import { CardFaceSkeleton, QueryError, Skeleton } from "@/components/skeletons";
import { radius, shadows, spacing, useColors } from "@/theme";
import { openCardCreation } from "@/utils/verification";

const GAP = spacing.smd;
const money = (usd: number) => `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One card in the grid: the real face (no number), its name and balance underneath. */
function CardTile({ card, width, current, onPress }: { card: VirtualCard; width: number; current: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      accessibilityLabel={`${card.label}, ${cardLook(card.theme).name} ${card.network === "visa" ? "Visa" : "Mastercard"} ending ${card.last4}, ${money(card.balance)}${card.frozen ? ", frozen" : ""}${current ? ", showing now" : ""}`}
      style={{ width, gap: spacing.sm }}
    >
      <VirtualCardFace card={card} width={width} style={{ boxShadow: shadows.lift }} />
      <View style={{ paddingHorizontal: spacing.xxs, gap: spacing.xxs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {card.label}
          </Text>
          {current && <Icon name="checkCircle" size={14} color={c.brand} />}
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {money(card.balance)} · •• {card.last4}
          {card.frozen ? " · Frozen" : ""}
        </Text>
      </View>
    </PressableScale>
  );
}

/** My cards: every card at a glance as the card itself, searchable; tap one to show it on Cards. */
export default function MyCards() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const cardsQuery = useCards();
  const cards = cardsQuery.data ?? [];
  const selected = useCardsStore((s) => s.selected);
  const select = useCardsStore((s) => s.select);
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const shown = cards.filter((k) => !term || k.label.toLowerCase().includes(term) || k.last4.includes(term));
  // two columns from the real width (percent widths wrapped into one column on some phones)
  const col = Math.floor((Math.min(width, 720) - spacing.md * 2 - GAP) / 2);
  const current = selected ?? cards[0]?.id;

  return (
    <Screen>
      <Field value={q} onChangeText={setQ} placeholder="Search cards" autoCapitalize="none" leading={<Icon name="search" size={16} color={c.textMuted} />} />
      {cardsQuery.isError && !cardsQuery.data && <QueryError onRetry={() => cardsQuery.refetch()} />}
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: GAP, rowGap: spacing.lg }}>
        {!cardsQuery.data &&
          !cardsQuery.isError &&
          [0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: col, gap: spacing.sm }}>
              <CardFaceSkeleton width={col} />
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={10} />
            </View>
          ))}
        {shown.map((k) => (
          <CardTile
            key={k.id}
            card={k}
            width={col}
            current={k.id === current}
            onPress={() => {
              select(k.id);
              router.back();
            }}
          />
        ))}
        {!term && !!cardsQuery.data && (
          <PressableScale onPress={() => openCardCreation()} scaleTo={0.97} accessibilityLabel="New card" style={{ width: col, height: col / 1.586, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borderStrong, alignItems: "center", justifyContent: "center", gap: spacing.xs }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="plus" size={16} color={c.brandText} weight="bold" />
            </View>
            <Text variant="subhead" tone="brand">
              New card
            </Text>
          </PressableScale>
        )}
      </View>
      {!!term && !shown.length && (
        <Text variant="body" tone="muted" align="center">
          No cards match “{q.trim()}”.
        </Text>
      )}
    </Screen>
  );
}
