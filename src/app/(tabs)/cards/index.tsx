import { router, Stack } from "expo-router";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { EmptyState, SectionHeader } from "@/components/bits";
import { Button } from "@/components/button";
import { CARD_THEMES, NetworkMark, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { Icon, type IconName } from "@/components/icon";
import { ListRow, ListSection, RowIcon } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TransactionList } from "@/components/transaction-row";
import type { VirtualCard } from "@/data/seed";
import { useCardsStore } from "@/stores/use-cards-store";
import { overlay } from "@/stores/use-overlay-store";
import { toast } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";

const PERKS: { icon: IconName; title: string; body: string }[] = [
  { icon: "globe", title: "Pay anywhere online", body: "Netflix, Spotify, Apple, AliExpress and any site that accepts Mastercard or Visa." },
  { icon: "swap", title: "Fund from any balance", body: "Top up in dollars from USDT, BTC, Naira or any currency you hold." },
  { icon: "snowflake", title: "Freeze in a tap", body: "Lock it the second something looks off. Unfreeze just as fast." },
];

/** No cards yet: the start of the card onboarding. */
function CardsIntro() {
  const c = useColors();
  const { width } = useWindowDimensions();
  return (
    <Screen>
      <Animated.View entering={FadeIn} style={{ alignItems: "center", marginTop: spacing.sm }}>
        <VirtualCardFace card={{ theme: "midnight", network: "mastercard", holder: "Your name", number: "5399", last4: "0000", expiry: "09/29", cvv: "", frozen: false }} width={width - spacing.md * 2} />
      </Animated.View>
      <View style={{ gap: spacing.xs, alignItems: "center" }}>
        <Text variant="title" align="center">
          A dollar card in a minute
        </Text>
        <Text variant="body" tone="muted" align="center">
          Five finishes. Mastercard or Visa. $1 to create.
        </Text>
      </View>
      <ListSection>
        {PERKS.map((p) => (
          <ListRow key={p.title} icon={p.icon} iconBg={c.brandSoft} iconTint={c.brandText} title={p.title} subtitle={p.body} />
        ))}
      </ListSection>
      <Button title="Get your card" icon="card" onPress={() => router.push("/card-new")} />
    </Screen>
  );
}

/** Freeze / unfreeze / delete — our own dialogs, then a success notice. */
function freeze(card: VirtualCard) {
  const toggle = useCardsStore.getState().toggleFreeze;
  if (card.frozen)
    overlay.confirm({
      icon: "snowflake",
      title: "Unfreeze your card?",
      body: "Your card will be available for spending and purchases again.",
      confirmLabel: "Unfreeze",
      cancelLabel: "Back",
      onConfirm: () => {
        toggle(card.id);
        overlay.notice({ icon: "snowflake", title: "Card unfrozen", body: "Your card has been reactivated. Happy spending." });
      },
    });
  else
    overlay.confirm({
      icon: "snowflake",
      title: "Freeze your card?",
      body: "You won't be able to make transactions until you unfreeze it.",
      confirmLabel: "Freeze",
      cancelLabel: "Keep active",
      onConfirm: () => {
        toggle(card.id);
        overlay.notice({ icon: "snowflake", tone: "brand", title: "Card frozen", body: "Your card is now frozen. You can unfreeze it anytime." });
      },
    });
}

function remove(card: VirtualCard) {
  overlay.confirm({
    icon: "trash",
    title: "Delete your card",
    body: `You'll lose access to this card. ${card.balance > 0 ? `Its $${card.balance.toFixed(2)} balance and any pending refunds go to your USD wallet. ` : ""}Are you sure?`,
    confirmLabel: "Delete card",
    cancelLabel: "Keep it",
    destructive: true,
    onConfirm: () => {
      const gone = useCardsStore.getState().deleteCard(card.id);
      if (gone && gone.balance > 0)
        useWalletStore.getState().record({ type: "card", asset: "USD", amount: gone.balance, direction: "in", title: "Card deleted · refund", subtitle: `${gone.label} •• ${gone.last4}`, meta: { cardId: gone.id } }, { USD: gone.balance });
      overlay.notice({ icon: "checkCircle", title: "Card deleted", body: gone && gone.balance > 0 ? `$${gone.balance.toFixed(2)} is back in your USD wallet.` : "It's gone for good." });
    },
  });
}

