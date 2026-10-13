import { router, Stack } from "expo-router";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { EmptyState, SectionHeader } from "@/components/bits";
import { Button } from "@/components/button";
import { CARD_THEMES, NetworkMark, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { Icon } from "@/components/icon";
import { ListRow, ListSection, RowIcon } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TransactionList } from "@/components/transaction-row";
import type { CardTheme, VirtualCard } from "@/data/seed";
import { giftBrandById } from "@/data/catalog";
import { GiftMark } from "@/components/brand-tiles";
import { CoinIcon } from "@/components/coin-icon";
import { useCardsStore } from "@/stores/use-cards-store";
import { overlay } from "@/stores/use-overlay-store";
import { toast } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { palette, radius, spacing, useColors } from "@/theme";
import { openCardCreation } from "@/utils/verification";


// the real card face (what you get), three finishes fanned: two behind, Midnight in front
const FAN: { theme: CardTheme; rotate: string; x: number; y: number }[] = [
  { theme: "lime", rotate: "-14deg", x: -26, y: -34 },
  { theme: "sunset", rotate: "9deg", x: 26, y: -16 },
  { theme: "midnight", rotate: "-3deg", x: 0, y: 16 },
];

/** No cards yet: the start of card creation — a fan of finishes, what you get, how it goes. */
function CardsIntro() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const steps = [
    { title: "Pick a finish", body: "Seven looks, from Midnight to Lime." },
    { title: "Choose Mastercard or Visa", body: "Both work almost everywhere online." },
    { title: "Name it and fund it", body: "Top up in dollars from any balance. $1 to create." },
    { title: "Spend", body: "Your card is ready the second you confirm." },
  ];
  return (
    <Screen>
      {/* three finishes of the real (landscape) card, fanned and springing in one after another */}
      <View style={{ height: 270, alignItems: "center", justifyContent: "center", marginTop: spacing.xl }}>
        {FAN.map((f, i) => (
          <Animated.View key={f.theme} entering={ZoomIn.delay(i * 110).springify().damping(13)} style={{ position: "absolute" }}>
            <View style={{ transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: f.rotate }] }}>
              <VirtualCardFace card={{ theme: f.theme, network: i === 1 ? "visa" : "mastercard", holder: "Your name", number: i === 1 ? "4532" : "5399", last4: "4821", expiry: "09/29", cvv: "", frozen: false }} width={Math.min(width - spacing.md * 2 - 40, 300)} />
            </View>
          </Animated.View>
        ))}
      </View>
      <View style={{ gap: spacing.sm, alignItems: "center", paddingHorizontal: spacing.md }}>
        <Text variant="title" align="center">
          A dollar card in a minute
        </Text>
        <Text variant="body" tone="muted" align="center">
          Seven finishes. Mastercard or Visa. $1 to create.
        </Text>
      </View>
      {/* how it goes: a vertical stepper — each stop with what happens there; Verify only if needed */}
      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          How it goes
        </Text>
        <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
          {steps.map((step, i) => {
            const last = i === steps.length - 1;
            return (
              <View key={step.title} style={{ flexDirection: "row", gap: spacing.smd }}>
                {/* the dot, and the line down to the next one */}
                <View style={{ alignItems: "center", width: 28 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: last ? palette.orange[500] : c.brand, alignItems: "center", justifyContent: "center" }}>
                    {last ? (
                      <Icon name="check" size={12} color="#fff" weight="bold" />
                    ) : (
                      <Text variant="caption" style={{ color: c.onBrand, fontFamily: "Poppins_600SemiBold" }}>
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  {!last && <View style={{ flex: 1, width: 2, minHeight: spacing.md, borderRadius: 1, backgroundColor: c.brandSoft, marginVertical: spacing.xs }} />}
                </View>
                <View style={{ flex: 1, gap: spacing.xxs, paddingTop: spacing.xs, paddingBottom: last ? 0 : spacing.md }}>
                  <Text variant="bodyStrong">{step.title}</Text>
                  <Text variant="caption" tone="muted">
                    {step.body}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* what you get, as a bento: one big brand tile, two smaller ones */}
      <View style={{ gap: spacing.smd }}>
        <View style={{ backgroundColor: c.brand, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.mdl, gap: spacing.md, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row" }}>
              {["netflix", "spotify", "apple", "googleplay"].map((id, i) => (
                <View key={id} style={{ marginLeft: i ? -10 : 0, borderRadius: 22, borderWidth: 2, borderColor: c.brand, zIndex: 4 - i }}>
                  <GiftMark brand={giftBrandById(id)} size={38} />
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
              <Text variant="caption" style={{ color: "#fff", fontFamily: "Poppins_600SemiBold" }}>
                Mastercard · Visa
              </Text>
            </View>
          </View>
          <View style={{ gap: spacing.xs }}>
            <Text variant="title" style={{ color: c.onBrand }}>
              Pay anywhere online
            </Text>
            <Text variant="caption" style={{ color: "rgba(255,255,255,0.82)" }}>
              Netflix, Spotify, Apple, AliExpress, and any site that takes cards.
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.smd }}>
          <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: "row" }}>
              {(["USDT", "BTC", "NGN"] as const).map((code, i) => (
                <View key={code} style={{ marginLeft: i ? -10 : 0, borderRadius: 18, borderWidth: 2, borderColor: c.surface, zIndex: 3 - i }}>
                  <CoinIcon code={code} size={30} />
                </View>
              ))}
            </View>
            <View style={{ gap: spacing.xxs }}>
              <Text variant="bodyStrong">Fund from anything</Text>
              <Text variant="caption" tone="muted">
                USDT, BTC, Naira or any balance.
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="snowflake" size={16} color={c.brandText} />
            </View>
            <View style={{ gap: spacing.xxs }}>
              <Text variant="bodyStrong">Freeze in a tap</Text>
              <Text variant="caption" tone="muted">
                Lock it the second something looks off.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Button title="Get your card" icon="card" onPress={() => openCardCreation()} />
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
        // no card yet: the intro's "Get your card" is the one way in, so no header shortcut
        headerRight: () =>
          cards.length ? (
            <PressableScale onPress={() => openCardCreation()} accessibilityLabel="New card" style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: c.text, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.sm, marginRight: Platform.OS === "web" ? spacing.md : 0 }}>
              <Icon name="plusCircle" size={13} color={c.bg} />
              <Text variant="subhead" style={{ color: c.bg }}>
                New card
              </Text>
            </PressableScale>
          ) : null,
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
          <Pressable onPress={switchCard} accessibilityRole="button" accessibilityLabel={`Card: ${card.label}. Switch card`} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.sm, opacity: pressed ? 0.6 : 1 })}>
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
          <View style={{ flex: 1, gap: spacing.xxs }}>
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
