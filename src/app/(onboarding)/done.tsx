import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { Stripes } from "@/components/stripes";
import { Text } from "@/components/text";
import { WORLDS } from "@/data/worlds";
import { MarkDisc } from "@/screens/auth/shell";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { fonts, palette, radius, spacing } from "@/theme";

const CTA = { global: "Go to my wallet", crypto: "Deposit crypto", card: "Create my card", bills: "Pay a bill" } as const;
const NEXT: Record<keyof typeof CTA, { icon: IconName; label: string }> = {
  global: { icon: "globe", label: "Next: your USD, GBP & EUR accounts" },
  crypto: { icon: "bolt", label: "Next: your first deposit" },
  card: { icon: "card", label: "Next: your dollar card" },
  bills: { icon: "bolt", label: "Next: your first bill" },
};

/** A die-cut sticker slapped on the pass: tilted pill, thick white edge. */
function Sticker({ label, icon, bg, fg, rotate, style }: { label: string; icon?: IconName; bg: string; fg: string; rotate: string; style: object }) {
  return (
    <View style={[{ position: "absolute", transform: [{ rotate }] }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: bg, borderRadius: radius.full, borderWidth: 3, borderColor: palette.white, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs, boxShadow: "0 8px 16px -8px rgba(0,0,0,0.5)" }}>
        {icon && <Icon name={icon} size={12} color={fg} weight="bold" />}
        <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: fg, letterSpacing: 0.3 }}>{label}</Text>
      </View>
    </View>
  );
}

/** The member pass: their name and @tag on a Tribe card, stripes down the side. */
function TribePass({ name, tag, width }: { name: string; tag: string; width: number }) {
  const since = new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return (
    <View style={{ width, height: width * 0.62, borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[700], padding: spacing.mdl, justifyContent: "space-between", boxShadow: "0 24px 40px -18px rgba(0,0,0,0.6)" }}>
      <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: width * 0.34, overflow: "hidden" }}>
        <Stripes band={14} gap={7} count={14} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <MarkDisc size={34} />
        <Text style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 14, letterSpacing: 2, color: palette.purple[100] }}>MEMBER PASS</Text>
      </View>
      <View style={{ gap: spacing.xxs, maxWidth: "64%" }}>
        <Text variant="poster" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.white, fontSize: 30, lineHeight: 32 }}>
          {name}
        </Text>
        <Text variant="subhead" style={{ color: palette.purple[100] }}>
          @{tag} · since {since}
        </Text>
      </View>
    </View>
  );
}

/**
 * Finale. Completing setup flips the route guard to the app; Home then opens the world the
 * user picked (once), so "Crypto" lands on Deposit crypto, "Virtual card" on card creation…
 * The moment itself is a member pass with stickers slapped on, and a poster headline.
 */
export default function Done() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useSessionStore((s) => s.user);
  const complete = useSessionStore((s) => s.completeOnboarding);
  const world = useSignupStore((s) => s.world);
  const reset = useSignupStore((s) => s.reset);
  const setWorld = useSessionStore((s) => s.setWorld);
  // into the app: remember the world (Finish setup reads it), open its landing once
  const finish = (landing: string | null) => {
    setWorld(world);
    complete(landing);
    reset();
  };
  const passWidth = Math.min(width - spacing.lg * 2 - spacing.lg, 340);
  const next = world ? NEXT[world] : null;

  useEffect(() => {
    const t = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: palette.purple[900], paddingTop: insets.top + spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg), paddingHorizontal: spacing.lg }}>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing.xl }}>
        {/* the pass, tilted, with stickers */}
        <Animated.View entering={ZoomIn.springify().damping(13)} style={{ alignSelf: "center", paddingVertical: spacing.md }}>
          <View style={{ transform: [{ rotate: "-5deg" }] }}>
            <TribePass name={user.firstName || "You"} tag={user.tag || "you"} width={passWidth} />
          </View>
          <Animated.View entering={ZoomIn.delay(420).springify().damping(8)} style={{ position: "absolute", inset: 0 }} pointerEvents="none">
            <Sticker label="you're in" icon="check" bg={palette.orange[500]} fg={palette.white} rotate="9deg" style={{ right: -10, top: -2 }} />
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(560).springify().damping(8)} style={{ position: "absolute", inset: 0 }} pointerEvents="none">
            <Sticker label="wallet ready" icon="wallet" bg={palette.white} fg={palette.purple[700]} rotate="-8deg" style={{ left: -12, bottom: -14 }} />
          </Animated.View>
        </Animated.View>

        {/* poster headline: last line in orange, like the auth band */}
        <Animated.View entering={FadeInDown.delay(180).duration(420)} style={{ gap: spacing.smd }}>
          <Text variant="poster" accessibilityRole="header" maxFontSizeMultiplier={1.2} style={{ color: palette.white }}>
            Welcome to{"\n"}
            <Text variant="poster" style={{ color: palette.orange[400] }}>
              the tribe.
            </Text>
          </Text>
          <Text variant="body" style={{ color: palette.purple[100] }}>
            Your wallet is ready. Look around, add money, finish setup whenever you like.
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(420)} style={{ gap: spacing.md }}>
        {next && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "flex-start", backgroundColor: palette.purple[800], borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.sm }}>
            <Icon name={next.icon} size={13} color={palette.orange[400]} />
            <Text variant="subhead" style={{ color: palette.purple[50] }}>
              {next.label}
            </Text>
          </View>
        )}
        <Button
          title={world ? CTA[world] : "Go to my wallet"}
          variant="white"
          onPress={() => {
            finish(world ? WORLDS[world].landing : null);
          }}
        />
        {/* new users can redeem a Cashpoint right at sign-up */}
        <Button title="Got a Cashpoint code?" variant="tertiary" colors={{ bg: "transparent", fg: palette.orange[300] }} onPress={() => finish("/cashpoint?mode=redeem")} />
      </Animated.View>
    </View>
  );
}
