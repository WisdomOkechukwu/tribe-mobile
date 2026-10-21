import { router, Stack } from "expo-router";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { EmptyState, SectionHeader } from "@/components/bits";
import { Button } from "@/components/button";
import { cardLook, MAX_FACE_W, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { CircleAction, CircleActionRow } from "@/components/circle-action";
import { Icon } from "@/components/icon";
import { PayMark } from "@/components/pay-mark";
import { ListRow, ListSection } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TransactionList } from "@/components/transaction-row";
import { CARD_MIN_TOPUP_USD, type CardTheme } from "@/data/seed";
import { giftBrandById } from "@/data/catalog";
import { GiftMark } from "@/components/brand-tiles";
import { CoinIcon } from "@/components/coin-icon";
import { openDeleteSheet, openFreezeSheet } from "@/screens/cards/card-sheets";
import { openCardSwitcher } from "@/screens/cards/card-switcher";
import { useCardsStore } from "@/stores/use-cards-store";
import { toast } from "@/stores/use-ui-store";
import { useCards, useTransactions } from "@/api/queries";
import { CardFaceSkeleton, Loaded, QueryError, Skeleton, SkeletonList } from "@/components/skeletons";
import { palette, radius, spacing, useColors } from "@/theme";
import { PAY } from "@/utils/pay-platform";
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
    { title: "Pick a finish", body: "Seven looks, or design your own." },
    { title: "Choose Mastercard or Visa", body: "Both work almost everywhere online." },
    { title: "Name it and fund it", body: `Top up at least $${CARD_MIN_TOPUP_USD} from any balance. $1 to create.` },
    { title: "Spend", body: "Your card is ready the second you confirm." },
    { title: `Add it to ${PAY.name}`, body: `Tap the ${PAY.name} mark on your card. We'll take you straight to adding it to ${PAY.wallet}.` },
  ];
  return (
    <Screen>
      {/* three finishes of the real (landscape) card, fanned and springing in one after another */}
      <View style={{ height: 270, alignItems: "center", justifyContent: "center", marginTop: spacing.xl }}>
        {FAN.map((f, i) => (
          <Animated.View key={f.theme} entering={ZoomIn.delay(i * 110).springify().damping(13)} style={{ position: "absolute" }}>
            <View style={{ transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: f.rotate }] }}>
              <VirtualCardFace card={{ theme: f.theme, network: i === 1 ? "visa" : "mastercard", holder: "Your name" }} pill={i === FAN.length - 1} width={Math.min(width - spacing.md * 2 - 40, 300)} />
            </View>
          </Animated.View>
        ))}
      </View>
      <View style={{ gap: spacing.sm, alignItems: "center", paddingHorizontal: spacing.md }}>
        <Text variant="title" align="center">
          A dollar card in a minute
        </Text>
        <Text variant="body" tone="muted" align="center">
          Seven finishes, or make your own. Mastercard or Visa. $1 to create.
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
        {/* tap-to-pay: the wallet mark on the card is the way in */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md }}>
          <View>
            <VirtualCardFace card={{ theme: "midnight", network: "mastercard" }} width={150} />
            {/* a tap ring around the wallet mark: that's the button */}
            <View pointerEvents="none" style={{ position: "absolute", top: -3, right: 2, width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: c.accent }} />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={{ alignSelf: "flex-start", backgroundColor: c.text, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
              <PayMark color={c.bg} height={12} />
            </View>
            <Text variant="bodyStrong">Tap to add to {PAY.name}</Text>
            <Text variant="caption" tone="muted">
              Your card carries the {PAY.name} mark. Tap it and we&apos;ll walk you through adding the card to {PAY.wallet}.
            </Text>
          </View>
        </View>
      </View>

      <Button title="Get your card" icon="card" onPress={() => openCardCreation()} />
    </Screen>
  );
}

/** The Cards page while cards load: name, balance, the card, the action row, Recent. */
function CardsSkeleton({ width }: { width: number }) {
  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <Skeleton width={150} height={24} />
        <Skeleton width={90} height={12} />
        <Skeleton width={160} height={34} />
      </View>
      <CardFaceSkeleton width={width} />
      <View style={{ flexDirection: "row", justifyContent: "space-around", alignSelf: "center", width: "100%", maxWidth: MAX_FACE_W }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ alignItems: "center", gap: spacing.sm }}>
            <Skeleton width={52} height={52} radius={26} />
            <Skeleton width={44} height={10} />
          </View>
        ))}
      </View>
      <SkeletonList title="Recent" rows={3} />
    </Screen>
  );
}

const money = (usd: number) => usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Cards: the card you're on (switch it from its name, or see them all), its balance, the card
 * itself with the glass Apple Pay / Google Pay pill, and Fund · Withdraw · Details · Freeze.
 */
