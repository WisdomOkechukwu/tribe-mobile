import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { AuthShell, SwitchLink } from "@/screens/auth/shell";
import { forgotPassword } from "@/api/auth";
import { errorMessage } from "@/api/http";
import { useIsOnline } from "@/services/network";
import { useSignupStore } from "@/stores/use-signup-store";
import { useColors } from "@/theme";
import { isEmail } from "@/utils/hash";

/** Forgot Password.png step 1: the email, then a code to it. */
export default function Forgot() {
  const c = useColors();
  const params = useLocalSearchParams<{ email?: string }>();
  const online = useIsOnline();
  const [email, setEmail] = useState(params.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // the API always answers "sent" (it never says which emails have accounts)
  const request = async () => {
    setBusy(true);
    try {
      const { debugCode } = await forgotPassword(email);
      useSignupStore.getState().set({ debugCode: debugCode ?? null, verificationToken: null });
      router.push({ pathname: "/verify-email", params: { mode: "reset", email: email.trim().toLowerCase() } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      kicker="Reset password"
      headline={["Forgot your", "password?"]}
      subtitle="Enter the email on your Tribe account and we'll send you a code to reset it."
      footer={
        <>
          <Button title={online ? "Send code" : "You're offline"} disabled={!isEmail(email) || !online} loading={busy} onPress={request} />
          <SwitchLink prompt="Remember it?" action="Sign in" onPress={() => router.back()} />
        </>
      }
    >
      <Field
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setError(null);
        }}
        placeholder="Email address"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        leading={<Icon name="envelope" size={16} color={c.textMuted} />}
        hint={error ?? undefined}
        hintTone="danger"
      />
    </AuthShell>
  );
}
