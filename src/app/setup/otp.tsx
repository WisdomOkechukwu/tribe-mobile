import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { OnboardingShell } from "@/screens/onboarding/shell";
import { spacing } from "@/theme";

const LENGTH = 6;

/** Segmented 6-digit code. Prototype: any 6 digits verify (no SMS backend yet). */
export default function Otp() {
  const { phone = "" } = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => {
    if (code.length !== LENGTH) return;
    const t = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push({ pathname: "/setup/phone-done", params: { phone } });
      setCode("");
    }, 650);
    return () => clearTimeout(t);
  }, [code, phone]);

  const verifying = code.length === LENGTH;

  return (
    <OnboardingShell icon="phone" title="We've sent a code" headline={["Check your", "texts."]} subtitle={`Enter the 6-digit one-time password we sent to ${phone}.`} scroll={false}>
      <PinCells length={LENGTH} value={code} masked={false} />
      <View style={{ alignItems: "center", minHeight: 22 }}>
        {verifying ? (
          <Text variant="subhead" tone="brand">
            Checking…
          </Text>
        ) : seconds > 0 ? (
          <Text variant="subhead" tone="muted">
            Resend code in 0:{String(seconds).padStart(2, "0")}
          </Text>
        ) : (
          <PressableScale onPress={() => setSeconds(30)} hitSlop={10}>
            <Text variant="subhead" tone="brand">
              Resend code
            </Text>
          </PressableScale>
        )}
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.md }}>
        <NumberPad onKey={(d) => setCode((v) => (v.length < LENGTH ? v + d : v))} onDelete={() => setCode((v) => v.slice(0, -1))} />
      </View>
    </OnboardingShell>
  );
}
