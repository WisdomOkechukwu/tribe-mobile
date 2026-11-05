import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { signIn } from "@/api/auth";
import { ApiError, errorMessage } from "@/api/http";
import { Note } from "@/components/bits";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { PasswordField } from "@/components/password-field";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { AuthShell, SwitchLink } from "@/screens/auth/shell";
import { useIsOnline } from "@/services/network";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { spacing, useColors } from "@/theme";
import { isEmail } from "@/utils/hash";

const REASON_LINE: Record<string, string> = {
  "password-reset": "Sign in with your new password.",
  "device-replaced": "You signed in on another phone, so this one was signed out. Sign in again to use Tribe here.",
  "session-expired": "Your session ended. Sign in again to pick up where you left off.",
};

/**
 * Sign in (Sign in.png, devnote 1): email and password. A phone that isn't the account's active
 * one gets a 6-digit code by email first (`/verify-device`). Face ID approves payments only;
 * there's no app lock.
 */
export default function SignIn() {
  const c = useColors();
  const remembered = useSessionStore((s) => s.rememberedEmail);
  const reason = useSessionStore((s) => s.signOutReason);
  const online = useIsOnline();
  const [email, setEmail] = useState(remembered ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: "email" | "password" | "form"; message: string } | null>(null);
  const valid = isEmail(email) && password.length > 0;

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = await signIn(email, password);
      if (r.next === "verify_new_device") {
        useSignupStore.getState().set({ debugCode: r.debugCode ?? null });
        router.push({ pathname: "/verify-device", params: { id: r.verificationId, email: r.email } });
      }
      // "home" flips the route guard: setup or Home takes over
    } catch (e) {
      if (e instanceof ApiError && (e.code === "INVALID_CREDENTIALS" || e.status === 401)) setError({ field: "password", message: "That email and password don't match. Try again or reset it." });
      else if (e instanceof ApiError && e.field("email")) setError({ field: "email", message: e.field("email")! });
      else setError({ field: "form", message: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const subtitle = (reason && REASON_LINE[reason]) ?? "Pick up right where you left off. Sign in with your email and password.";

  return (
    <AuthShell
      kicker="Welcome back"
      headline={["Good to see", "you again."]}
      subtitle={subtitle}
      back={router.canGoBack()}
      footer={
        <>
          <Button title={online ? "Sign in" : "You're offline"} disabled={!valid || !online} loading={busy} onPress={submit} />
          <SwitchLink prompt="New to Tribe?" action="Create an account" onPress={() => router.push("/create-account")} />
        </>
      }
    >
      <View style={{ gap: spacing.smd }}>
        {error?.field === "form" && <Note icon="warning">{error.message}</Note>}
        <Field
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error?.field !== "password") setError(null);
          }}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          leading={<Icon name="envelope" size={16} color={c.textMuted} />}
          hint={error?.field === "email" ? error.message : undefined}
          hintTone="danger"
        />
        <PasswordField
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (error?.field === "password") setError(null);
          }}
          placeholder="Password"
          onSubmitEditing={valid ? submit : undefined}
          returnKeyType="go"
          hint={error?.field === "password" ? error.message : undefined}
          hintTone="danger"
        />
        <PressableScale onPress={() => router.push({ pathname: "/forgot", params: { email } })} hitSlop={10} accessibilityRole="link" style={{ alignSelf: "flex-end" }}>
          <Text variant="subhead" tone="brand">
            Forgot password?
          </Text>
        </PressableScale>
      </View>
    </AuthShell>
  );
}
