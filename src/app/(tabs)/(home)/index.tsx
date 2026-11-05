import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { openAddMoneySheet, openMoreSheet } from "@/screens/home/sheets";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AssetRow } from "@/components/asset-row";
import { MeAvatar } from "@/components/avatar";
import { BalanceHero } from "@/components/balance-hero";
import { SectionHeader } from "@/components/bits";
import { CashpointMark } from "@/components/cashpoint-mark";
import { CircleAction, CircleActionRow } from "@/components/circle-action";
import { Icon, type IconName } from "@/components/icon";
import { ListSection, SectionLink } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { PromoCarousel, type Promo } from "@/components/promo-carousel";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TransactionList } from "@/components/transaction-row";
import { ASSETS } from "@/data/assets";
import { REFERRAL } from "@/data/referrals";
import { useUnreadCount } from "@/stores/use-inbox-store";
import { useSessionStore } from "@/stores/use-session-store";
import { portfolioUsd } from "@/stores/use-wallet-store";
import { useRatesVersion } from "@/api/live-rates";
import { resources } from "@/api/client";
import { refreshProfile } from "@/api/auth";
import { hasRates, usdRate } from "@/utils/rates";
import { useAccounts, useCards, useTransactions } from "@/api/queries";
import { BalanceHeroSkeleton, Loaded, SkeletonList } from "@/components/skeletons";
import { spacing, useColors } from "@/theme";
import { setupTasks } from "@/utils/setup-flow";
import { FinishSetupCard } from "@/components/finish-setup-card";
import { guardWalletOpen, openCardCreation } from "@/utils/verification";

