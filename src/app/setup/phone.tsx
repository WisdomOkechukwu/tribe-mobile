import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { COUNTRIES, SIGNUP_COUNTRIES } from "@/data/countries";
import { BandSkip, OnboardingShell } from "@/screens/onboarding/shell";
import { exitSetup } from "@/utils/setup-flow";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { withLoader } from "@/stores/use-ui-store";
import { radius, spacing, useColors } from "@/theme";

/** Verify phone (SBU.png "Add / Edit phone number"): pre-filled from sign-up, editable, then an OTP. */
export default function Phone() {
  const c = useColors();
  const saved = useSessionStore((s) => s.user.phone);
  const setUser = useSessionStore((s) => s.setUser);
  const [savedDial, savedNumber = ""] = saved.split(" ");
  const [country, setCountry] = useState(COUNTRIES.find((k) => k.dial === savedDial) ?? SIGNUP_COUNTRIES[0]);
  const [number, setNumber] = useState(savedNumber);
  const digits = number.replace(/\D/g, "").replace(/^0/, "");
  const valid = digits.length === country.digits;

  const pickCountry = () =>
    overlay.select({
      title: "Country code",
      value: country.iso,
      options: SIGNUP_COUNTRIES.map((k) => ({ value: k.iso, label: k.name, trailing: k.dial, leading: <CoinIcon code={k.flag} size={34} /> })),
      onSelect: (v) => setCountry(SIGNUP_COUNTRIES.find((k) => k.iso === v)!),
    });

  return (
    <OnboardingShell
      title={saved ? "Verify your phone number" : "Add phone number"}
      headline={saved ? ["Is this", "your number?"] : ["Drop your", "number."]}
      icon="phone"
      right={<BandSkip onPress={exitSetup} />}
      subtitle="We'll text a one-time code to this number. Change it if it's not right."
      footer={
        <Button
          title="Send code"
          disabled={!valid}
          onPress={async () => {
            const phone = `${country.dial} ${digits}`;
            setUser({ phone });
            await withLoader("Sending your code…", () => {}, 700);
            router.push({ pathname: "/setup/otp", params: { phone } });
          }}
        />
      }
    >
      <Field
        value={number}
        onChangeText={setNumber}
        placeholder={country.iso === "NG" ? "803 555 0142" : "Phone number"}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        maxLength={country.digits + 3}
        autoFocus={!savedNumber}
        leading={
          <Pressable onPress={pickCountry} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Country ${country.name}, change`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingRight: spacing.sm, borderRightWidth: 1, borderRightColor: c.border, marginRight: 2 }}>
            <CoinIcon code={country.flag} size={24} />
            <Text variant="bodyStrong">{country.dial}</Text>
            <Icon name="chevronDown" size={10} color={c.textMuted} weight="bold" />
          </Pressable>
        }
      />
      <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
        <Icon name="lock" size={13} color={c.textSubtle} />
        <Text variant="caption" tone="subtle" style={{ flex: 1 }}>
          Only used to secure your account. We never share it.
        </Text>
      </View>

      {/* what happens next, at a glance */}
      <View style={{ flexDirection: "row", backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}>
        {(["We text a code", "You type 6 digits", "Number verified"] as const).map((step, i) => (
          <View key={step} style={{ flex: 1, alignItems: "center", gap: spacing.sm }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: i === 2 ? c.success : c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              {i === 2 ? (
                <Icon name="check" size={13} color={c.onBrand} weight="bold" />
              ) : (
                <Text variant="caption" style={{ color: c.brandText, fontFamily: "Poppins_600SemiBold" }}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text variant="caption" tone="muted" align="center">
              {step}
            </Text>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}
