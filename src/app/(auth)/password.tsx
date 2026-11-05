import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { PasswordField } from "@/components/password-field";
import { PasswordRules } from "@/components/password-rules";
import { passwordOk } from "@/data/security";
import { AuthShell } from "@/screens/auth/shell";
import { register, resetPassword } from "@/api/auth";
import { ApiError, errorMessage } from "@/api/http";
import { Note } from "@/components/bits";
import { useIsOnline } from "@/services/network";
import { useSignupStore } from "@/stores/use-signup-store";
import { spacing } from "@/theme";

/**
 * Create password — step 3 of sign-up, or "Create a new password" after a reset code
 * (Create Account.png / Forgot Password.png). Rules tick green as you type.
 */
export default function Password() {
  const { mode = "signup", email = "" } = useLocalSearchParams<{ mode?: "signup" | "reset"; email?: string }>();
  const draft = useSignupStore((s) => s.draft);
  const token = useSignupStore((s) => s.verificationToken);
  const online = useIsOnline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [strict, setStrict] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== pw;
  const reset = mode === "reset";

  const submit = async () => {
    if (!passwordOk(pw)) return setStrict(true);
    if (pw !== confirm) return;
    if (!token) return setError("Your email check expired. Go back and enter a new code.");
    setBusy(true);
    setError(null);
    try {
      if (reset) {
        await resetPassword(email, token, pw);
        router.replace("/password-done");
        return;
      }
      await register(draft, pw, token);
      useSignupStore.getState().set({ verificationToken: null, debugCode: null });
      // signed in now: the route guard moves on to "pick your world"
    } catch (e) {
      // a taken @tag / phone shows on the details step; anything else here
      if (e instanceof ApiError && (e.field("tag") || e.field("phone") || e.field("first_name") || e.field("last_name"))) {
        setError(e.field("tag") ?? e.field("phone") ?? e.field("first_name") ?? e.field("last_name") ?? null);
      } else setError(e instanceof ApiError && e.field("password") ? e.field("password")! : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      band="compact"
      step={reset ? undefined : { at: 3, of: 3 }}
      kicker={reset ? "Reset password" : undefined}
      headline={reset ? ["Set a new", "password."] : ["Set a strong", "password."]}
      subtitle={reset ? "Pick one you haven't used on Tribe before." : "Protect your account with a password only you know."}
      footer={<Button title={!online ? "You're offline" : reset ? "Change password" : "Create account"} disabled={!pw || !confirm || mismatch || !online} loading={busy} onPress={submit} />}
    >
      <View style={{ gap: spacing.md }}>
        {error && <Note icon="warning">{error}</Note>}
        <PasswordField value={pw} onChangeText={setPw} placeholder={reset ? "New password" : "Password"} autoComplete="new-password" textContentType="newPassword" />
        <PasswordRules value={pw} strict={strict} />
        <PasswordField
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Confirm password"
          autoComplete="new-password"
          textContentType="newPassword"
          hint={mismatch ? "Passwords don't match yet." : undefined}
          hintTone="danger"
        />
      </View>
    </AuthShell>
  );
}