/** a beat after the onboarding finale before Home opens the picked world */
const WORLD_LANDING_MS = 200;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function HeaderButton({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: number;
}) {
  const c = useColors();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={icon} size={18} color={c.text} />
      {!!badge && (
        <View
          style={{
            position: "absolute",
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: c.accent,
            borderWidth: 2,
            borderColor: c.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            variant="caption"
            style={{
              color: "#fff",
              fontSize: 10,
              lineHeight: 12,
              fontFamily: "Poppins_600SemiBold",
            }}
          >
            {badge > 9 ? "9+" : badge}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

function PromoArt({ icon, bg }: { icon: IconName; bg: string }) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={icon} size={20} color="#fff" />
    </View>
  );
}

export default function Home() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((s) => s.user);
  const kycTier = useSessionStore((s) => s.kycTier);
  const accounts = useAccounts();
  const history = useTransactions();
  const cards = useCards();
  // unknown until cards load: keep the "Get a dollar card" promo out rather than flash it
  const hasCard = cards.data ? cards.data.length > 0 : true;
  const unread = useUnreadCount();
  const [refreshing, setRefreshing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const globalAccounts = useSessionStore((s) => s.globalAccounts);

  // Right after setup: open the world the user picked (once). Tabs navigate, flows push on top.
  useEffect(() => {
    const href = useSessionStore.getState().consumeLanding();
    if (!href) return;
    // the card world lands on card creation, through the verification check
    const t = setTimeout(() => (href === "/card-new" ? openCardCreation() : href.startsWith("/pay") ? router.navigate(href as Href) : router.push(href as Href)), WORLD_LANDING_MS);
    return () => clearTimeout(t);
  }, []);



  // Finish setup: nothing here blocks the app; each row starts the chain at that task
  const phoneVerified = useSessionStore((s) => s.phoneVerified);
  const hasPin = useSessionStore((s) => s.hasPin);
  const world = useSessionStore((s) => s.world);
  const kycStatus = useSessionStore((s) => s.kycStatus);
  const kycPendingTier = useSessionStore((s) => s.kycPendingTier);
  const kycSubmittedAt = useSessionStore((s) => s.kycSubmittedAt);
  const kycTiers = useSessionStore((s) => s.kycTiers);
  const tasks = setupTasks({ phoneVerified, hasPin, kycTier, kycStatus, kycPendingTier, kycSubmittedAt, kycTiers, world, globalAccounts });
  // re-value balances when new rates arrive
  const v = useRatesVersion();

  const balances = accounts.data?.balances;
  const opened = accounts.data?.opened;
  const totalUsd = balances ? portfolioUsd(balances, v) : NaN;
  // the total waits for the balances and the server's rates (never a stored or made-up price)
  const totalReady = !!balances && hasRates(v) && Number.isFinite(totalUsd);
  const held = balances && opened
    ? ASSETS.filter((a) => opened.includes(a.code))
        .sort((a, b) => (balances[b.code] * usdRate(b.code, v) || 0) - (balances[a.code] * usdRate(a.code, v) || 0))
        .slice(0, 4)
    : [];
  const unopened = opened ? ASSETS.filter((a) => !opened.includes(a.code)) : [];

  const promos: Promo[] = [
    {
      id: "cashpoint",
      title: "Send cash with 12 digits",
      body: "Make a Cashpoint code anyone can redeem, even before they sign up.",
      art: <CashpointMark size={44} />,
      tone: "accent" as const,
      onPress: () => router.push("/cashpoint"),
    },
    {
      id: "invite",
      title: "Earn from friends, for life",
      body: `Get ₦${REFERRAL.perTransactionNgn} every time a friend you invite makes a transaction.`,
      art: <PromoArt icon="people" bg={c.accent} />,
      tone: "neutral" as const,
      onPress: () => router.push("/me/invite", { withAnchor: true }),
    },
    ...(!hasCard
      ? [
          {
            id: "card",
            title: "Get a dollar card",
            body: "A virtual card for Netflix, Spotify, AliExpress and more.",
            art: <PromoArt icon="card" bg={c.brand} />,
            onPress: () => openCardCreation(),
          },
        ]
      : []),
    ...(unopened.length
      ? [
          {
            id: "currencies",
            title: `Open a ${unopened
              .map((a) => a.code)
              .slice(0, 2)
              .join(" or ")} account`,
            body: "Local account details in minutes. Free to open.",
            art: <PromoArt icon="globe" bg={c.brand} />,
            tone: "neutral" as const,
            onPress: () => guardWalletOpen(() => router.push("/add-currency")),
          },
        ]
      : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* fixed top bar: greeting stays put while everything below scrolls; hairline once scrolled */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.smd,
          paddingHorizontal: spacing.md,
          backgroundColor: c.bg,
          borderBottomWidth: 1,
          borderBottomColor: scrolled ? c.border : "transparent",
          zIndex: 2,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.smd,
          }}
        >
          <PressableScale
            onPress={() => router.navigate("/me")}
            accessibilityLabel="Your profile"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.smd,
              flex: 1,
            }}
          >
            <MeAvatar size={42} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" tone="muted">
                {greeting()}
              </Text>
              <Text variant="headline" numberOfLines={1}>
                {user.firstName}
              </Text>
            </View>
          </PressableScale>
          <HeaderButton
            icon="search"
            label="Search"
            onPress={() => router.push("/search")}
          />
          <HeaderButton
            icon={unread ? "bellBadge" : "bell"}
            label="Notifications"
            badge={unread}
            onPress={() => router.push("/notifications")}
          />
        </View>
      </View>
      <Screen
        contentInsetAdjustmentBehavior="never"
        contentStyle={{ paddingTop: spacing.sm }}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 4)}
        scrollEventThrottle={100}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          // the verification banners and setup card read the profile (the per-tier KYC detail follows it), and the bell reads the inbox
          const quiet = (job: Promise<unknown>) => job.catch(() => {});
          Promise.all([accounts.refetch(), history.refetch(), cards.refetch(), quiet(refreshProfile()), quiet(resources.inbox.fetch())]).finally(() => setRefreshing(false));
        }}
      >
        {totalReady ? <BalanceHero totalUsd={totalUsd} /> : <BalanceHeroSkeleton />}

        <CircleActionRow>
          {/* money coming in: our own incoming-arrow glyph */}
          <CircleAction
            glyph="incoming"
            label="Receive"
            primary
            onPress={openAddMoneySheet}
          />
          <CircleAction
            glyph="outgoing"
            label="Send"
            onPress={() => router.push("/send")}
          />
          <CircleAction
            icon="swap"
            label="Swap"
            onPress={() => router.push("/swap")}
          />
          <CircleAction icon="more" label="More" onPress={openMoreSheet} />
        </CircleActionRow>

        {/* Finish setup: what's next + progress; hides once everything's done */}
        <FinishSetupCard tasks={tasks} />

        <PromoCarousel promos={promos} />

        <Loaded query={accounts} skeleton={<SkeletonList title="Assets" rows={4} />}>
          {() => (
            <ListSection
              title="Assets"
              action={
                <SectionLink
                  label="See all"
                  onPress={() => router.navigate("/wallet")}
                />
              }
            >
              {held.map((a) => (
                <AssetRow key={a.code} a={a} />
              ))}
            </ListSection>
          )}
        </Loaded>

        <View style={{ gap: spacing.sm }}>
          <SectionHeader
            title="Activity"
            action="See all"
            onAction={() => router.navigate("/history")}
          />
          <Loaded query={history} skeleton={<SkeletonList rows={4} />}>
            {(txs) => <TransactionList items={txs.slice(0, 6)} />}
          </Loaded>
        </View>
      </Screen>
    </View>
  );
}
