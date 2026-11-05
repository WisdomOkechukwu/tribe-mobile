import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { OnboardingShell } from "@/screens/onboarding/shell";
import { spacing, useColors } from "@/theme";
import { codeWaitMinutes, sendPhoneCode, verifyPhone } from "@/api/auth";
import { ApiError, errorMessage } from "@/api/http";
import { DevCodeHint } from "@/screens/auth/dev-code";
import { useSignupStore } from "@/stores/use-signup-store";
import { toast } from "@/stores/use-ui-store";

const LENGTH = 6;

/**
 * Segmented 6-digit code, checked by the API (POST phone/verify). "Resend code" is there straight
 * away (no countdown); a new code replaces the old one on the server, so only the latest works.
 */
export default function Otp() {
  const { phone = "" } = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const debugCode = useSignupStore((s) => s.debugCode);
  const c = useColors();

  useEffect(() => {
    if (code.length !== LENGTH) return;
    let alive = true;
    verifyPhone(code)
      .then(() => {
        if (!alive) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.push({ pathname: "/setup/phone-done", params: { phone } });
        setCode("");
      })
      .catch((e) => {
        if (!alive) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError(e instanceof ApiError && e.status === 422 ? (e.field("code") ?? "That code is wrong or has expired.") : errorMessage(e));
        setCode("");
      });
    return () => {
      alive = false;
    };
  }, [code, phone]);

  const verifying = code.length === LENGTH;

  const resend = () => {
    setResending(true);
    setError(null);
    sendPhoneCode(phone)
      .then(({ debugCode: fresh }) => {
        useSignupStore.getState().set({ debugCode: fresh ?? null });
        toast("New code sent. The last one no longer works.");
      })
      .catch((e) => {
        const minutes = codeWaitMinutes(e);
        setError(minutes ? `Too many codes. Try again in ${minutes} min.` : errorMessage(e));
      })
      .finally(() => setResending(false));
  };

  return (
    <OnboardingShell icon="phone" title="We've sent a code" headline={["Check your", "texts."]} subtitle={`Enter the 6-digit one-time password we sent to ${phone}.`} scroll={false}>
      <PinCells length={LENGTH} value={code} masked={false} />
      <View style={{ alignItems: "center", minHeight: 22 }}>
        {verifying ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <ActivityIndicator size="small" color={c.brandText} />
            <Text variant="subhead" tone="brand">
              Checking…
            </Text>
          </View>
        ) : error ? (
          <Text variant="subhead" tone="danger" align="center">
            {error}
          </Text>
        ) : (
          <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "center" }}>
            <Text variant="subhead" tone="muted">
              Didn&apos;t get it?
            </Text>
            {resending ? (
              <ActivityIndicator size="small" color={c.brandText} />
            ) : (
              <PressableScale onPress={resend} hitSlop={10} accessibilityRole="button">
                <Text variant="subhead" tone="brand">
                  Resend code
                </Text>
              </PressableScale>
            )}
          </View>
        )}
      </View>
      <DevCodeHint code={debugCode} />
      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.md }}>
        <NumberPad
          onKey={(d) => {
            setError(null);
            setCode((v) => (v.length < LENGTH ? v + d : v));
          }} onDelete={() => setCode((v) => v.slice(0, -1))} />
      </View>
    </OnboardingShell>
  );
}
