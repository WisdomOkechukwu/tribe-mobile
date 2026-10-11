import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { PasswordField } from "@/components/password-field";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { AuthShell, SwitchLink } from "@/screens/auth/shell";
import { useSessionStore } from "@/stores/use-session-store";
import { withLoader } from "@/stores/use-ui-store";
import { spacing, useColors } from "@/theme";
import { isEmail } from "@/utils/hash";

/**
 * Sign in (Sign in.png, devnote 1): after a log-out it's just email and password — no
 * biometrics here. Face ID / the lock PIN live on the lock screen, for returning-from-idle.
 * Tribe's brand band + sheet (AuthShell) instead of the mockup's plain white page.
 */
export default function SignIn() {
  const c = useColors();
  const remembered = useSessionStore((s) => s.rememberedEmail);
  const reason = useSessionStore((s) => s.signOutReason);
  const signIn = useSessionStore((s) => s.signIn);
  const [email, setEmail] = useState(remembered ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ field: "email" | "password"; message: string } | null>(null);
  const valid = isEmail(email) && password.length > 0;

  const submit = async () => {
    setError(null);
    const r = await withLoader("Signing you in…", () => signIn(email, password));
    if (r === "no-email") setError({ field: "email", message: "We can't find an account with that email." });
    else if (r === "wrong-password") setError({ field: "password", message: "That password isn't right. Try again or reset it." });
    // "ok" flips the route guard: setup or Home takes over
  };

  const subtitle = reason === "lock" ? "For your security, sign in with your password." : reason === "password-reset" ? "Sign in with your new password." : "Pick up right where you left off. Sign in with your email and password.";

  return (
    <AuthShell
      kicker="Welcome back"
      headline={["Good to see", "you again."]}
      subtitle={subtitle}
      back={router.canGoBack()}
      footer={
        <>
          <Button title="Sign in" disabled={!valid} onPress={submit} />
          <SwitchLink prompt="New to Tribe?" action="Create an account" onPress={() => router.push("/create-account")} />
        </>
      }
    >
      <View style={{ gap: spacing.smd }}>
        <Field
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error?.field === "email") setError(null);
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

