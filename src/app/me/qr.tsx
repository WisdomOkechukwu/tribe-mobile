import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, Share, View } from "react-native";
import Animated, { cancelAnimation, Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import QRCode from "react-native-qrcode-svg";
import { MeAvatar } from "@/components/avatar";
import { copyToClipboard } from "@/components/bits";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Shine } from "@/components/shine";
import { Stripes } from "@/components/stripes";
import { Text } from "@/components/text";
import { useSessionStore } from "@/stores/use-session-store";
import { fonts, palette, radius, spacing, useColors } from "@/theme";

const QR_SIZE = 200;
const NOTCH = 18;

/** A slow drift with a hint of tilt, so the sticker feels alive without bouncing. */
function useDrift() {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(500, withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [reduce, t]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: -2 + t.value * 4 }, { rotate: `${8 - t.value * 2}deg` }] }));
}

/**
 * The pay pass: who you are, your @tag as the hero, the QR on a crisp white tile with a "scan to
 * pay" sticker on its corner (outside the code, so it stays scannable), and a tear-off stub with
 * the pay link. The QR encodes tribe://pay/@tag so any Tribe app can scan it.
 */
function TagPass({ link, web }: { link: string; web: string }) {
  const c = useColors();
  const user = useSessionStore((s) => s.user);
  const drift = useDrift();
  return (
    <View style={{ borderRadius: radius.panel, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[900], boxShadow: "0 28px 50px -26px rgba(44,5,72,0.95)" }}>
      {/* the brand stripes, the full height of the right edge */}
      <View pointerEvents="none" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 46, overflow: "hidden" }}>
        {/* Stripes sizes its rotated box to 220% of the parent: on a narrow edge that box is too
            thin and leaves a diamond, so give it a wide box centred on the edge instead */}
        <Stripes band={10} gap={6} count={60} style={{ width: 900, left: -427 }} />
      </View>
      {/* light passing over the pass (under the QR tile, which sits on top and stays crisp) */}
      <Shine delay={900} every={4200} strength={0.14} />

      <View style={{ padding: spacing.lg, paddingRight: 46 + spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.smd }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            <MeAvatar size={40} />
            <Text variant="subhead" numberOfLines={1} style={{ flex: 1, color: palette.purple[100] }}>
              {user.firstName} {user.lastName}
            </Text>
          </View>
          {/* the tag is the hero: it's what people type to pay you */}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: palette.white }}>
            @{user.tag}
          </Text>
        </View>

        <View style={{ alignSelf: "center" }}>
          {/* generous white quiet zone around the code; the sticker sits outside it */}
          <View accessible accessibilityLabel={`QR code to pay @${user.tag}`} style={{ backgroundColor: palette.white, padding: spacing.md + 2, borderRadius: radius.card, borderCurve: "continuous" }}>
            <QRCode value={link} size={QR_SIZE} color={palette.purple[900]} backgroundColor={palette.white} quietZone={4} />
          </View>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -14, right: -30 }, drift]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: palette.orange[500], borderRadius: radius.full, borderWidth: 3, borderColor: palette.white, paddingHorizontal: spacing.smd, paddingVertical: 4, boxShadow: "0 8px 16px -8px rgba(0,0,0,0.55)" }}>
              <Icon name="scan" size={11} color={palette.white} weight="bold" />
              <Text style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 15, color: palette.white, letterSpacing: 0.2 }}>scan to pay</Text>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* tear line, then the stub with the link */}
      <View style={{ height: NOTCH, justifyContent: "center" }}>
        <View style={{ marginHorizontal: NOTCH, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.26)" }} />
        <View style={{ position: "absolute", left: -NOTCH / 2, width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: c.bg }} />
        <View style={{ position: "absolute", right: -NOTCH / 2, width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: c.bg }} />
      </View>
      <Pressable
        onPress={() => copyToClipboard(web, "Link copied")}
        accessibilityRole="button"
        accessibilityLabel={`Copy your pay link, ${web}`}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.lg, paddingRight: 46 + spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.md, opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" style={{ color: palette.purple[200] }}>
            Your pay link
          </Text>
          <Text variant="subhead" numberOfLines={1} style={{ color: palette.white }}>
            {web.replace(/^https:\/\//, "")}
          </Text>
        </View>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="copy" size={14} color={palette.white} />
        </View>
      </Pressable>
    </View>
  );
}

/** Your Tribe tag: the pass to show or share, then scanning someone else's. */
export default function TagQr() {
  const user = useSessionStore((s) => s.user);
  const reduce = useReducedMotion();
  const link = `tribe://pay/@${user.tag}`;
  const web = `https://tribe.africa/pay/${user.tag}`;
  const enter = (delay: number) => (reduce ? undefined : FadeInDown.delay(delay).duration(460).easing(Easing.out(Easing.cubic)));
  return (
    <Screen>
      <Animated.View entering={enter(0)}>
        <TagPass link={link} web={web} />
      </Animated.View>
      <Animated.View entering={enter(160)} style={{ gap: spacing.xs }}>
        <Text variant="caption" tone="muted" align="center" style={{ marginBottom: spacing.xs }}>
          Anyone on Tribe can scan it or tap the link to pay you.
        </Text>
        <Button title="Share my tag" icon="share" onPress={() => Share.share({ message: `Pay me on Tribe: @${user.tag}\n${web}` })} />
        <Button title="Scan someone else's code" icon="scan" variant="tertiary" onPress={() => router.push("/scan")} />
      </Animated.View>
    </Screen>
  );
}
