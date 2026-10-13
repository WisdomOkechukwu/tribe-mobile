import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import Animated, { cancelAnimation, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Button } from "@/components/button";
import { Card } from "@/components/bits";
import { Icon, type IconName } from "@/components/icon";
import { IdNumberEntry } from "@/components/id-number-entry";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { TierUnlockedArt } from "@/components/verified-art";
import { Perks } from "@/screens/onboarding/shell";
import { kycProvider, TIER_INFO, verifyWithQoreId, type KycOutcome } from "@/services/kyc";
import { TIER_LIMITS, useSessionStore, type KycTier } from "@/stores/use-session-store";
import { palette, radius, spacing, useColors } from "@/theme";

type Step = "intro" | "id" | "selfie" | "processing" | "result";

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: string }) {
  const c = useColors();
  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: "row", gap: spacing.smd, alignItems: "flex-start" }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: checked ? palette.purple[500] : c.borderStrong, backgroundColor: checked ? palette.purple[500] : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        {checked && <Icon name="check" size={14} color="#fff" weight="bold" />}
      </View>
      <Text variant="label" tone="muted" style={{ flex: 1 }}>
        {children}
      </Text>
    </PressableScale>
  );
}

function SelfieFrame() {
  const c = useColors();
  const reduce = useReducedMotion();
  const scan = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    scan.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
    return () => cancelAnimation(scan);
  }, [scan, reduce]);
  const line = useAnimatedStyle(() => ({ top: `${10 + scan.value * 80}%` }));
  return (
    <View style={{ alignSelf: "center", width: 220, height: 280, borderRadius: 120, borderWidth: 4, borderColor: palette.purple[500], overflow: "hidden", backgroundColor: c.sunken, alignItems: "center", justifyContent: "center" }}>
      <Icon name="person" size={110} color={c.borderStrong} weight="regular" />
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, height: 3, backgroundColor: palette.orange[500], boxShadow: "0 0 12px rgba(255,98,32,0.9)" }, line]} />
    </View>
  );
}

/** What each tier switches on, as perk rows. */
const UNLOCKS: Record<Exclude<KycTier, 0>, { icon: IconName; title: string; body: string }[]> = {
  1: [
    { icon: "send", title: "Bigger sends", body: "Move up to ₦1,000,000 a day." },
    { icon: "bolt", title: "Bills, no stress", body: "Airtime, data, TV and light with room to spare." },
    { icon: "swap", title: "Swap more", body: "Naira, dollars and crypto at higher limits." },
  ],
  2: [
    { icon: "card", title: "Virtual dollar cards", body: "Netflix, Spotify, Apple and any site online." },
    { icon: "bitcoin", title: "Crypto withdrawals", body: "Send your coins to any wallet." },
    { icon: "cashpoint", title: "Bigger Cashpoints", body: "Make codes for larger amounts." },
  ],
  3: [
    { icon: "globe", title: "Wallets in any currency", body: "Open USD, GBP, EUR, crypto and more." },
    { icon: "gauge", title: "Highest limits", body: "Up to ₦25,000,000 a day." },
    { icon: "verified", title: "Fully verified", body: "Every feature on Tribe is now yours." },
  ],
};

