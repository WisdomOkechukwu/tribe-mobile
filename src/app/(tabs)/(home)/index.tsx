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
import { useCardsStore } from "@/stores/use-cards-store";
import { useInboxStore, useUnreadCount } from "@/stores/use-inbox-store";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { toast } from "@/stores/use-ui-store";
import { useSessionStore } from "@/stores/use-session-store";
import { portfolioUsd, useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { setupTasks } from "@/utils/setup-flow";
import { FinishSetupCard } from "@/components/finish-setup-card";
import { guardWalletOpen, useWalletsUnlocked, openCardCreation } from "@/utils/verification";

/** Demo: how long the global-accounts review takes before it's approved. */
const GLOBAL_REVIEW_MS = 45_000;

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
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const transactions = useWalletStore((s) => s.transactions);
  const hasCard = useCardsStore((s) => s.cards.length > 0);
  const unread = useUnreadCount();
  const [refreshing, setRefreshing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const globalAccounts = useSessionStore((s) => s.globalAccounts);
  const walletsUnlocked = useWalletsUnlocked();
  const globalRequestedAt = useSessionStore((s) => s.globalRequestedAt);
  const dismissed = usePrefsStore((s) => s.dismissedPromos);
  const dismissPromo = usePrefsStore((s) => s.dismissPromo);

  // Right after setup: open the world the user picked (once). Tabs navigate, flows push on top.
  useEffect(() => {
    const href = useSessionStore.getState().consumeLanding();
    if (!href) return;
    // the card world lands on card creation, through the verification check
    const t = setTimeout(() => (href === "/card-new" ? openCardCreation() : href.startsWith("/pay") ? router.navigate(href as Href) : router.push(href as Href)), 450);
    return () => clearTimeout(t);
  }, []);

  // Global payments world: the request is "reviewed", then the USD, GBP and EUR accounts open.
  // Opening them still needs full verification: until then the approval waits.
  useEffect(() => {
    if (globalAccounts !== "review" || !walletsUnlocked) return;
    const wait = Math.max(0, (globalRequestedAt ?? Date.now()) + GLOBAL_REVIEW_MS - Date.now());
    const t = setTimeout(() => {
      useSessionStore.getState().setGlobalAccounts("ready");
      const w = useWalletStore.getState();
      (["USD", "GBP", "EUR"] as const).forEach((code) => w.openAccount(code));
      useInboxStore.getState().push({ kind: "money", title: "Your global accounts are ready", body: "USD, GBP and EUR account details in your name. Start receiving money from abroad.", assets: ["USD", "GBP", "EUR"], badge: "check", href: "/asset/USD" });
      toast("Your USD, GBP and EUR accounts are ready", "success");
    }, wait);
    return () => clearTimeout(t);
  }, [globalAccounts, globalRequestedAt, walletsUnlocked]);


  // Finish setup: nothing here blocks the app; each row starts the chain at that task
  const phoneVerified = useSessionStore((s) => s.phoneVerified);
  const pin = useSessionStore((s) => s.pin);
  const world = useSessionStore((s) => s.world);
  const tasks = setupTasks({ phoneVerified, pin, kycTier, world, globalAccounts });

  const totalUsd = portfolioUsd(balances);
  const weighted = ASSETS.reduce(
    (s, a) => s + balances[a.code] * a.usd * a.change24h,
    0,
  );
  const change = totalUsd ? weighted / totalUsd : 0;
  const held = ASSETS.filter((a) => opened.includes(a.code))
    .sort((a, b) => balances[b.code] * b.usd - balances[a.code] * a.usd)
    .slice(0, 4);
  const unopened = ASSETS.filter((a) => !opened.includes(a.code));

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
        scrollEventThrottle={32}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          setTimeout(() => setRefreshing(false), 900);
        }}
      >
        <BalanceHero totalUsd={totalUsd} changePct={change} />

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

        {globalAccounts === "review" && (
          <PressableScale
            scaleTo={0.98}
            disabled={walletsUnlocked}
            onPress={() => router.push("/verify")}
            style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.smd }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.warningSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="clock" size={18} color={c.pending} />
            </View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="bodyStrong">Global accounts under review</Text>
              <Text variant="caption" tone="muted">
                {walletsUnlocked ? "We'll notify you the moment your USD, GBP and EUR accounts are ready." : "Finish verification (NIN + selfie, ID + address) and we'll open your USD, GBP and EUR accounts."}
              </Text>
            </View>
            {!walletsUnlocked && <Icon name="chevron" size={14} color={c.textSubtle} />}
          </PressableScale>
        )}
        {globalAccounts === "ready" && !dismissed.includes("global-ready") && (
          <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.successSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="globe" size={18} color={c.success} />
            </View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="bodyStrong">Your global accounts are ready</Text>
              <Text variant="caption" tone="muted">
                Receive dollars, pounds and euros in your name.
              </Text>
            </View>
            <PressableScale
              onPress={() => {
                dismissPromo("global-ready");
                router.push("/asset/USD");
              }}
              accessibilityLabel="Start exploring your global accounts"
              style={{ backgroundColor: c.brand, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 6 }}
            >
              <Text variant="subhead" tone="onBrand">
                Explore
              </Text>
            </PressableScale>
          </View>
        )}

        {/* Finish setup: what's next + progress; hides once everything's done */}
        <FinishSetupCard tasks={tasks} />

        <PromoCarousel promos={promos} />

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

        <View style={{ gap: spacing.sm }}>
          <SectionHeader
            title="Activity"
            action="See all"
            onAction={() => router.push("/activity")}
          />
          <TransactionList items={transactions.slice(0, 6)} />
        </View>
      </Screen>
    </View>
  );
}
