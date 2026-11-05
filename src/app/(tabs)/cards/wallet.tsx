import { Stack, useLocalSearchParams } from "expo-router";
import { useWindowDimensions, View } from "react-native";
import { EmptyState, Note } from "@/components/bits";
import { Button } from "@/components/button";
import { CardThumb, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { Icon, type IconName } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { PayMark } from "@/components/pay-mark";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import type { VirtualCard } from "@/data/seed";
import { useCardsStore } from "@/stores/use-cards-store";
import { useInboxStore } from "@/stores/use-inbox-store";
import { overlay } from "@/stores/use-overlay-store";
import { toast, withLoader } from "@/stores/use-ui-store";
import { radius, spacing, useColors } from "@/theme";
import { PAY } from "@/utils/pay-platform";
import { openCardCreation } from "@/utils/verification";

const HOW: [IconName, string][] =
  PAY.id === "apple"
    ? [
        ["plusCircle", "Add a card once. It stays on this iPhone."],
        ["lock", "Double-click the side button, look at your iPhone, then hold it near the reader."],
        ["snowflake", "Freeze a card in Tribe and Apple Pay pauses it too."],
      ]
    : [
        ["plusCircle", "Add a card once. It stays on this phone."],
        ["lock", "Unlock your phone and hold it near the reader."],
        ["snowflake", "Freeze a card in Tribe and Google Pay pauses it too."],
      ];

function addToWallet(card: VirtualCard) {
  if (card.frozen) {
    toast("Unfreeze it first", "danger");
    return;
  }
  withLoader(`Adding to ${PAY.name}…`, () => useCardsStore.getState().addToWallet(card.id), 1100).then(() => {
    toast(`${card.label} added to ${PAY.name}`, "success");
    useInboxStore.getState().push({ kind: "card", title: `Added to ${PAY.name}`, body: `${card.label} •• ${card.last4} is ready to tap and pay.`, href: "/cards", badge: "check" });
  });
}

function manage(card: VirtualCard, isDefault: boolean) {
  overlay.menu({
    title: card.label,
    subtitle: `${PAY.name} · •• ${card.last4}`,
    leading: <CardThumb theme={card.theme} network={card.network} width={46} />,
    items: [
      ...(isDefault ? [] : [{ value: "default", label: "Make default", sub: "Pays first when you hold your phone to a reader", icon: "star" as const }]),
      { value: "remove", label: `Remove from ${PAY.name}`, icon: "trash", destructive: true },
    ],
    onSelect: (v) => {
      if (v === "default") {
        useCardsStore.getState().setWalletDefault(card.id);
        toast(`${card.label} is your default card`, "success");
        return;
      }
      overlay.confirm({
        icon: "trash",
        title: `Remove from ${PAY.name}?`,
        body: `${card.label} keeps working online and in Tribe. You can add it back any time.`,
        confirmLabel: "Remove",
        cancelLabel: "Keep it",
        destructive: true,
        onConfirm: () => {
          useCardsStore.getState().removeFromWallet(card.id);
          toast(`Removed from ${PAY.name}`);
        },
      });
    },
  });
}

/**
 * Wallet & payments: Apple Pay (iOS) or Google Pay (Android) for Tribe cards. Reached from the
 * glass pill on the Cards tab card. Adding is simulated here.
 * TODO(wallet): real provisioning needs PassKit in-app provisioning (iOS) and Google Pay Push
 * Provisioning (Android), both issued through the card processor.
 */
export default function WalletPayments() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const cards = useCardsStore((s) => s.cards);
  const walletDefault = useCardsStore((s) => s.walletDefault);
  const focus = cards.find((k) => k.id === id) ?? cards[0];
  const tint = useCardPalette(focus?.theme ?? "midnight");

  if (!focus) return <EmptyState icon="card" title="No card yet" body={`Create a card first, then add it to ${PAY.name}.`} action={<Button title="Get your card" inline onPress={() => openCardCreation()} />} />;

  const defaultCard = cards.find((k) => k.id === walletDefault && k.inWallet);
  const added = cards.filter((k) => k.inWallet);
  const pickDefault = () =>
    overlay.select({
      title: "Default card",
      subtitle: `${PAY.name} pays with this card unless you pick another at the reader.`,
      value: defaultCard?.id,
      options: added.map((k) => ({ value: k.id, label: k.label, sub: `•• ${k.last4}`, leading: <CardThumb theme={k.theme} network={k.network} width={46} /> })),
      onSelect: (v) => useCardsStore.getState().setWalletDefault(v),
    });

  return (
    <Screen background={tint.page}>
      <Stack.Screen options={{ headerStyle: { backgroundColor: tint.page }, contentStyle: { backgroundColor: tint.page } }} />

      {/* the card you came from, and what this page is for */}
      <View style={{ alignItems: "center", gap: spacing.md, paddingTop: spacing.sm }}>
        <VirtualCardFace card={focus} width={Math.min(width - spacing.xl * 2, 300)} />
        <View style={{ alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md }}>
          <View style={{ height: 30, paddingHorizontal: spacing.smd, borderRadius: radius.full, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
            <PayMark color={c.text} height={15} />
          </View>
          <Text variant="title" align="center">
            {focus.inWallet ? `${focus.label} is ready to tap` : `Pay with ${PAY.name}`}
          </Text>
          <Text variant="body" tone="muted" align="center">
            {focus.inWallet ? `Hold your phone near any contactless reader. ${PAY.name} uses a device-only number, so shops never see your card's.` : `Add ${focus.label} to ${PAY.wallet} and pay in shops, apps and online with your phone.`}
          </Text>
        </View>
        {!focus.inWallet && <Button title={focus.frozen ? "Unfreeze the card to add it" : `Add to ${PAY.name}`} disabled={focus.frozen} colors={focus.frozen ? undefined : { bg: tint.accent, fg: tint.accentFg }} onPress={() => addToWallet(focus)} style={{ alignSelf: "stretch" }} />}
      </View>

      <ListSection title="Your cards">
        {cards.map((k) => {
          const isDefault = k.id === defaultCard?.id;
          const status = k.inWallet ? (k.frozen ? "Paused while frozen" : isDefault ? "Added · Default" : "Added") : "Not added";
          return (
            <ListRow
              key={k.id}
              leading={<CardThumb theme={k.theme} network={k.network} width={46} />}
              title={k.label}
              subtitle={`•• ${k.last4} · ${status}`}
              accessibilityLabel={`${k.label}, ${status}. ${k.inWallet ? "Manage" : `Add to ${PAY.name}`}`}
              trailing={
                k.inWallet ? (
                  <Icon name="checkCircle" size={20} color={c.success} />
                ) : (
                  <View style={{ backgroundColor: c.text, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 5 }}>
                    <Text variant="subhead" style={{ color: c.bg }}>
                      Add
                    </Text>
                  </View>
                )
              }
              onPress={() => (k.inWallet ? manage(k, isDefault) : addToWallet(k))}
            />
          );
        })}
      </ListSection>

      {defaultCard && (
        <ListSection title="Default card" footer={`${PAY.name} pays with this card unless you pick another at the reader.`}>
          <ListRow leading={<CardThumb theme={defaultCard.theme} network={defaultCard.network} width={46} />} title={defaultCard.label} subtitle={`•• ${defaultCard.last4}`} chevron={added.length > 1} onPress={added.length > 1 ? pickDefault : undefined} />
        </ListSection>
      )}

      <ListSection title="How it works">
        {HOW.map(([icon, line]) => (
          <View key={line} style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Icon name={icon} size={15} color={c.text} />
            </View>
            <Text variant="body" style={{ flex: 1 }}>
              {line}
            </Text>
          </View>
        ))}
      </ListSection>
      <Note icon="shield">Your card details never leave Tribe. {PAY.name} keeps its own number for this phone only.</Note>
    </Screen>
  );
}
