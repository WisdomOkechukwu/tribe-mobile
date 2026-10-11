import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { CopyField, EmptyState, Note } from "@/components/bits";
import { Button } from "@/components/button";
import { CARD_THEMES, NetworkMark, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { ListSection } from "@/components/list";
import { PrivacyGuard } from "@/components/privacy-guard";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { useCardsStore } from "@/stores/use-cards-store";
import { spacing, useColors } from "@/theme";

/** Card details: everything needed to pay online, each copyable; plus the billing address. */
export default function CardDetails() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const card = useCardsStore((s) => s.cards.find((k) => k.id === id) ?? s.cards[0]);
  const [shown, setShown] = useState(false);
  const tint = useCardPalette(card?.theme ?? "midnight");

  if (!card) return <EmptyState icon="card" title="No card" body="Create a card first." />;
  const t = CARD_THEMES[card.theme];

  return (
    <Screen background={tint.page}>
      <Stack.Screen options={{ headerStyle: { backgroundColor: tint.page }, contentStyle: { backgroundColor: tint.page } }} />
      <PrivacyGuard />
      <View style={{ alignItems: "center" }}>
        <VirtualCardFace card={card} revealed={shown} width={width - spacing.md * 2} />
      </View>
      <Button title={shown ? "Hide details" : "Show card number & CVV"} icon={shown ? "eyeOff" : "eye"} size="md" colors={{ bg: tint.accent, fg: tint.accentFg }} onPress={() => setShown((v) => !v)} />

      <ListSection title="Card details" inset={spacing.md}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, padding: spacing.md }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border }}>
            <NetworkMark network={card.network} color={t.fg} size={20} />
          </View>
          <View>
            <Text variant="bodyStrong">{card.label}</Text>
            <Text variant="caption" tone="muted">
              {t.name} · {card.frozen ? "Frozen" : "Active"}
            </Text>
          </View>
        </View>
        <CopyField label="Card name" value={card.holder} />
        <CopyField label="Card number" value={shown ? card.number : `•••• •••• •••• ${card.last4}`} copyValue={card.number.replace(/\s/g, "")} mono />
        <CopyField label="CVV" value={shown ? card.cvv : "•••"} copyValue={card.cvv} mono />
        <CopyField label="Expiry date" value={card.expiry} />
        <CopyField label="Card type" value={`${card.network === "visa" ? "Visa" : "Mastercard"} · Virtual · USD`} />
      </ListSection>

      <ListSection title="Card address" inset={spacing.md} footer="Use this as the billing address when a site asks for one.">
        <CopyField label="Street" value={card.address.street} />
        <CopyField label="City" value={card.address.city} />
        <CopyField label="State" value={card.address.state} />
        <CopyField label="Postal code" value={card.address.postal} />
      </ListSection>
      <Note icon="shield">Never share your CVV. Tribe will never ask for it.</Note>
    </Screen>
  );
}
