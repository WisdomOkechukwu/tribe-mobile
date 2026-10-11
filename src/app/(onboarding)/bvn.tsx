import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Note } from "@/components/bits";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Text } from "@/components/text";
import { SEED_USER } from "@/data/seed";
import { kycProvider, verifyWithQoreId } from "@/services/kyc";
import { OnboardingShell } from "@/screens/onboarding/shell";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { spacing } from "@/theme";

type Step = "enter" | "confirm";

/**
 * Enter your BVN (SBU.png): number → we show the name on it ("Mismatch? Edit BVN") → Verify.
 * Mock in Expo Go / without a session URL; QoreID in real builds (see services/kyc.ts).
 */
export default function Bvn() {
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
        setSignup({ identityVerified: true, bvnName: name });
        setBusy(false);
        router.replace("/bvn-done");
      }, 1200);
      return;
    }
    try {
      const o = await verifyWithQoreId({ tier: 1, subjectRef: user.tag || user.phone, applicant: { firstName: name.first, lastName: name.last, phoneNumber: user.phone }, idNumber: digits });
      if (o.status === "approved" || o.status === "pending") {
        setKyc({ tier: o.status === "approved" ? 1 : undefined, status: o.status, reference: o.reference });
        setSignup({ identityVerified: true, bvnName: name });
        router.replace("/bvn-done");
      } else setError(o.message ?? "We couldn't verify that BVN. Check it and try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      icon="shield"
      title="Enter your BVN"
      subtitle="Use the BVN whose name matches your government-issued ID. You'll verify your identity against this name."
      footer={
        step === "enter" ? (
          <Button title="Proceed" disabled={digits.length !== 11} loading={busy} onPress={lookup} />
        ) : (
          <Button title="Verify BVN" loading={busy} onPress={verify} />
        )
      }
    >
      <Field value={bvn} onChangeText={(v) => setBvn(v.replace(/\D/g, "").slice(0, 11))} placeholder="Bank Verification Number" keyboardType="number-pad" editable={step === "enter"} mono hint={step === "enter" ? "Dial *565*0# on your registered line to get it." : undefined} />
      {step === "confirm" && (
        <View style={{ gap: spacing.sm }}>
          <Field value={`${name.first} ${name.last}`} editable={false} />
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 4 }}>
            <Text variant="subhead" tone="muted">
              Mismatch?
            </Text>
            <Pressable onPress={() => setStep("enter")} hitSlop={8} accessibilityRole="button">
              <Text variant="subhead" tone="brand">
                Edit BVN
              </Text>
            </Pressable>
          </View>
          <Note icon="info">Make sure your BVN name matches your government-issued ID, and that your face matches your ID photo.</Note>
        </View>
      )}
      {error && <Note icon="warning" tone="warning">{error}</Note>}
    </OnboardingShell>
  );
}
