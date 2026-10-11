import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { CopyField } from "@/components/bits";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { ListSection } from "@/components/list";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { assetByCode, DEPOSIT_ADDRESSES } from "@/data/assets";
import { shadows, spacing, useColors } from "@/theme";

/**
 * The new currency is the hero: its coin/flag springs onto a soft halo, a success ring ripples
 * out once and a green check pops onto its edge. (It used to be a small badge clipped onto a
 * busy stripes disc.) Reduced motion: everything in place, no ripple.
 */
function OpenedHero({ code }: { code: string }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const size = 140;
  const coin = 96;
  const badge = 38;
  const pop = useSharedValue(reduce ? 1 : 0);
  const ripple = useSharedValue(reduce ? 1 : 0);
  const check = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (reduce) return;
    pop.set(withSpring(1, { damping: 12, stiffness: 170 }));
    ripple.set(withDelay(180, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) })));
    check.set(withDelay(320, withSpring(1, { damping: 9, stiffness: 230 })));
  }, [reduce, pop, ripple, check]);

  const coinStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.get() * 1.5), transform: [{ scale: 0.6 + 0.4 * pop.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: reduce ? 0 : 0.55 * (1 - ripple.get()), transform: [{ scale: 0.72 + 0.5 * ripple.get() }] }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: check.get(), transform: [{ scale: check.get() }] }));
  // the check sits on the coin's edge at 45°
  const edge = size / 2 + (coin / 2) * Math.SQRT1_2 - badge / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessible accessibilityLabel={`${code} account opened`}>
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: c.successSoft }} />
      <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: c.success }, ringStyle]} />
      <Animated.View style={[{ borderRadius: coin, boxShadow: shadows.pop }, coinStyle]}>
        <CoinIcon code={code} size={coin} ring={c.bg} />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: edge, top: edge, width: badge, height: badge, borderRadius: badge / 2, backgroundColor: c.success, borderWidth: 4, borderColor: c.bg, alignItems: "center", justifyContent: "center" }, checkStyle]}>
        <Icon name="check" size={15} color="#fff" weight="bold" />
      </Animated.View>
    </View>
  );
}

/** Open a new currency · done: celebrate, then show the details straight away. */
export default function CurrencyOpened() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const a = assetByCode(code);
  const fields = a.kind === "fiat" ? (a.account?.fields ?? []) : [{ label: `${a.networks?.[0]?.name} address`, value: DEPOSIT_ADDRESSES[`${a.code}:${a.networks?.[0]?.id}`] ?? "" }];
  const close = () => (router.canDismiss() ? router.dismissAll() : router.back());

  return (
    <FlowScreen
      title=""
      cancel="none"
      footer={
        <>
          <Button
            title={`Receive ${a.code}`}
            icon="receive"
            onPress={() => {
              close();
              router.back();
              router.push({ pathname: "/receive/[code]", params: { code: a.code } });
            }}
          />
          <Button
            title="Done"
            variant="tertiary"
            onPress={() => {
              close();
              router.back();
            }}
          />
        </>
      }
    >
      <View style={{ alignItems: "center", gap: spacing.md, paddingTop: spacing.lg }}>
        <OpenedHero code={a.code} />
        <Animated.View entering={FadeInDown.delay(250)} style={{ alignItems: "center", gap: spacing.xs }}>
          <Text variant="largeTitle" align="center">
            {a.code} is open
          </Text>
          <Text variant="body" tone="muted" align="center">
            {a.kind === "fiat" ? "Share these details to get paid like a local." : "Send to this address to fund it."}
          </Text>
        </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(380)}>
        <ListSection inset={spacing.md}>
          {fields.map((f) => (
            <CopyField key={f.label} label={f.label} value={f.value} mono={a.kind === "crypto"} />
          ))}
        </ListSection>
      </Animated.View>
    </FlowScreen>
  );
}
