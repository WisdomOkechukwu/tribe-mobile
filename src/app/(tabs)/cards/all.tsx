import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { CardBadge, CARD_THEMES, useCardPalette } from "@/components/card-face";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import type { VirtualCard } from "@/data/seed";
import { useCardsStore } from "@/stores/use-cards-store";
import { radius, spacing, useColors } from "@/theme";
import { openCardCreation } from "@/utils/verification";

function Tile({ card, onPress }: { card: VirtualCard; onPress: () => void }) {
  const c = useColors();
  const tint = useCardPalette(card.theme);
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${card.label}, ${CARD_THEMES[card.theme].name} ending ${card.last4}, $${card.balance.toFixed(2)}${card.frozen ? ", frozen" : ""}`} style={{ width: "48.5%", backgroundColor: tint.page, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.smd, borderWidth: 1, borderColor: c.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <CardBadge theme={card.theme} network={card.network} size={36} />
        {card.frozen ? <Icon name="snowflake" size={15} color={c.textMuted} /> : <Icon name="chevron" size={11} color={c.textSubtle} weight="bold" />}
      </View>
      <View>
        <Text variant="bodyStrong" numberOfLines={1}>
          {card.label}
        </Text>
        <Text variant="caption" tone="muted">
          USD {card.balance.toFixed(2)} · •• {card.last4}
        </Text>
      </View>
    </PressableScale>
  );
}

/** My cards (Virtual Card.png): every card at a glance, searchable; tap one to open it. */
export default function MyCards() {
  const c = useColors();
  const cards = useCardsStore((s) => s.cards);
  const select = useCardsStore((s) => s.select);
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const shown = cards.filter((k) => !term || k.label.toLowerCase().includes(term) || k.last4.includes(term));
  return (
    <Screen>
      <Field value={q} onChangeText={setQ} placeholder="Search cards" autoCapitalize="none" leading={<Icon name="search" size={16} color={c.textMuted} />} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.smd, justifyContent: "space-between" }}>
        {shown.map((k) => (
          <Tile
            key={k.id}
            card={k}
            onPress={() => {
              select(k.id);
              router.back();
            }}
          />
        ))}
        <PressableScale onPress={() => openCardCreation()} accessibilityLabel="New card" style={{ width: "48.5%", minHeight: 118, borderRadius: radius.group, borderCurve: "continuous", borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borderStrong, alignItems: "center", justifyContent: "center", gap: spacing.sm }}>
          <Icon name="plusCircle" size={22} color={c.brandText} />
          <Text variant="subhead" tone="brand">
            New card
          </Text>
        </PressableScale>
      </View>
    </Screen>
  );
}
