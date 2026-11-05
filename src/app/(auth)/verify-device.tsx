import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { verifyNewDevice } from "@/api/auth";
import { ApiError, errorMessage } from "@/api/http";
import { Note } from "@/components/bits";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { AuthShell } from "@/screens/auth/shell";
import { DevCodeHint } from "@/screens/auth/dev-code";
import { useSignupStore } from "@/stores/use-signup-store";
import { toast } from "@/stores/use-ui-store";
import { spacing, useColors } from "@/theme";
import { maskEmail } from "@/utils/hash";

const LENGTH = 6;

/**
 * "Verify this phone": signing in on a phone that isn't the account's active one. Tribe emails a
 * 6-digit code; entering it (POST auth/device/verify) makes THIS phone the active one and signs
 * the old phone out. Getting a new code means signing in again (the password is needed for it),
 * so "Send a new code" goes back to sign-in.
 */
export default function VerifyDevice() {
  const c = useColors();
  const { id = "", email = "" } = useLocalSearchParams<{ id?: string; email?: string }>();
  const debugCode = useSignupStore((s) => s.debugCode);
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "error" | "ok">("idle");
  const checking = state === "idle" && code.length === LENGTH;
  const [message, setMessage] = useState<string | null>(null);
  // a full code is being checked until the API answers (ok / error)

  useEffect(() => {
    if (code.length !== LENGTH) return;
    let alive = true;
    verifyNewDevice(id, code)
      .then(() => {
        if (!alive) return;
        setState("ok");
        useSignupStore.getState().set({ debugCode: null });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        toast("This phone is now your Tribe phone", "success");
        // signed in: the route guard takes over
      })
      .catch((e) => {
        if (!alive) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setState("error");
        setMessage(e instanceof ApiError && e.status === 422 ? (e.field("code") ?? "That code is wrong or has expired.") : errorMessage(e));
        setTimeout(() => {
          setState("idle");
          setCode("");
        }, 700);
      });
    return () => {
      alive = false;
    };
  }, [code, id]);

  return (
    <AuthShell band="compact" kicker="New phone" headline={["Verify this", "phone."]} subtitle={`For your security, enter the ${LENGTH}-digit code we emailed to ${maskEmail(email)}.`} scroll={false} back>
      <PinCells length={LENGTH} value={code} masked={false} error={state === "error"} success={state === "ok"} />
      <View style={{ alignItems: "center", minHeight: 22, gap: spacing.xs }}>
        {checking || state === "ok" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <ActivityIndicator size="small" color={c.brandText} />
            <Text variant="subhead" tone="brand">
              {state === "ok" ? "Signing you in…" : "Checking…"}
            </Text>
          </View>
        ) : message ? (
          <Text variant="subhead" tone="danger" align="center">
            {message}
          </Text>
        ) : (
          <PressableScale onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
            <Text variant="subhead" tone="brand">
              Send a new code
            </Text>
          </PressableScale>
        )}
        <DevCodeHint code={debugCode} />
      </View>
      <Note icon="lock">Your other phone will be signed out. Only one phone can use your Tribe account at a time.</Note>
      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.md }}>
        <NumberPad
          onKey={(d) => {
            setMessage(null);
            setCode((v) => (v.length < LENGTH && state === "idle" ? v + d : v));
          }}
          onDelete={() => setCode((v) => (state === "idle" && !checking ? v.slice(0, -1) : v))}
        />
      </View>
    </AuthShell>
  );
}
