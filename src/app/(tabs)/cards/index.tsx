import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import Animated, { cancelAnimation, Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { EmptyState, SectionHeader } from "@/components/bits";
import { Button } from "@/components/button";
import { cardLook, MAX_FACE_W, useCardPalette, VirtualCardFace } from "@/components/card-face";
import { CircleAction, CircleActionRow } from "@/components/circle-action";
import { Icon } from "@/components/icon";
import { PayMark } from "@/components/pay-mark";
import { ListRow, ListSection } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Shine } from "@/components/shine";
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
import { fonts, palette, radius, spacing, useColors } from "@/theme";
import { PAY } from "@/utils/pay-platform";
import { openCardCreation } from "@/utils/verification";


// the real card face (what you get), three finishes fanned: two behind, Midnight in front
const FAN: { theme: CardTheme; rotate: string; x: number; y: number }[] = [
  { theme: "lime", rotate: "-13deg", x: -24, y: -30 },
  { theme: "sunset", rotate: "8deg", x: 24, y: -14 },
  { theme: "midnight", rotate: "-3deg", x: 0, y: 14 },
];

/** A slow drift up and down for the fan: the cards feel alive without bouncing. */
function useDrift() {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(700, withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [reduce, t]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: -4 + t.value * 8 }] }));
}

/** A die-cut sticker: tilted pill with a thick white edge (the member pass's stickers). */
function Sticker({ label, rotate }: { label: string; rotate: string }) {
  return (
    <View style={{ transform: [{ rotate }], borderRadius: radius.full, boxShadow: "0 8px 16px -8px rgba(0,0,0,0.5)" }}>
      <View style={{ backgroundColor: palette.orange[500], borderRadius: radius.full, borderWidth: 3, borderColor: palette.white, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs, overflow: "hidden" }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: palette.white, letterSpacing: 0.3 }}>{label}</Text>
        <Shine delay={1400} every={3600} strength={0.6} />
      </View>
    </View>
  );
}

/**
 * No cards yet: the start of card creation. The real card is the hero (three finishes fanned,
 * drifting, light passing over the front one), then the three things you'll do, what the card
 * does as one list, and one way in.
 */
function CardsIntro() {
  const c = useColors();
  const reduce = useReducedMotion();
  const drift = useDrift();
  const { width } = useWindowDimensions();
  const faceW = Math.min(width - spacing.md * 2 - 40, 300);
  const faceR = Math.min(radius.card, faceW * 0.065);
  const enter = (i: number) => (reduce ? undefined : FadeInDown.delay(i * 90).duration(420).easing(Easing.out(Easing.cubic)));
  // the steps really are a sequence, so they're numbered
  const steps = [
    { title: "Pick a look", body: "Seven finishes, or design your own. Mastercard or Visa." },
    { title: "Name it and fund it", body: `Top up at least $${CARD_MIN_TOPUP_USD} from any balance. $1 to create.` },
    { title: "Spend", body: `Ready the second you confirm. Tap the ${PAY.name} mark on it to add it to ${PAY.wallet}.` },
  ];
  return (
    <Screen>
      {/* the hero: the real card, three finishes fanned and drifting, a sticker on top */}
      <View style={{ height: 262, alignItems: "center", justifyContent: "center", marginTop: spacing.lg }}>
        <Animated.View style={[{ alignItems: "center", justifyContent: "center" }, drift]}>
          {FAN.map((f, i) => {
            const front = i === FAN.length - 1;
            return (
              <Animated.View key={f.theme} entering={enter(i)} style={{ position: front ? "relative" : "absolute" }}>
                <View style={{ transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: f.rotate }] }}>
                  <VirtualCardFace card={{ theme: f.theme, network: i === 1 ? "visa" : "mastercard", holder: "Your name" }} pill={front} width={faceW} />
                  {/* light passing over the front card (its own clipped layer, so the card's shadow stays) */}
                  {front && (
                    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: faceR, overflow: "hidden" }}>
                      <Shine delay={900} every={3800} strength={0.22} />
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>
        <Animated.View entering={enter(3)} pointerEvents="none" style={{ position: "absolute", top: 4, right: spacing.md }}>
          <Sticker label="$1 to create" rotate="8deg" />
        </Animated.View>
      </View>

      <Animated.View entering={enter(2)} style={{ gap: spacing.sm, paddingHorizontal: spacing.xs }}>
        <Text variant="poster" accessibilityRole="header" maxFontSizeMultiplier={1.2} style={{ fontSize: 32, lineHeight: 34 }}>
          {"Your dollar card\n"}
          <Text variant="poster" style={{ fontSize: 32, lineHeight: 34, color: palette.orange[400] }}>
            in a minute.
          </Text>
        </Text>
        <Text variant="body" tone="muted">
          For Netflix, Spotify, Apple, AliExpress, and any site that takes cards.
        </Text>
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <Button title="Get your card" icon="card" onPress={() => openCardCreation()} />
      </Animated.View>

      {/* how it goes: three numbered stops */}
      <Animated.View entering={enter(4)} style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          How it goes
        </Text>
        <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
          {steps.map((step, i) => {
            const last = i === steps.length - 1;
            return (
              <View key={step.title} style={{ flexDirection: "row", gap: spacing.smd }}>
                <View style={{ alignItems: "center", width: 28 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
                    <Text variant="caption" style={{ color: c.onBrand, fontFamily: fonts.semibold }}>
                      {i + 1}
                    </Text>
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
      </Animated.View>

      {/* what the card does: one quiet list, each row with its own mark */}
      <Animated.View entering={enter(5)}>
        <ListSection title="What you get" inset={66}>
          <ListRow
            leading={
              <View style={{ width: 40, flexDirection: "row" }}>
                {["netflix", "spotify"].map((id, i) => (
                  <View key={id} style={{ marginLeft: i ? -14 : 0, borderRadius: 14, borderWidth: 2, borderColor: c.surface, zIndex: 2 - i }}>
                    <GiftMark brand={giftBrandById(id)} size={26} />
                  </View>
                ))}
              </View>
            }
            title="Pay anywhere online"
            subtitle="Mastercard or Visa, wherever cards are taken."
          />
          <ListRow
            leading={
              <View style={{ width: 40, flexDirection: "row" }}>
                {(["USDT", "NGN"] as const).map((code, i) => (
                  <View key={code} style={{ marginLeft: i ? -14 : 0, borderRadius: 14, borderWidth: 2, borderColor: c.surface, zIndex: 2 - i }}>
                    <CoinIcon code={code} size={26} />
                  </View>
                ))}
              </View>
            }
            title="Fund from anything"
            subtitle="USDT, BTC, Naira or any balance."
          />
          <ListRow icon="snowflake" title="Freeze in a tap" subtitle="Lock it the second something looks off." />
          <ListRow
            leading={
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.text, alignItems: "center", justifyContent: "center" }}>
                <PayMark color={c.bg} height={10} />
              </View>
            }
            title={`Add it to ${PAY.name}`}
            subtitle={`Tap the ${PAY.name} mark on your card and we'll walk you through adding it to ${PAY.wallet}.`}
          />
        </ListSection>
      </Animated.View>
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
