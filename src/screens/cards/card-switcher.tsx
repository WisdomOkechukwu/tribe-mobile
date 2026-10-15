import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, View } from "react-native";
import { CardThumb } from "@/components/card-face";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { useCardsStore } from "@/stores/use-cards-store";
import { overlay } from "@/stores/use-overlay-store";
import { radius, spacing, useColors } from "@/theme";
import { openCardCreation } from "@/utils/verification";

const THUMB = 52;
const money = (usd: number) => `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CardSwitcher({ selected, close, onSelect }: { selected: string; close: (after?: () => void) => void; onSelect: (id: string) => void }) {
  const c = useColors();
  const cards = useCardsStore((s) => s.cards);
  const divider = <View style={{ height: 1, backgroundColor: c.border, marginLeft: spacing.md + THUMB + spacing.smd }} />;
  return (
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.sm }}>
      <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
        {cards.map((k, i) => {
          const on = k.id === selected;
          const network = k.network === "visa" ? "Visa" : "Mastercard";
          return (
            <Pressable
              key={k.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${k.label}, ${network} ending ${k.last4}, ${money(k.balance)}${k.frozen ? ", frozen" : ""}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                close(() => onSelect(k.id));
              }}
            >
              {({ pressed }) => (
                <View>
                  {i > 0 && divider}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, minHeight: 66, paddingVertical: spacing.sm, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
                    <CardThumb theme={k.theme} network={k.network} width={THUMB} />
                    <View style={{ flex: 1, gap: spacing.xxs }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {k.label}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                        {k.frozen && <Icon name="snowflake" size={11} color={c.textMuted} />}
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          {k.frozen ? "Frozen · " : ""}
                          {network} •• {k.last4}
                        </Text>
                      </View>
                    </View>
                    <Text variant="amount">{money(k.balance)}</Text>
                    {/* only the card you're on is marked — no empty radios */}
                    <View style={{ width: 22, alignItems: "flex-end" }}>{on && <Icon name="checkCircle" size={20} color={c.brand} />}</View>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="button" accessibilityLabel="New card" onPress={() => close(() => openCardCreation())}>
          {({ pressed }) => (
            <View>
              {divider}
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, minHeight: 62, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
                <View style={{ width: THUMB, height: Math.round(THUMB / 1.586), borderRadius: 6, borderCurve: "continuous", borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="plus" size={14} color={c.brandText} weight="bold" />
                </View>
                <Text variant="bodyStrong" tone="brand" style={{ flex: 1 }}>
                  New card
                </Text>
              </View>
            </View>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

/** "Your cards": every card as a mini card with its balance; the one you're on carries the check. */
export function openCardSwitcher({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  overlay.sheet({ title: "Your cards", content: (close) => <CardSwitcher selected={selected} close={close} onSelect={onSelect} /> });
}
