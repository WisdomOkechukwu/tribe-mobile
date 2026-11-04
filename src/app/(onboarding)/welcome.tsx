import { router } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BillerThumb, GiftMark } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { VirtualCardFace } from "@/components/card-face";
import { CoinIcon } from "@/components/coin-icon";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { billerById, giftBrandById } from "@/data/catalog";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore, type WorldId } from "@/stores/use-signup-store";
import { palette, radius, spacing } from "@/theme";
import { OnboardingShell } from "@/screens/onboarding/shell";

type Tile = { id: WorldId; title: string; body: string; bg: string; fg: string; sub: string; art: () => ReactNode };

/** Logos overlapping in a row, each ringed in white so the edges read. `tuck` is how much each slides under the next. */
const overlap = (items: ReactNode[], size: number, tuck = 0.32) => (
  <View style={{ flexDirection: "row" }}>
    {items.map((item, i) => (
      <View key={i} style={{ marginLeft: i ? -size * tuck : 0, borderRadius: size, borderWidth: 2, borderColor: "#fff" }}>
        {item}
      </View>
    ))}
  </View>
);
const stack = (codes: string[], size: number) => overlap(codes.map((code) => <CoinIcon key={code} code={code} size={size} />), size);

const TILES: Tile[] = [
  { id: "global", title: "Global payments", body: "USD, GBP and EUR accounts. Send money abroad.", bg: "#C6EFA6", fg: "#14261A", sub: "#3D5A45", art: () => stack(["USD", "GBP", "EUR", "NGN"], 32) },
  { id: "crypto", title: "Crypto", body: "Deposit, buy, sell and swap crypto.", bg: palette.purple[500], fg: "#ffffff", sub: palette.purple[100], art: () => stack(["BTC", "ETH", "USDT"], 40) },
  {
    id: "card",
    title: "Virtual card",
    body: "A dollar card for Netflix, Spotify and more.",
    bg: palette.purple[900],
    fg: "#ffffff",
    sub: palette.purple[100],
    // the card peeks in from the bottom-right corner; the tile clips the rest
    art: () => (
      <View style={{ transform: [{ rotate: "-12deg" }], marginRight: -spacing.xl, marginBottom: -spacing.xl }}>
        <VirtualCardFace card={{ theme: "lime", network: "visa", holder: "", number: "4532", last4: "4821", expiry: "", cvv: "", frozen: false }} width={140} />
      </View>
    ),
  },
  {
    id: "bills",
    title: "Bills & gift cards",
    body: "Airtime, data, TV, light and gift cards.",
    bg: palette.orange[500],
    fg: "#ffffff",
    sub: palette.orange[50],
    // overlapped like the coins, but tucked less: these logos are words, so most of each stays readable
    art: () => overlap([...["mtn", "phed", "dstv"].map((id) => <BillerThumb key={id} biller={billerById(id)} size={32} />), <GiftMark key="steam" brand={giftBrandById("steam")} size={32} />], 32, 0.18),
  },
];

/**
 * Right after sign-up (SBU.png "Get started"): pick a Tribe world. The pick decides what the
 * landing Home opens once (see data/worlds.ts) and whether "Finish setup" asks for global accounts.
 */
export default function Welcome() {
  const firstName = useSessionStore((s) => s.user.firstName);
  const reset = useSignupStore((s) => s.reset);
  const set = useSignupStore((s) => s.set);
  const start = (world: WorldId | null) => {
    reset();
    set({ world });
    // straight into the app: verifications wait on Home's "Finish setup" (or come up just in time)
    router.push("/done");
  };

  return (
    <OnboardingShell
      title="Pick your world"
      headline={["Pick your", firstName ? `world, ${firstName}.` : "world."]}
      subtitle="You get all of them. This is just where we start."
      back={false}
      footer={<Button title="Skip, take me home" variant="tertiary" onPress={() => start(null)} />}
    >
      {/* one world per row, full width: words on the left, its art on the right */}
      <View style={{ gap: spacing.smd }}>
        {TILES.map((t, i) => (
          <Animated.View key={t.id} entering={FadeInDown.delay(120 + i * 70).springify().damping(16)}>
            <PressableScale onPress={() => start(t.id)} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${t.title}. ${t.body}`} style={{ minHeight: 104, flexDirection: "row", alignItems: "center", gap: spacing.smd, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: t.bg, paddingVertical: spacing.md, paddingLeft: spacing.md, paddingRight: spacing.smd, overflow: "hidden" }}>
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Text variant="headline" style={{ color: t.fg, flexShrink: 1 }}>
                    {t.title}
                  </Text>
                  <Icon name="chevron" size={11} color={t.fg} weight="bold" />
                </View>
                <Text variant="caption" style={{ color: t.sub }}>
                  {t.body}
                </Text>
              </View>
              <View style={{ minWidth: 112, alignSelf: "stretch", alignItems: "flex-end", justifyContent: "center" }}>{t.art()}</View>
            </PressableScale>
          </Animated.View>
        ))}
      </View>
    </OnboardingShell>
  );
}
