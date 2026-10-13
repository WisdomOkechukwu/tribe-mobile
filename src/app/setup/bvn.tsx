import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Note } from "@/components/bits";
import { Button } from "@/components/button";
import { IdNumberEntry } from "@/components/id-number-entry";
import { Text } from "@/components/text";
import { SEED_USER } from "@/data/seed";
import { kycProvider, verifyWithQoreId } from "@/services/kyc";
import { BandSkip, OnboardingShell } from "@/screens/onboarding/shell";
import { exitSetup } from "@/utils/setup-flow";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { radius, spacing, useColors } from "@/theme";

type Step = "enter" | "confirm";

/**
 * Enter your BVN (SBU.png): number → we show the name on it ("Mismatch? Edit BVN") → Verify.
 * Mock in Expo Go / without a session URL; QoreID in real builds (see services/kyc.ts).
 */
export default function Bvn() {
  const c = useColors();
  const user = useSessionStore((s) => s.user);
  const setKyc = useSessionStore((s) => s.setKyc);
  const setSignup = useSignupStore((s) => s.set);
  const [bvn, setBvn] = useState("");
  const [step, setStep] = useState<Step>("enter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const digits = bvn.replace(/\D/g, "");
  // Demo lookup: the BVN "belongs" to the demo name. A real build gets this from Tribe's backend.
  const name = { first: SEED_USER.firstName, last: SEED_USER.lastName };

  const lookup = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep("confirm");
    }, 900);
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    if (kycProvider() === "mock") {
      setTimeout(() => {
        setKyc({ tier: 1, status: "approved", reference: `mock-${Date.now().toString(36)}` });
        setSignup({ bvnName: name });
        setBusy(false);
        router.replace("/setup/bvn-done");
      }, 1200);
      return;
    }
    try {
      const o = await verifyWithQoreId({ tier: 1, subjectRef: user.tag || user.phone, applicant: { firstName: name.first, lastName: name.last, phoneNumber: user.phone }, idNumber: digits });
      if (o.status === "approved" || o.status === "pending") {
        setKyc({ tier: o.status === "approved" ? 1 : undefined, status: o.status, reference: o.reference });
        setSignup({ bvnName: name });
        router.replace("/setup/bvn-done");
      } else setError(o.message ?? "We couldn't verify that BVN. Check it and try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      title={step === "enter" ? "Enter your BVN" : "Is this you?"}
      headline={step === "enter" ? ["Your BVN,", "please."] : ["Is this", "you?"]}
      icon="shield"
      stripes={false}
      right={step === "enter" ? <BandSkip onPress={exitSetup} /> : undefined}
      subtitle={step === "enter" ? "Use the BVN whose name matches your government ID." : "This is the name on the BVN you entered. It has to match your government ID."}
      footer={
        step === "enter" ? (
          <Button title="Proceed" disabled={digits.length !== 11} loading={busy} onPress={lookup} />
        ) : (
          <Button title="Verify BVN" loading={busy} onPress={verify} />
        )
      }
    >
      {step === "enter" ? (
        <IdNumberEntry label="BVN" value={digits} onChange={(v) => setBvn(v.slice(0, 11))} help="Dial *565*0# on your registered line to get it." />
      ) : (
        <View style={{ gap: spacing.md }}>
          <IdNumberEntry label="BVN" value={digits} onChange={() => {}} disabled />
          {/* the name on the BVN, to confirm */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Text variant="bodyStrong" tone="brand">
                {name.first[0]}
                {name.last[0]}
              </Text>
            </View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="caption" tone="muted">
                Name on this BVN
              </Text>
              <Text variant="headline">
                {name.first} {name.last}
              </Text>
            </View>
            <Icon name="checkCircle" size={22} color={c.success} />
          </View>
          <PressableScale onPress={() => setStep("enter")} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: spacing.xs }}>
            <Text variant="subhead" tone="muted">
              Not you? <Text variant="subhead" tone="brand">Edit BVN</Text>
            </Text>
          </PressableScale>
          <Note icon="info">Your face will be matched to the photo on this BVN, so make sure it&apos;s yours.</Note>
        </View>
      )}
      {error && <Note icon="warning" tone="warning">{error}</Note>}
    </OnboardingShell>
  );
}
