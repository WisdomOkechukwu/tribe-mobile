import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { DEMO } from "@/data/seed";
import { EMAIL_CODE_LENGTH } from "@/data/security";
import { AuthShell } from "@/screens/auth/shell";
import { useSignupStore } from "@/stores/use-signup-store";
import { toast } from "@/stores/use-ui-store";
import { spacing } from "@/theme";
import { maskEmail } from "@/utils/hash";

const RESEND_S = 60;

/**
 * "We've sent you a code" (Create Account.png / Forgot Password.png): 4 cells, a 60s resend
 * timer, red + shake for a bad code, green for a good one. Prototype: any code but 0000 works.
 */
export default function VerifyEmail() {
  const { mode = "signup", email: paramEmail } = useLocalSearchParams<{ mode?: "signup" | "reset"; email?: string }>();
  const draftEmail = useSignupStore((s) => s.draft.email);
  const email = paramEmail ?? draftEmail;
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "error" | "ok">("idle");
  const [seconds, setSeconds] = useState(RESEND_S);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => {
    if (code.length !== EMAIL_CODE_LENGTH) return;
    const t = setTimeout(() => {
      if (code === DEMO.badEmailCode) {
        setState("error");
        toast("That code is wrong or has expired", "danger");
        setTimeout(() => {
          setState("idle");
          setCode("");
        }, 700);
        return;
      }
      setState("ok");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => {
        if (mode === "reset") router.push({ pathname: "/password", params: { mode: "reset", email } });
        else router.push("/details");
        setState("idle");
        setCode("");
      }, 550);
    }, 200);
    return () => clearTimeout(t);
  }, [code, mode, email]);

  return (
    <AuthShell
      band="compact"
      step={mode === "signup" ? { at: 1, of: 3 } : undefined}
      kicker={mode === "reset" ? "Reset password" : undefined}
      headline={["Check your", "inbox."]}
      subtitle={`Enter the ${EMAIL_CODE_LENGTH}-digit code we sent to ${maskEmail(email)}.`}
      scroll={false}
    >
      <PinCells length={EMAIL_CODE_LENGTH} value={code} masked={false} error={state === "error"} success={state === "ok"} />
      <View style={{ alignItems: "center", minHeight: 22 }}>
        {state === "ok" ? (
          <Text variant="subhead" tone="success">
            Email verified
          </Text>
        ) : seconds > 0 ? (
          <Text variant="subhead" tone="muted">
            Resend code in 0:{String(seconds).padStart(2, "0")}
          </Text>
        ) : (
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Text variant="subhead" tone="muted">
              Didn&apos;t get it?
            </Text>
            <PressableScale
              onPress={() => {
                setSeconds(RESEND_S);
                toast("New code sent");
              }}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text variant="subhead" tone="brand">
                Resend
              </Text>
            </PressableScale>
          </View>
        )}
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.md }}>
        <NumberPad onKey={(d) => setCode((v) => (v.length < EMAIL_CODE_LENGTH && state === "idle" ? v + d : v))} onDelete={() => setCode((v) => v.slice(0, -1))} />
      </View>
    </AuthShell>
  );
}