function pickLimit(card: VirtualCard) {
  overlay.select({
    title: "Monthly spending limit",
    subtitle: `$${card.spentThisMonth.toFixed(2)} spent this month`,
    value: String(card.monthlyLimit),
    options: [250, 500, 1_000, 2_500, 5_000].map((v) => ({ value: String(v), label: `$${v.toLocaleString()} a month` })),
    onSelect: (v) => {
      useCardsStore.getState().setLimit(card.id, Number(v));
      toast(`Limit set to $${Number(v).toLocaleString()}`);
    },
  });
}

function replace() {
  overlay.confirm({
    icon: "refresh",
    title: "Replace this card?",
    body: "You'll get a new number, expiry and CVV. Update it anywhere it's saved.",
    confirmLabel: "Replace",
    onConfirm: () => toast("Replacement requested"),
  });
}

/** Cards (Virtual Card.png layout): switcher + menu, holder row, card, Fund · Withdraw · Details. */
export default function Cards() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const cards = useCardsStore((s) => s.cards);
  const transactions = useWalletStore((s) => s.transactions);
  const selected = useCardsStore((s) => s.selected);
  const setSelected = useCardsStore((s) => s.select);
  // the page takes on the selected card's colours
  const themeKey = (cards.find((k) => k.id === selected) ?? cards[0])?.theme ?? "midnight";
  const tint = useCardPalette(themeKey);

  const header = (
    <Stack.Screen
      options={{
        headerStyle: { backgroundColor: cards.length ? tint.page : c.bg },
        headerLargeStyle: { backgroundColor: cards.length ? tint.page : c.bg },
        contentStyle: { backgroundColor: cards.length ? tint.page : c.bg },
        headerRight: () => (
          <PressableScale onPress={() => router.push("/card-new")} accessibilityLabel="New card" style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.text, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 6, marginRight: Platform.OS === "web" ? spacing.md : 0 }}>
            <Icon name="plusCircle" size={13} color={c.bg} />
            <Text variant="subhead" style={{ color: c.bg }}>
              New card
            </Text>
          </PressableScale>
        ),
      }}
    />
  );

  if (!cards.length)
    return (
      <>
        {header}
        <CardsIntro />
      </>
    );

  const card = cards.find((k) => k.id === selected) ?? cards[0];
  const t = CARD_THEMES[card.theme];
  const cardTx = transactions.filter((tx) => tx.type === "card" && (tx.meta?.cardId ?? "c1") === card.id);
  const frozenToast = () => toast("Unfreeze your card first", "danger");

  const switchCard = () =>
    overlay.select({
      title: "Your cards",
      value: card.id,
      options: cards.map((k) => ({
        value: k.id,
        label: k.label,
        sub: `${CARD_THEMES[k.theme].name} ${k.network === "visa" ? "Visa" : "Mastercard"} •• ${k.last4}${k.frozen ? " · frozen" : ""}`,
        trailing: `$${k.balance.toFixed(2)}`,
        leading: <View style={{ width: 40, height: 26, borderRadius: 5, backgroundColor: CARD_THEMES[k.theme].bg, borderWidth: 1, borderColor: c.border }} />,
      })),
      onSelect: setSelected,
    });

  const menu = () =>
    overlay.select({
      title: card.label,
      subtitle: `•• ${card.last4}`,
      options: [
        { value: "freeze", label: card.frozen ? "Unfreeze card" : "Freeze card", leading: <RowIcon name="snowflake" tint={c.brandText} bg={c.brandSoft} /> },
        { value: "details", label: "Card details", leading: <RowIcon name="eye" tint={c.brandText} bg={c.brandSoft} /> },
        { value: "online", label: card.online ? "Turn off online payments" : "Turn on online payments", sub: "Websites, apps and subscriptions", leading: <RowIcon name="globe" tint={c.brandText} bg={c.brandSoft} /> },
        { value: "limit", label: "Monthly limit", sub: `$${card.monthlyLimit.toLocaleString()} · $${card.spentThisMonth.toFixed(2)} spent this month`, leading: <RowIcon name="gauge" tint={c.brandText} bg={c.brandSoft} /> },
        { value: "replace", label: "Replace card", sub: "New number, same balance", leading: <RowIcon name="refresh" tint={c.text} bg={c.surfaceAlt} /> },
        { value: "delete", label: "Delete card", destructive: true, leading: <RowIcon name="trash" tint={c.danger} bg={c.dangerSoft} /> },
      ],
      onSelect: (v) => {
        if (v === "freeze") freeze(card);
        else if (v === "delete") remove(card);
        else if (v === "online") {
          useCardsStore.getState().toggleOnline(card.id);
          toast(card.online ? "Online payments off" : "Online payments on");
        } else if (v === "limit") pickLimit(card);
        else if (v === "replace") replace();
        else router.push({ pathname: "/cards/details", params: { id: card.id } });
      },
    });

  return (
    <>
      {header}
      <Screen background={tint.page}>
        {/* card switcher + menu */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={switchCard} accessibilityRole="button" accessibilityLabel={`Card: ${card.label}. Switch card`} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}>
            <Text variant="title">{card.label}</Text>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: tint.accent, alignItems: "center", justifyContent: "center" }}>
              <Icon name="chevronDown" size={10} color={tint.accentFg} weight="bold" />
            </View>
          </Pressable>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {cards.length > 1 && (
              <PressableScale onPress={() => router.push("/cards/all")} accessibilityLabel="My cards" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
                <Icon name="pay" size={15} color={c.text} />
              </PressableScale>
            )}
            <PressableScale onPress={menu} accessibilityLabel="Card options" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
              <Icon name="more" size={16} color={c.text} />
            </PressableScale>
          </View>
        </View>

        {/* holder row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
            <NetworkMark network={card.network} color={c.text} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{card.holder}</Text>
            <Pressable onPress={() => router.push({ pathname: "/cards/details", params: { id: card.id } })} hitSlop={8}>
              <Text variant="caption" style={{ color: tint.accent }}>
                View card address ›
              </Text>
            </Pressable>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text variant="caption" tone="muted">
              Available bal.
            </Text>
            <Text variant="amount">USD {card.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        </View>

        <Animated.View key={card.id} entering={FadeIn.duration(220)}>
          <PressableScale scaleTo={0.98} onPress={() => router.push({ pathname: "/cards/details", params: { id: card.id } })} accessibilityLabel={`${t.name} card ending ${card.last4}. Open card details`}>
            <VirtualCardFace card={card} width={width - spacing.md * 2} />
          </PressableScale>
        </Animated.View>

        {/* Fund · Withdraw · Card details */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button title="Fund" size="md" style={{ flex: 1 }} colors={{ bg: tint.accent, fg: tint.accentFg }} onPress={() => (card.frozen ? frozenToast() : router.push({ pathname: "/card-fund", params: { id: card.id } }))} />
          <Button title="Withdraw" size="md" style={{ flex: 1 }} colors={{ bg: tint.soft, fg: c.text }} disabled={card.balance <= 0} onPress={() => (card.frozen ? frozenToast() : router.push({ pathname: "/card-withdraw", params: { id: card.id } }))} />
          <Button title="Details" size="md" style={{ flex: 1 }} colors={{ bg: tint.soft, fg: c.text }} onPress={() => router.push({ pathname: "/cards/details", params: { id: card.id } })} />
        </View>

        <ListSection>
          <ListRow
            leading={
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.text, alignItems: "center", justifyContent: "center" }}>
                <Icon name="wallet" size={17} color={c.bg} />
              </View>
            }
            title={Platform.OS === "android" ? "Add to Google Wallet" : "Add to Apple Pay"}
            subtitle="For convenient one-tap payments"
            trailing={
              <View style={{ backgroundColor: c.text, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 5 }}>
                <Text variant="subhead" style={{ color: c.bg }}>
                  Add
                </Text>
              </View>
            }
            onPress={() => toast(Platform.OS === "android" ? "Opens Google Wallet in the full app" : "Opens Apple Wallet in the full app")}
          />
        </ListSection>

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Recent" action={cardTx.length > 3 ? "All transactions" : undefined} onAction={() => router.push({ pathname: "/activity", params: { type: "card", card: card.id } }, { withAnchor: true })} />
          {cardTx.length ? <TransactionList items={cardTx.slice(0, 3)} grouped={false} /> : <EmptyState icon="card" title="No transactions yet" body="Use your card to shop, subscribe and pay online with ease." />}
        </View>
      </Screen>
    </>
  );
}
