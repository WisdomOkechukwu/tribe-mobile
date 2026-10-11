import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Dropdown } from "@/components/dropdown";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { StepCount } from "@/components/step-count";
import { Text } from "@/components/text";
import { countryByIso, SIGNUP_COUNTRIES } from "@/data/countries";
import { OnboardingShell } from "@/screens/onboarding/shell";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { withLoader } from "@/stores/use-ui-store";
import { useColors } from "@/theme";
import { isEmail } from "@/utils/hash";

/** Create account, step 1 of 3 (Create Account.png "Get started"): email + country, then a code. */
export default function CreateAccount() {
  const c = useColors();
  const draft = useSignupStore((s) => s.draft);
  const setDraft = useSignupStore((s) => s.setDraft);
  const exists = useSessionStore((s) => s.emailExists);
  const [email, setEmail] = useState(draft.email);
  const [iso, setIso] = useState(draft.country);
  const [taken, setTaken] = useState(false);
  const country = countryByIso(iso);

  const pickCountry = () =>
    overlay.select({
      title: "Where do you live?",
      subtitle: "You'll verify with an ID from this country.",
      value: iso,
      options: SIGNUP_COUNTRIES.map((k) => ({ value: k.iso, label: k.name, leading: <CoinIcon code={k.flag} size={34} /> })),
      onSelect: setIso,
    });

  const next = async () => {
    if (exists(email)) return setTaken(true);
    setDraft({ email: email.trim().toLowerCase(), country: iso });
    await withLoader("Sending your code…", () => {});
    router.push({ pathname: "/verify-email", params: { mode: "signup" } });
  };

  return (
    <OnboardingShell
      title="Get started"
      subtitle="Let's set up your Tribe account. It takes about two minutes."
      right={<StepCount step={1} of={3} />}
      footer={
        <>
          <Button title="Continue" disabled={!isEmail(email)} onPress={next} />
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
            <Text variant="body" tone="muted">
              Have an account?
            </Text>
            <PressableScale onPress={() => router.replace("/sign-in")} hitSlop={10} accessibilityRole="link">
              <Text variant="bodyStrong" tone="brand">
                Sign in
              </Text>
            </PressableScale>
          </View>
        </>
      }
    >
      <View style={{ gap: 14 }}>
        <Field
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setTaken(false);
          }}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
          leading={<Icon name="envelope" size={16} color={c.textMuted} />}
          hint={taken ? "This email already has a Tribe account. Sign in instead." : undefined}
          hintTone="danger"
        />
        <View style={{ gap: 6 }}>
          <Dropdown value={country.name} leading={<CoinIcon code={country.flag} size={28} />} onPress={pickCountry} />
          <Text variant="caption" tone="muted" style={{ paddingHorizontal: 4 }}>
            You&apos;ll verify with an ID document from this country.
          </Text>
        </View>
      </View>
      <Text variant="caption" tone="subtle" align="center" style={{ marginTop: "auto" }}>
        By continuing you agree to Tribe&apos;s Terms and Privacy Policy.
      </Text>
    </OnboardingShell>
  );
}
