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
import { useSignupStore } from "@/stores/use-signup-store";
import { checkEmail, sendEmailCode } from "@/api/auth";
import { errorMessage } from "@/api/http";
import { useIsOnline } from "@/services/network";
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
  const online = useIsOnline();
  const [email, setEmail] = useState(draft.email);
  const [iso, setIso] = useState(draft.country);
  const [taken, setTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const country = iso ? countryByIso(iso) : null;

  const pickCountry = () =>
    overlay.select({
      title: "Where do you live?",
      subtitle: "You'll verify with an ID from this country.",
      value: iso || undefined,
      options: SIGNUP_COUNTRIES.map((k) => ({ value: k.iso, label: k.name, leading: <CoinIcon code={k.flag} size={34} /> })),
      onSelect: setIso,
    });

  const next = async () => {
    const clean = email.trim().toLowerCase();
    setBusy(true);
    setError(null);
    try {
      if (!(await checkEmail(clean))) return setTaken(true);
      setDraft({ email: clean, country: iso });
      const { debugCode } = await sendEmailCode(clean, "signup");
      useSignupStore.getState().set({ debugCode: debugCode ?? null, verificationToken: null });
      router.push({ pathname: "/verify-email", params: { mode: "signup" } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      step={{ at: 1, of: 3 }}
      headline={["Join the", "tribe."]}
      subtitle="Crypto, global accounts, bills and cards in one app. Setting up takes about two minutes."
      footer={
        <>
          <Button title={online ? "Continue" : "You're offline"} disabled={!isEmail(email) || !country || !online} loading={busy} onPress={next} />
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
            setError(null);
          }}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          leading={<Icon name="envelope" size={16} color={c.textMuted} />}
          hint={taken ? "This email already has a Tribe account. Sign in instead." : (error ?? undefined)}
          hintTone="danger"
        />
        <View style={{ gap: spacing.sm }}>
          <Dropdown value={country?.name} placeholder="Select your country" leading={country ? <CoinIcon code={country.flag} size={28} /> : <Icon name="globe" size={18} color={c.textMuted} />} onPress={pickCountry} />
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