/** Approved: the level badge, what changed (limits before → after), what's unlocked, and what's next. */
function TierUnlocked({ tier, onDone }: { tier: Exclude<KycTier, 0>; onDone: () => void }) {
  const c = useColors();
  const before = TIER_LIMITS[(tier - 1) as KycTier];
  const after = TIER_LIMITS[tier];
  const next = tier < 3 ? TIER_INFO[(tier + 1) as Exclude<KycTier, 0>] : null;
  return (
    <View style={{ flex: 1, gap: spacing.md }}>
      <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.md }}>
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <TierUnlockedArt tier={tier} scale={0.92} />
          <Animated.View entering={FadeIn.delay(200)} style={{ alignItems: "center", gap: spacing.xs }}>
            <Text variant="overline" tone="brand">
              Tier {tier} unlocked
            </Text>
            <Text variant="title" align="center">
              You levelled up.
            </Text>
          </Animated.View>
        </View>

        {/* what changed: limits before → after */}
        <View style={{ flexDirection: "row", gap: spacing.smd }}>
          {(
            [
              ["Daily limit", before.daily, after.daily],
              ["Max balance", before.balance, after.balance],
            ] as const
          ).map(([label, from, to]) => (
            <View key={label} style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.xs }}>
              <Text variant="caption" tone="muted">
                {label}
              </Text>
              <Text variant="headline" style={{ color: c.success }} adjustsFontSizeToFit numberOfLines={1}>
                {to}
              </Text>
              {from !== to && (
                <Text variant="caption" tone="subtle" style={{ textDecorationLine: "line-through" }}>
                  {from}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
            Now unlocked
          </Text>
          <Perks items={UNLOCKS[tier]} />
        </View>

        {next && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.brandSoft, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
              <Text variant="bodyStrong" style={{ color: c.onBrand }}>
                {tier + 1}
              </Text>
            </View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="bodyStrong">Next up: {next.title}</Text>
              <Text variant="caption" tone="muted">
                {next.unlocks}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      <Button title="Let's go" onPress={onDone} />
    </View>
  );
}

/**
 * One verification run for a tier. Native builds hand off to QoreID; Expo Go runs a branded
 * stand-in (same steps, no real check) so the whole app stays demoable.
 */
export function VerifyFlow({ tier, onFinished, onSkip }: { tier: Exclude<KycTier, 0>; onFinished: (outcome: KycOutcome) => void; onSkip?: () => void }) {
  const c = useColors();
  const info = TIER_INFO[tier];
  const user = useSessionStore((s) => s.user);
  const setKyc = useSessionStore((s) => s.setKyc);
  const provider = kycProvider();
  const [step, setStep] = useState<Step>("intro");
  const [consent, setConsent] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [outcome, setOutcome] = useState<KycOutcome | null>(null);

  const finish = (o: KycOutcome) => {
    setOutcome(o);
    setStep("result");
    if (o.status === "approved") setKyc({ tier, status: "approved", reference: o.reference });
    else if (o.status === "pending") setKyc({ status: "pending", reference: o.reference });
    else if (o.status === "failed") setKyc({ status: "failed", reference: o.reference });
    Haptics.notificationAsync(o.status === "failed" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const start = async () => {
    if (provider === "mock") {
      setStep(info.idLength ? "id" : tier >= 2 ? "selfie" : "processing");
      return;
    }
    setStep("processing");
    try {
      finish(await verifyWithQoreId({ tier, subjectRef: user.tag, applicant: { firstName: user.firstName, lastName: user.lastName, phoneNumber: user.phone, email: user.email } }));
    } catch (e) {
      finish({ status: "failed", reference: null, message: e instanceof Error ? e.message : "Verification is unavailable right now." });
    }
  };

  // Mock: after the capture steps, "process" for a beat then approve.
  useEffect(() => {
    if (provider !== "mock" || step !== "processing") return;
    const t = setTimeout(() => finish({ status: "approved", reference: `mock-${Date.now().toString(36)}` }), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, provider]);

  if (step === "intro") {
    return (
      <View style={{ gap: spacing.lg, flex: 1 }}>
        <Card tone="brandSoft" style={{ gap: spacing.smd }}>
          <Text variant="overline" tone="brand">
            You&apos;ll need
          </Text>
          {info.needs.map((n) => (
            <View key={n} style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
              <Icon name="check" size={16} color={c.brandText} weight="bold" />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {n}
              </Text>
            </View>
          ))}
        </Card>
        <View style={{ gap: spacing.sm }}>
          {(
            [
              ["verified", info.unlocks],
              ["shield", `New daily limit: ${TIER_LIMITS[tier].daily}`],
              ["lock", "Checked securely by QoreID, our licensed identity partner. We never sell your data."],
            ] as [IconName, string][]
          ).map(([icon, text]) => (
            <View key={text} style={{ flexDirection: "row", gap: spacing.smd, alignItems: "center" }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name={icon} size={16} color={c.accentText} />
              </View>
              <Text variant="body" tone="muted" style={{ flex: 1 }}>
                {text}
              </Text>
            </View>
          ))}
        </View>
        {tier >= 2 && (
          <Card tone="sunken" style={{ gap: spacing.xs }}>
            <Text variant="label">Selfie tips</Text>
            <Text variant="caption" tone="muted">
              Good light, face the camera, no glasses or caps. It takes about 10 seconds.
            </Text>
          </Card>
        )}
        <View style={{ flex: 1 }} />
        <Checkbox checked={consent} onChange={setConsent}>
          I agree to Tribe and QoreID checking my identity details against official records for this verification.
        </Checkbox>
        <Button title="Start verification" disabled={!consent} onPress={start} />
        {onSkip && <Button title="Skip for now" variant="ghost" onPress={onSkip} />}
      </View>
    );
  }

  if (step === "id") {
    return (
      <View style={{ gap: spacing.md, flex: 1 }}>
        <IdNumberEntry
          label={info.idLabel}
          length={info.idLength}
          value={idNumber}
          onChange={setIdNumber}
          help={info.idLabel === "BVN" ? "Dial *565*0# on the line linked to your bank to get it." : "It's on your NIN slip or in the NIMC app."}
        />
        <Button title="Continue" disabled={idNumber.length !== info.idLength} onPress={() => setStep(tier >= 2 ? "selfie" : "processing")} />
      </View>
    );
  }

  if (step === "selfie") {
    return (
      <View style={{ gap: spacing.lg, flex: 1 }}>
        <Text variant="body" tone="muted">
          Position your face in the frame and hold still.
        </Text>
        <SelfieFrame />
        {provider === "mock" && (
          <Text variant="caption" tone="subtle" align="center">
            Demo mode: no photo is taken in Expo Go.
          </Text>
        )}
        <View style={{ flex: 1 }} />
        <Button title="Capture" icon="camera" onPress={() => setStep("processing")} />
      </View>
    );
  }

  if (step === "processing") {
    return (
      <Animated.View entering={FadeIn} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
        <ActivityIndicator size="large" color={c.brand} />
        <Text variant="heading">Checking your details…</Text>
        <Text variant="body" tone="muted" align="center">
          This usually takes a few seconds.
        </Text>
      </Animated.View>
    );
  }

  const o = outcome!;
  const look = {
    approved: { icon: "verified" as IconName, bg: c.successSoft, fg: c.success, title: `Tier ${tier} unlocked`, body: info.unlocks },
    pending: { icon: "clock" as IconName, bg: c.warningSoft, fg: c.text, title: "Submitted", body: o.message ?? "We're confirming your details and will notify you." },
    failed: { icon: "warning" as IconName, bg: c.dangerSoft, fg: c.danger, title: "We couldn't verify you", body: o.message ?? "Check your details and try again." },
    cancelled: { icon: "info" as IconName, bg: c.sunken, fg: c.textMuted, title: "Verification cancelled", body: "You can pick this up any time from your profile." },
  }[o.status];
  if (o.status === "approved") return <TierUnlocked tier={tier} onDone={() => onFinished(o)} />;
  return (
    <Animated.View entering={FadeIn} style={{ flex: 1, gap: spacing.lg }}>
      <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: look.bg, alignItems: "center", justifyContent: "center" }}>
          <Icon name={look.icon} size={44} color={look.fg} />
        </View>
        <Text variant="title" align="center">
          {look.title}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {look.body}
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      {o.status === "failed" ? (
        <>
          <Button title="Try again" onPress={() => setStep("intro")} />
          <Button title="Later" variant="ghost" onPress={() => onFinished(o)} />
        </>
      ) : (
        <Button title="Continue" onPress={() => onFinished(o)} />
      )}
      <View style={{ height: spacing.xs, borderRadius: radius.full }} />
    </Animated.View>
  );
}
