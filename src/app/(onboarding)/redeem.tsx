import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming, ZoomIn } from "react-native-reanimated";
import { Button } from "@/components/button";
import { CashpointMark } from "@/components/cashpoint-mark";
import { Icon, type IconName } from "@/components/icon";
import { NumberPad } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { PrivacyGuard } from "@/components/privacy-guard";
import { Text } from "@/components/text";
import { DEMO } from "@/data/seed";
import { OnboardingShell } from "@/screens/onboarding/shell";
import { overlay } from "@/stores/use-overlay-store";
import { toast, withLoader } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { fonts, palette, radius, spacing, useColors } from "@/theme";

const LENGTH = 12;
const DEMO_VALUE = 5_000;
type State = "typing" | "redeemed";

/** The live ticket: the code fills in group by group as you type, then it's stamped. */
function RedeemTicket({ code, state, shakeKey }: { code: string; state: State; shakeKey: number }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const shake = useSharedValue(0);
  useEffect(() => {
    if (shakeKey && !reduce) shake.set(withSequence(...[12, -12, 8, -8, 4, 0].map((x) => withTiming(x, { duration: 55 }))));
  }, [shakeKey, reduce, shake]);
  const row = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const notch = { position: "absolute" as const, width: 22, height: 22, borderRadius: 11, backgroundColor: c.bg };
  const groups = [0, 1, 2].map((g) => code.slice(g * 4, g * 4 + 4));
  const active = Math.min(2, Math.floor(code.length / 4));
  const redeemed = state === "redeemed";

  return (
    <Animated.View style={row} accessible accessibilityLabel={redeemed ? `Cashpoint redeemed: ${DEMO_VALUE} Naira` : `Cashpoint code, ${code.length} of 12 digits entered`}>
      <View style={{ borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.orange[500] }}>
        <View style={{ position: "absolute", right: -40, top: -34, opacity: 0.16 }}>
          <CashpointMark size={170} plain />
        </View>
        <View style={{ padding: spacing.mdl, paddingBottom: spacing.lg, gap: spacing.smd }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <CashpointMark size={26} plain />
            <Text variant="subhead" style={{ color: "#fff", flex: 1 }}>
              Tribe Cashpoint
            </Text>
            {!redeemed && (
              <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text variant="caption" style={{ color: "#fff", fontFamily: fonts.semibold }}>
                  {code.length === LENGTH ? "Ready" : "Your first deposit"}
                </Text>
              </View>
            )}
          </View>
          {redeemed ? (
            <Animated.View entering={reduce ? undefined : ZoomIn.springify().damping(11)}>
              <Text variant="balance" style={{ color: "#fff" }}>
                +₦{DEMO_VALUE.toLocaleString("en-NG")}
              </Text>
            </Animated.View>
          ) : (
            <Text variant="balance" style={{ color: "rgba(255,255,255,0.55)" }}>
              ₦ • • •
            </Text>
          )}
        </View>
        {/* perforation */}
        <View style={{ height: 2, zIndex: 2, justifyContent: "center" }}>
          <View style={{ borderTopWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.55)", marginHorizontal: spacing.lg }} />
          <View style={[notch, { left: -11, top: -10 }]} />
          <View style={[notch, { right: -11, top: -10 }]} />
        </View>
        <View style={{ backgroundColor: palette.orange[600], paddingHorizontal: spacing.mdl, paddingVertical: spacing.md, gap: 6 }}>
          <Text variant="caption" style={{ color: palette.orange[100] }}>
            12-digit code
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {groups.map((g, i) => {
              const on = !redeemed && i === active && code.length < LENGTH;
              return (
                <View key={i} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.xs, backgroundColor: on ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)", borderWidth: 1.5, borderColor: on ? "#fff" : "transparent" }}>
                  <Text variant="mono" style={{ color: g ? "#fff" : "rgba(255,255,255,0.45)", fontSize: 19, letterSpacing: 3 }}>
                    {(g + "••••").slice(0, 4)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        {redeemed && (
          <Animated.View entering={FadeIn.delay(150)} pointerEvents="none" style={{ position: "absolute", right: spacing.lg, top: spacing.xl + 8, transform: [{ rotate: "-14deg" }], borderWidth: 2.5, borderColor: "#fff", borderRadius: radius.xs, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 16, letterSpacing: 2, color: "#fff" }}>REDEEMED</Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

function Chip({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surface, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: spacing.smd }}>
      <Icon name={icon} size={14} color={c.accentText} />
      <Text variant="subhead">{label}</Text>
    </PressableScale>
  );
}

const explain = () =>
  overlay.sheet({
    title: "What's a Cashpoint?",
    content: () => (
      <View style={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.md, gap: spacing.md }}>
        {[
          ["cashpoint", "A 12-digit code someone made with Naira in their Tribe app."],
          ["personAdd", "Anyone can redeem it. New to Tribe? Redeem it right here, at sign-up."],
          ["bolt", "The money lands in your Naira wallet instantly. Use it for anything on Tribe."],
        ].map(([icon, line]) => (
          <View key={icon} style={{ flexDirection: "row", gap: spacing.smd, alignItems: "center" }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: palette.orange[500], alignItems: "center", justifyContent: "center" }}>
              <Icon name={icon as IconName} size={16} color="#fff" />
            </View>
            <Text variant="body" style={{ flex: 1 }}>
              {line}
            </Text>
          </View>
        ))}
      </View>
    ),
  });

/**
 * Optional: new users can redeem a Cashpoint a friend gave them as their first deposit.
 * The ticket fills in as you type, paste works, `?code=` pre-fills from a shared link, and a bad
 * code shakes with a clear reason instead of failing silently.
 */
export default function Redeem() {
  const params = useLocalSearchParams<{ code?: string }>();
  const redeem = useWalletStore((s) => s.redeemCashpoint);
  const [code, setCode] = useState((params.code ?? "").replace(/\D/g, "").slice(0, LENGTH));
  const [state, setState] = useState<State>("typing");
  const [shakeKey, setShakeKey] = useState(0);
  const full = code.length === LENGTH;

  const fail = (message: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    toast(message, "danger");
    setShakeKey((k) => k + 1);
  };

  const submit = async () => {
    const result = await withLoader("Checking your code…", () => {
      if (code === DEMO.cashpointInvalid) return "invalid" as const;
      if (code === DEMO.cashpointUsed) return "used" as const;
      redeem(code, DEMO_VALUE);
      return "ok" as const;
    });
    if (result === "invalid") return fail("That code doesn't exist. Check the 12 digits.");
    if (result === "used") return fail("That Cashpoint has already been redeemed.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setState("redeemed");
  };

  const paste = async () => {
    const text = await Clipboard.getStringAsync().catch(() => "");
    const digits = text.replace(/\D/g, "");
    if (digits.length >= LENGTH) {
      setCode(digits.slice(0, LENGTH));
      toast("Code pasted");
    } else toast("No 12-digit code on your clipboard", "danger");
  };

  const next = () => router.push("/done");
  const redeemed = state === "redeemed";

  return (
    <OnboardingShell
      title={redeemed ? "Your first deposit is in" : "Got a Cashpoint code?"}
      subtitle={redeemed ? `₦${DEMO_VALUE.toLocaleString("en-NG")} just landed in your Naira wallet. Spend it, swap it or send it on.` : "A friend made it with Naira. Redeem it now and start with money in your wallet."}
      scroll={false}
      right={
        redeemed ? undefined : (
          <PressableScale onPress={next} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip, I don't have a code">
            <Text variant="bodyStrong" tone="brand">
              Skip
            </Text>
          </PressableScale>
        )
      }
    >
      {code.length > 0 && <PrivacyGuard />}
      <RedeemTicket code={code} state={state} shakeKey={shakeKey} />
      {redeemed ? (
        <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.md }}>
          <Button title="Continue" onPress={next} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "center" }}>
            <Chip icon="copy" label="Paste code" onPress={paste} />
            <Chip icon="info" label="What's a Cashpoint?" onPress={explain} />
          </View>
          <View style={{ flex: 1, justifyContent: "flex-end", gap: spacing.sm, paddingBottom: spacing.sm }}>
            <NumberPad onKey={(d) => setCode((v) => (v.length < LENGTH ? v + d : v))} onDelete={() => setCode((v) => v.slice(0, -1))} />
            <Button title={full ? "Redeem Cashpoint" : `${LENGTH - code.length} digits to go`} variant="accent" disabled={!full} onPress={submit} />
          </View>
        </>
      )}
    </OnboardingShell>
  );
}
