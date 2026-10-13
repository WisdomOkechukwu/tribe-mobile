import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, { interpolateColor, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { CryptoSpendArt, EverydayArt, GlobalAccountsArt } from "@/components/illustrations";
import { PressableScale } from "@/components/pressable-scale";
import { Stripes } from "@/components/stripes";
import { Text } from "@/components/text";
import { MarkDisc } from "@/screens/auth/shell";
import { useSessionStore } from "@/stores/use-session-store";
import { palette, radius, spacing } from "@/theme";

/** One full-bleed brand band per slide, the landing page's colour rhythm. The last headline line is the accent. */
const SLIDES = [
  {
    key: "crypto",
    Art: CryptoSpendArt,
    bg: palette.purple[500],
    accent: palette.orange[300],
    headline: ["Crypto", "that spends", "like cash."],
    body: "Hold BTC, USDT, SOL and more. Swap to Naira or pay with your Tribe card in seconds.",
  },
  {
    key: "global",
    Art: GlobalAccountsArt,
    bg: palette.orange[500],
    accent: palette.purple[900],
    headline: ["Dollars.", "Pounds.", "Euros."],
    body: "Accounts in your own name. Get paid from anywhere and send money abroad, no wahala.",
  },
  {
    key: "everyday",
    Art: EverydayArt,
    bg: palette.purple[900],
    accent: palette.orange[400],
    headline: ["Bills.", "Gift cards.", "Cashpoints."],
    body: "Airtime, data, TV and light, sorted. Buy or sell gift cards, and every electricity token is saved for you.",
  },
] as const;

const BODY = "rgba(255,255,255,0.86)";
// Built on the JS side: a .map() callback inside a worklet gets hoisted by the React Compiler
// into a plain function, and calling it on the UI runtime aborts Expo Go ("Tried to
// synchronously call a Remote Function").
const SLIDE_BGS: string[] = SLIDES.map((sl) => sl.bg);
const ADVANCE_MS = 3500;

/**
 * First launch: three slides that tell Tribe's story with Tribe's own art (Onboarding.png's
 * idea, Tribe's look). Each slide is a full-bleed brand colour that cross-fades as you swipe;
 * one band of logo stripes sits still behind the art while slides pass over it. Slides move on
 * by themselves (slower than the devnote's 1s so people can read them), stop as soon as you
 * swipe, and stay put under reduced motion. Returning users go straight to sign-in.
 */
export default function Intro() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const remembered = useSessionStore((s) => s.rememberedEmail);
  const pager = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [pageH, setPageH] = useState(0);
  const last = index === SLIDES.length - 1;
  const artW = Math.min(width - spacing.mdl * 2, height * 0.36, 360);
  const [stripesTop, setStripesTop] = useState(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  const stops = SLIDES.map((_, i) => i * width); // JS side, see SLIDE_BGS
  const band = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(x.get(), stops, SLIDE_BGS) }));

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
  }, [index, touched, last, reduce, width, pager]);

  const tap = (i: number) => {
    setTouched(true);
    go(i);
  };

  if (remembered) return <Redirect href="/sign-in" />;

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <Animated.View style={[{ flex: 1, paddingTop: insets.top + spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md) }, band]}>
      <StatusBar style="light" />
      {/* the screen's one stripes motif: still, behind the art, slides glide over it */}
      {pageH > 0 && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: stripesTop, height: pageH * 0.62, overflow: "hidden" }}>
          <Stripes count={4} band={30} gap={24} colors={["#ffffff"]} opacity={0.09} />
        </View>
      )}

      <View
        onLayout={(e) => setStripesTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.mdl, minHeight: 44 }}
      >
        <MarkDisc size={44} />
        {!last && (
          <PressableScale onPress={() => tap(SLIDES.length - 1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip intro">
            <Text variant="bodyStrong" style={{ color: "#fff" }}>
              Skip
            </Text>
          </PressableScale>
        )}
      </View>

      <Animated.ScrollView showsVerticalScrollIndicator={false}
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => setTouched(true)}
        onMomentumScrollEnd={onEnd}
        onLayout={(e) => setPageH(e.nativeEvent.layout.height)}
        style={{ flex: 1 }}
        accessibilityRole="adjustable"
        accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}: ${SLIDES[index].headline.join(" ")}`}
      >
        {SLIDES.map(({ key, Art, headline, accent, body }, i) => (
          <View key={key} style={{ width, height: pageH || undefined, paddingHorizontal: spacing.mdl, justifyContent: "center", gap: spacing.lg }}>
            <View style={{ alignItems: "center" }}>
              <Art width={artW} active={i === index} onColour />
            </View>
            <View style={{ gap: spacing.smd }}>
              <Text variant="poster" accessibilityRole="header" maxFontSizeMultiplier={1.2} style={{ color: "#fff" }}>
                {headline.map((line, l) => (
                  <Text key={line} variant="poster" style={{ color: l === headline.length - 1 ? accent : "#fff" }}>
                    {l > 0 ? "\n" : ""}
                    {line}
                  </Text>
                ))}
              </Text>
              <Text variant="body" style={{ color: BODY, maxWidth: 360 }}>
                {body}
              </Text>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={{ paddingHorizontal: spacing.mdl, gap: spacing.md, paddingTop: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {SLIDES.map((sl, i) => (
              <PressableScale key={sl.key} onPress={() => tap(i)} hitSlop={8} haptic={false}>
                <View style={{ width: i === index ? 22 : 7, height: 7, borderRadius: radius.full, backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.4)" }} />
              </PressableScale>
            ))}
          </View>
          <Button
            inline
            title={last ? "Join Tribe" : "Next"}
            colors={{ bg: "#fff", fg: palette.purple[900] }}
            onPress={() => (last ? router.push("/create-account") : tap(index + 1))}
            style={{ minWidth: 150 }}
          />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.xs }}>
          <Text variant="body" style={{ color: BODY }}>
            Already on Tribe?
          </Text>
          <PressableScale onPress={() => router.push("/sign-in")} hitSlop={10} accessibilityRole="link">
            <Text variant="bodyStrong" style={{ color: "#fff", textDecorationLine: "underline" }}>
              Sign in
            </Text>
          </PressableScale>
        </View>
      </View>
    </Animated.View>
  );
}
