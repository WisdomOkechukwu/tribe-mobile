import { Image } from "expo-image";
import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { CryptoSpendArt, EverydayArt, GlobalAccountsArt } from "@/components/illustrations";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { useSessionStore } from "@/stores/use-session-store";
import { fonts, radius, spacing, useColors } from "@/theme";

const SLIDES = [
  { key: "crypto", Art: CryptoSpendArt, title: "Crypto that spends like cash", body: "Hold BTC, USDT and more. Swap to Naira or pay with your card in seconds." },
  { key: "global", Art: GlobalAccountsArt, title: "Dollar, pound and euro accounts in your name", body: "Get paid from anywhere and send money abroad, no wahala." },
  { key: "everyday", Art: EverydayArt, title: "Bills, gift cards and Cashpoints in one app", body: "Airtime, data, TV and light, sorted. Every electricity token is saved for you." },
] as const;

const ADVANCE_MS = 3500;

/**
 * First launch (Onboarding.png): three slides that tell Tribe's story with Tribe's own art.
 * They move on by themselves (slower than the devnote's 1s so people can read them), stop as
 * soon as you swipe, and stay put under reduced motion. Returning users go straight to sign-in.
 */
export default function Intro() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const remembered = useSessionStore((s) => s.rememberedEmail);
  const pager = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [pageH, setPageH] = useState(0);
  const last = index === SLIDES.length - 1;
  const artW = Math.min(width - spacing.mdl * 2, height * 0.42, 380);

  const go = (i: number) => {
    setIndex(i);
    pager.current?.scrollTo({ x: i * width, animated: !reduce });
  };

  useEffect(() => {
    if (reduce || touched || last) return;
    const t = setTimeout(() => {
      setIndex(index + 1);
      pager.current?.scrollTo({ x: (index + 1) * width, animated: true });
    }, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [index, touched, last, reduce, width]);

  const tap = (i: number) => {
    setTouched(true);
    go(i);
  };

  if (remembered) return <Redirect href="/sign-in" />;

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md) }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.mdl, minHeight: 44 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }} accessible accessibilityLabel="Tribe">
          <Image source={require("@/assets/brand/tribe-mark.png")} style={{ width: 30, height: 22 }} contentFit="contain" />
          <Text style={{ fontFamily: fonts.display, fontSize: 18, letterSpacing: 2.5, color: c.text }}>TRIBE</Text>
        </View>
        {!last && (
          <PressableScale onPress={() => go(SLIDES.length - 1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip intro">
            <Text variant="bodyStrong" tone="brand">
              Skip
            </Text>
          </PressableScale>
        )}
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setTouched(true)}
        onMomentumScrollEnd={onEnd}
        onLayout={(e) => setPageH(e.nativeEvent.layout.height)}
        style={{ flex: 1 }}
        accessibilityRole="adjustable"
        accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}: ${SLIDES[index].title}`}
      >
        {SLIDES.map(({ key, Art, title, body }, i) => (
          <View key={key} style={{ width, height: pageH || undefined, paddingHorizontal: spacing.mdl, justifyContent: "center", gap: spacing.lg }}>
            <View style={{ alignItems: "center" }}>
              <Art width={artW} active={i === index} />
            </View>
            <View style={{ gap: spacing.sm, paddingHorizontal: spacing.sm }}>
              <Text variant="largeTitle" align="center" style={{ fontSize: 30, lineHeight: 34 }}>
                {title}
              </Text>
              <Text variant="body" tone="muted" align="center">
                {body}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.mdl, gap: spacing.md, paddingTop: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {SLIDES.map((s, i) => (
              <PressableScale key={s.key} onPress={() => tap(i)} hitSlop={8} haptic={false}>
                <View style={{ width: i === index ? 22 : 7, height: 7, borderRadius: radius.full, backgroundColor: i === index ? c.brand : c.borderStrong }} />
              </PressableScale>
            ))}
          </View>
          <Button inline title={last ? "Get started" : "Next"} onPress={() => (last ? router.push("/create-account") : tap(index + 1))} style={{ minWidth: 150 }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
          <Text variant="body" tone="muted">
            Already have an account?
          </Text>
          <PressableScale onPress={() => router.push("/sign-in")} hitSlop={10} accessibilityRole="link">
            <Text variant="bodyStrong" tone="brand">
              Sign in
            </Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}