export default function Cards() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const cardsQuery = useCards();
  const history = useTransactions();
  const cards = cardsQuery.data ?? [];
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

  if (!cardsQuery.data)
    return (
      <>
        {header}
        {cardsQuery.isError ? (
          <Screen>
            <QueryError onRetry={() => cardsQuery.refetch()} />
          </Screen>
        ) : (
          <CardsSkeleton width={width - spacing.md * 2} />
        )}
      </>
    );

  if (!cards.length)
    return (
      <>
        {header}
        <CardsIntro />
      </>
    );

  const card = cards.find((k) => k.id === selected) ?? cards[0];
  // this card's transactions, newest first; Recent shows three, History has the rest
  const cardTx = (history.data ?? []).filter((tx) => tx.type === "card" && (tx.meta?.cardId ?? "c1") === card.id).sort((a, b) => b.date.localeCompare(a.date));
  const viewAll = () => router.push({ pathname: "/activity", params: { type: "card", card: card.id } }, { withAnchor: true });
  const frozenToast = () => toast("Unfreeze your card first", "danger");
  const openDetails = () => router.push({ pathname: "/cards/details", params: { id: card.id } });

  const soft = { bg: c.surface, fg: c.text };

  return (
    <>
      {header}
      <Screen background={tint.page}>
        {/* which card, and how much is on it */}
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={() => openCardSwitcher({ selected: card.id, onSelect: setSelected })} accessibilityRole="button" accessibilityLabel={`Card: ${card.label}. Switch card`} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.sm, opacity: pressed ? 0.6 : 1, flexShrink: 1 })}>
              <Text variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
                {card.label}
              </Text>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: tint.accent, alignItems: "center", justifyContent: "center" }}>
                <Icon name="chevronDown" size={10} color={tint.accentFg} weight="bold" />
              </View>
            </Pressable>
            {cards.length > 1 && (
              <PressableScale onPress={() => router.push("/cards/all")} accessibilityLabel="My cards" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
                <Icon name="pay" size={15} color={c.text} />
              </PressableScale>
            )}
          </View>
          <View accessible accessibilityLabel={`Available balance ${money(card.balance)} US dollars`}>
            <Text variant="caption" tone="muted">
              Available balance
            </Text>
            <Text variant="largeTitle" adjustsFontSizeToFit numberOfLines={1}>
              ${money(card.balance)}
            </Text>
          </View>
        </View>

        <Animated.View key={card.id} entering={FadeIn.duration(220)} style={{ alignItems: "center" }}>
          <VirtualCardFace card={card} width={width - spacing.md * 2} onPress={openDetails} onWalletPress={() => router.push({ pathname: "/cards/wallet", params: { id: card.id } })} />
        </Animated.View>

        {/* Fund · Withdraw · Details · Freeze */}
        <CircleActionRow>
          <CircleAction icon="add" label="Fund" colors={{ bg: tint.accent, fg: tint.accentFg }} dimmed={card.frozen} onPress={() => (card.frozen ? frozenToast() : router.push({ pathname: "/card-fund", params: { id: card.id } }))} />
          <CircleAction
            glyph="outgoing"
            label="Withdraw"
            colors={soft}
            dimmed={card.frozen || card.balance <= 0}
            onPress={() => (card.frozen ? frozenToast() : card.balance <= 0 ? toast("Nothing on this card to withdraw yet") : router.push({ pathname: "/card-withdraw", params: { id: card.id } }))}
          />
          <CircleAction icon="eye" label="Details" colors={soft} onPress={openDetails} />
          <CircleAction icon="snowflake" label={card.frozen ? "Unfreeze" : "Freeze"} colors={card.frozen ? { bg: tint.soft, fg: tint.accent } : soft} onPress={() => openFreezeSheet(card)} />
        </CircleActionRow>

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Recent" action={cardTx.length ? "View all" : undefined} onAction={viewAll} actionColor={tint.accent} />
          <Loaded query={history} skeleton={<SkeletonList rows={3} />}>
            {() => (cardTx.length ? <TransactionList items={cardTx.slice(0, 3)} grouped={false} /> : <EmptyState icon="card" title="No transactions yet" body="Use your card to shop, subscribe and pay online with ease." />)}
          </Loaded>
          {cardTx.length > 3 && (
            <PressableScale onPress={viewAll} accessibilityRole="button" style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.xs }}>
              <Text variant="subhead">See all {cardTx.length} transactions</Text>
              <Icon name="chevron" size={10} color={c.textMuted} weight="bold" />
            </PressableScale>
          )}
        </View>

        {/* restyle the card: colour and pattern, same number */}
        <ListSection>
          <ListRow icon="palette" title="Card design" subtitle={`${cardLook(card.theme).name} · change colour and pattern`} chevron onPress={() => router.push({ pathname: "/card-design", params: { id: card.id } })} />
        </ListSection>

        {/* quietly at the end, behind a sheet and the PIN */}
        <ListSection>
          <ListRow icon="trash" destructive title="Delete card" subtitle={card.balance > 0 ? `Its $${money(card.balance)} goes back to your USD wallet` : "Closes this card for good"} chevron onPress={() => openDeleteSheet(card)} />
        </ListSection>
      </Screen>
    </>
  );
}
