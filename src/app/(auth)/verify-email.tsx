import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { sendEmailCode, verifyEmailCode } from "@/api/auth";
import { ApiError, errorMessage } from "@/api/http";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { EMAIL_CODE_LENGTH } from "@/data/security";
import { AuthShell } from "@/screens/auth/shell";
import { DevCodeHint } from "@/screens/auth/dev-code";
import { useSignupStore } from "@/stores/use-signup-store";
import { toast } from "@/stores/use-ui-store";
import { spacing, useColors } from "@/theme";
import { maskEmail } from "@/utils/hash";


/** The API's refusal, in the app's words. */
function codeError(e: unknown) {
  if (e instanceof ApiError && e.code === "TOO_MANY_CODES") return "Too many codes today. Try again tomorrow, or contact support.";
  if (e instanceof ApiError && (e.status === 422 || e.status === 400)) return e.field("code") ?? "That code is wrong or has expired.";
  return errorMessage(e);
}

/**
 * "We've sent you a code" (Create Account.png / Forgot Password.png): 6 cells, "Resend code"
 * available straight away (no timer), red + shake for a bad code, green for a good one. The code is checked by the API
 * (POST auth/email/verify), which hands back a token for the next step. Asking for a new code
 * makes the old one stop working.
 */
export default function VerifyEmail() {
  const c = useColors();
  const { mode = "signup", email: paramEmail } = useLocalSearchParams<{ mode?: "signup" | "reset"; email?: string }>();
  const draftEmail = useSignupStore((s) => s.draft.email);
  const debugCode = useSignupStore((s) => s.debugCode);
  const email = paramEmail ?? draftEmail;
  const purpose = mode === "reset" ? "password_reset" : "signup";
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "error" | "ok">("idle");
  const checking = state === "idle" && code.length === EMAIL_CODE_LENGTH;
  const [message, setMessage] = useState<string | null>(null);
  // a full code is being checked until the API answers (ok / error)
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (code.length !== EMAIL_CODE_LENGTH) return;
    let alive = true;
    verifyEmailCode(email, code, purpose)
      .then((token) => {
        if (!alive) return;
        useSignupStore.getState().set({ verificationToken: token });
        setState("ok");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        // a beat on the green cells, then on
        setTimeout(() => {
          if (mode === "reset") router.push({ pathname: "/password", params: { mode: "reset", email } });
          else router.push("/details");
          setState("idle");
          setCode("");
        }, 450);
      })
      .catch((e) => {
        if (!alive) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setState("error");
        setMessage(codeError(e));
        setTimeout(() => {
          setState("idle");
          setCode("");
        }, 700);
      });
    return () => {
      alive = false;
    };
  }, [code, mode, email, purpose]);

  const resend = async () => {
    setResending(true);
    setMessage(null);
    try {
      const { debugCode: fresh } = await sendEmailCode(email, purpose);
      useSignupStore.getState().set({ debugCode: fresh ?? null });
      toast("New code sent. The last one no longer works.");
    } catch (e) {
      setMessage(codeError(e));
    } finally {
      setResending(false);
    }
  };

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
      <View style={{ alignItems: "center", minHeight: 22, gap: spacing.xs }}>
        {checking ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <ActivityIndicator size="small" color={c.brandText} />
            <Text variant="subhead" tone="brand">
              Checking…
            </Text>
          </View>
        ) : state === "ok" ? (
          <Text variant="subhead" tone="success">
            Email verified
          </Text>
        ) : message ? (
          <Text variant="subhead" tone="danger" align="center">
            {message}
          </Text>
        ) : null}
        {/* no countdown: a new code can be asked for straight away (the API cancels the old one) */}
        {!checking && state !== "ok" && (
          <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "center" }}>
            <Text variant="subhead" tone="muted">
              Didn&apos;t get it?
            </Text>
            {resending ? (
              <ActivityIndicator size="small" color={c.brandText} />
            ) : (
              <PressableScale onPress={resend} hitSlop={10} accessibilityRole="button">
                <Text variant="subhead" tone="brand">
                  Resend
                </Text>
              </PressableScale>
            )}
          </View>
        )}
        <DevCodeHint code={debugCode} />
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.md }}>
        <NumberPad
          onKey={(d) => {
            setMessage(null);
            setCode((v) => (v.length < EMAIL_CODE_LENGTH && state === "idle" ? v + d : v));
          }}
          onDelete={() => setCode((v) => (state === "idle" && !checking ? v.slice(0, -1) : v))}
        />
      </View>
    </AuthShell>
  );
}
