import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { PasswordField } from "@/components/password-field";
import { PasswordRules } from "@/components/password-rules";
import { passwordOk } from "@/data/security";
import { AuthShell } from "@/screens/auth/shell";
import { startNewAccount } from "@/stores/reset";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { withLoader } from "@/stores/use-ui-store";
import { spacing } from "@/theme";

/**
 * Create password — step 3 of sign-up, or "Create a new password" after a reset code
 * (Create Account.png / Forgot Password.png). Rules tick green as you type.
 */
export default function Password() {
  const { mode = "signup", email = "" } = useLocalSearchParams<{ mode?: "signup" | "reset"; email?: string }>();
  const draft = useSignupStore((s) => s.draft);
  const createAccount = useSessionStore((s) => s.createAccount);
  const resetPassword = useSessionStore((s) => s.resetPassword);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [strict, setStrict] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== pw;
  const reset = mode === "reset";

  const submit = async () => {
    if (!passwordOk(pw)) return setStrict(true);
    if (pw !== confirm) return;
    if (reset) {
      await withLoader("Updating your password…", () => resetPassword(email, pw));
      router.replace("/password-done");
      return;
    }
    await withLoader("Creating your account…", () => {
      // no virtual card yet: the Cards tab starts with the creation flow
      startNewAccount();
      createAccount({ email: draft.email, country: draft.country, password: pw, user: { firstName: draft.firstName, lastName: draft.lastName, tag: draft.tag, phone: draft.phone } });
    });
    // signed in now: the route guard moves on to "pick your world"
  };

  return (
    <AuthShell
      band="compact"
      step={reset ? undefined : { at: 3, of: 3 }}
      kicker={reset ? "Reset password" : undefined}
      headline={reset ? ["Set a new", "password."] : ["Set a strong", "password."]}
      subtitle={reset ? "Pick one you haven't used on Tribe before." : "Protect your account with a password only you know."}
      footer={<Button title={reset ? "Change password" : "Create account"} disabled={!pw || !confirm || mismatch} onPress={submit} />}
    >
      <View style={{ gap: spacing.md }}>
        <PasswordField value={pw} onChangeText={setPw} placeholder={reset ? "New password" : "Password"} autoComplete="new-password" textContentType="newPassword" autoFocus />
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
