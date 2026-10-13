import { router } from "expo-router";
import type { ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
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

type Tile = { id: WorldId; title: string; body: string; bg: string; fg: string; sub: string; art: (w: number) => ReactNode };

const stack = (codes: string[], size: number) => (
  <View style={{ flexDirection: "row" }}>
    {codes.map((code, i) => (
      <View key={code} style={{ marginLeft: i ? -size * 0.32 : 0, borderRadius: size, borderWidth: 2, borderColor: "#fff" }}>
        <CoinIcon code={code} size={size} />
      </View>
    ))}
  </View>
);

const TILES: Tile[] = [
  { id: "global", title: "Global payments", body: "USD, GBP and EUR accounts. Send money abroad.", bg: "#C6EFA6", fg: "#14261A", sub: "#3D5A45", art: () => stack(["USD", "GBP", "EUR", "NGN"], 36) },
  { id: "crypto", title: "Crypto", body: "Deposit, buy, sell and swap crypto.", bg: palette.purple[500], fg: "#ffffff", sub: palette.purple[100], art: () => stack(["BTC", "ETH", "USDT"], 40) },
  {
    id: "card",
    title: "Virtual card",
    body: "A dollar card for Netflix, Spotify and more.",
    bg: palette.purple[900],
    fg: "#ffffff",
    sub: palette.purple[100],
    art: (w) => (
      <View style={{ transform: [{ rotate: "-12deg" }], marginRight: -w * 0.18, marginBottom: -10 }}>
        <VirtualCardFace card={{ theme: "lime", network: "visa", holder: "", number: "4532", last4: "4821", expiry: "", cvv: "", frozen: false }} width={w * 0.95} />
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
    art: () => (
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: 96, gap: spacing.xs, justifyContent: "flex-end" }}>
        {["mtn", "phed", "dstv"].map((id) => (
          <View key={id} style={{ borderRadius: 22, borderWidth: 2, borderColor: "#fff" }}>
            <BillerThumb biller={billerById(id)} size={40} />
          </View>
        ))}
        <View style={{ borderRadius: 22, borderWidth: 2, borderColor: "#fff" }}>
          <GiftMark brand={giftBrandById("steam")} size={40} />
        </View>
      </View>
    ),
  },
];

/**
 * Right after sign-up (SBU.png "Get started"): pick a Tribe world. The pick decides what the
 * landing Home opens once (see data/worlds.ts) and whether "Finish setup" asks for global accounts.
 */
export default function Welcome() {
  const { width } = useWindowDimensions();
  const firstName = useSessionStore((s) => s.user.firstName);
  const reset = useSignupStore((s) => s.reset);
  const set = useSignupStore((s) => s.set);
  const tileW = (width - spacing.mdl * 2 - spacing.smd) / 2;
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.smd }}>
        {TILES.map((t, i) => (
          <Animated.View key={t.id} entering={FadeInDown.delay(120 + i * 70).springify().damping(16)}>
            <PressableScale onPress={() => start(t.id)} scaleTo={0.97} accessibilityLabel={`${t.title}. ${t.body}`} style={{ width: tileW, height: tileW * 1.12, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: t.bg, padding: spacing.md, overflow: "hidden" }}>
              <Text variant="headline" style={{ color: t.fg }}>
                {t.title}
              </Text>
              <Text variant="caption" style={{ color: t.sub, marginTop: spacing.xxs }}>
                {t.body}
              </Text>
              <View style={{ position: "absolute", right: spacing.smd, bottom: spacing.smd, alignItems: "flex-end" }}>{t.art(tileW)}</View>
              <View style={{ position: "absolute", left: spacing.md, bottom: spacing.md, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" }}>
                <Icon name="chevron" size={11} color={palette.ink[900]} weight="bold" />
              </View>
            </PressableScale>
          </Animated.View>
        ))}
      </View>
    </OnboardingShell>
  );
}
