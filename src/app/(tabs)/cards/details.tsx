import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { CopyField, EmptyState, Note } from "@/components/bits";
import { Button } from "@/components/button";
import { CardBadge, cardLook, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { ListSection } from "@/components/list";
import { PrivacyGuard } from "@/components/privacy-guard";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { useCardsStore } from "@/stores/use-cards-store";
import { spacing } from "@/theme";
import { openCardCreation } from "@/utils/verification";

/**
 * Card details: the only place the card number and CVV are shown (on the face once revealed, and
 * as copyable fields), plus the billing address. Screenshots are blocked here.
 */
export default function CardDetails() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  // only a bare /cards/details falls back to the first card: a stale id must never show another card's number
  const card = useCardsStore((s) => (id ? s.cards.find((k) => k.id === id) : s.cards[0]));
  const hasCards = useCardsStore((s) => s.cards.length > 0);
  const [shown, setShown] = useState(false);
  const tint = useCardPalette(card?.theme ?? "midnight");

  if (!card && hasCards) return <EmptyState icon="card" title="This card no longer exists" body="It may have been deleted. Your other cards are on the Cards tab." />;
  if (!card) return <EmptyState icon="card" title="No card yet" body="Create your virtual card first. It takes about a minute." action={<Button title="Get your card" inline onPress={() => openCardCreation()} />} />;
  const look = cardLook(card.theme);
  const copyTint = { bg: tint.soft, fg: tint.accent };

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
          <CardBadge theme={card.theme} network={card.network} size={40} />
          <View>
            <Text variant="bodyStrong">{card.label}</Text>
            <Text variant="caption" tone="muted">
              {look.name} · {card.frozen ? "Frozen" : "Active"}
            </Text>
          </View>
        </View>
        <CopyField tint={copyTint} label="Card name" value={card.holder} />
        <CopyField tint={copyTint} label="Card number" value={shown ? card.number : `•••• •••• •••• ${card.last4}`} copyValue={card.number.replace(/\s/g, "")} mono />
        <CopyField tint={copyTint} label="CVV" value={shown ? card.cvv : "•••"} copyValue={card.cvv} mono />
        <CopyField tint={copyTint} label="Expiry date" value={card.expiry} />
        <CopyField tint={copyTint} label="Card type" value={`${card.network === "visa" ? "Visa" : "Mastercard"} · Virtual · USD`} />
      </ListSection>

      <ListSection title="Card address" inset={spacing.md} footer="Use this as the billing address when a site asks for one.">
        <CopyField tint={copyTint} label="Street" value={card.address.street} />
        <CopyField tint={copyTint} label="City" value={card.address.city} />
        <CopyField tint={copyTint} label="State" value={card.address.state} />
        <CopyField tint={copyTint} label="Postal code" value={card.address.postal} />
      </ListSection>
      <Note icon="shield">Never share your CVV. Tribe will never ask for it.</Note>
    </Screen>
  );
}
