import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Dropdown } from "@/components/dropdown";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { countryByIso, SIGNUP_COUNTRIES } from "@/data/countries";
import { AuthShell, SwitchLink } from "@/screens/auth/shell";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { withLoader } from "@/stores/use-ui-store";
import { spacing, useColors } from "@/theme";
import { isEmail } from "@/utils/hash";
import { LEGAL_URL } from "@/data/links";

// TODO(content): separate Terms and Privacy URLs once they exist; both open the legal page for now
const openLegal = () => WebBrowser.openBrowserAsync(LEGAL_URL, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }).catch(() => {});

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
    <AuthShell
      step={{ at: 1, of: 3 }}
      headline={["Join the", "tribe."]}
      subtitle="Crypto, global accounts, bills and cards in one app. Setting up takes about two minutes."
      footer={
        <>
          <Button title="Continue" disabled={!isEmail(email)} onPress={next} />
          <SwitchLink prompt="Already on Tribe?" action="Sign in" onPress={() => router.replace("/sign-in")} />
        </>
      }
    >
      <View style={{ gap: spacing.md }}>
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
        <View style={{ gap: spacing.sm }}>
          <Dropdown value={country.name} leading={<CoinIcon code={country.flag} size={28} />} onPress={pickCountry} />
          <Text variant="caption" tone="muted" style={{ paddingHorizontal: 4 }}>
            You&apos;ll verify with an ID document from this country.
          </Text>
        </View>
      </View>
      <Text variant="caption" tone="muted" align="center" style={{ marginTop: "auto" }}>
        By continuing you agree to Tribe&apos;s{" "}
        <Text variant="caption" tone="brand" onPress={openLegal} accessibilityRole="link">
          Terms
        </Text>{" "}
        and{" "}
        <Text variant="caption" tone="brand" onPress={openLegal} accessibilityRole="link">
          Privacy Policy
        </Text>
        .
      </Text>
    </AuthShell>
  );
}
