import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { AuthShell, SwitchLink } from "@/screens/auth/shell";
import { useSessionStore } from "@/stores/use-session-store";
import { withLoader } from "@/stores/use-ui-store";
import { useColors } from "@/theme";
import { isEmail } from "@/utils/hash";

/** Forgot Password.png step 1: the email, then a code to it. */
export default function Forgot() {
  const c = useColors();
  const params = useLocalSearchParams<{ email?: string }>();
  const exists = useSessionStore((s) => s.emailExists);
  const [email, setEmail] = useState(params.email ?? "");
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    if (!exists(email)) return setError("We can't find an account with that email.");
    await withLoader("Sending your code…", () => {});
    router.push({ pathname: "/verify-email", params: { mode: "reset", email: email.trim().toLowerCase() } });
  };

  return (
    <AuthShell
      kicker="Reset password"
      headline={["Forgot your", "password?"]}
      subtitle="Enter the email on your Tribe account and we'll send you a code to reset it."
      footer={
        <>
          <Button title="Send code" disabled={!isEmail(email)} onPress={request} />
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
        autoFocus={!email}
        leading={<Icon name="envelope" size={16} color={c.textMuted} />}
        hint={error ?? undefined}
        hintTone="danger"
      />
    </AuthShell>
  );
}
