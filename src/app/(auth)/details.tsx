import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Dropdown } from "@/components/dropdown";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { countryByIso, SIGNUP_COUNTRIES } from "@/data/countries";
import { DEMO } from "@/data/seed";
import { AuthShell } from "@/screens/auth/shell";
import { overlay } from "@/stores/use-overlay-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { spacing, useColors } from "@/theme";

const HEARD = ["A friend or family member", "Instagram", "TikTok", "X (Twitter)", "YouTube", "Google search", "A Cashpoint someone sent me", "Other"];
const REFERRAL = /^[A-Z0-9]{2,6}-[A-Z0-9]{3}$/;

/** Create account, step 2 of 3 (Create Account.png "Personal details"). */
export default function Details() {
  const c = useColors();
  const draft = useSignupStore((s) => s.draft);
  const setDraft = useSignupStore((s) => s.setDraft);
  const [first, setFirst] = useState(draft.firstName);
  const [last, setLast] = useState(draft.lastName);
  const [tag, setTag] = useState(draft.tag);
  const [dialIso, setDialIso] = useState(draft.country);
  const [phone, setPhone] = useState(draft.phone.split(" ")[1] ?? "");
  const [referral, setReferral] = useState(draft.referral);
  const [heard, setHeard] = useState(draft.heardFrom);
  const dial = countryByIso(dialIso);

  const cleanTag = tag.toLowerCase().replace(/[^a-z0-9_.]/g, "");
  const tagState = cleanTag.length === 0 ? "empty" : cleanTag.length < 3 ? "short" : (DEMO.takenTags as readonly string[]).includes(cleanTag) ? "taken" : "free";
  const digits = phone.replace(/\D/g, "").replace(/^0/, "");
  const phoneTaken = (DEMO.takenPhones as readonly string[]).includes(digits);
  const phoneOk = digits.length === dial.digits && !phoneTaken;
  const code = referral.trim().toUpperCase();
  const refState = code.length === 0 ? "empty" : REFERRAL.test(code) ? "ok" : "bad";
  const valid = first.trim().length > 1 && last.trim().length > 1 && tagState === "free" && phoneOk && refState !== "bad";

  const pickDial = () =>
    overlay.select({
      title: "Country code",
      value: dialIso,
      options: SIGNUP_COUNTRIES.map((k) => ({ value: k.iso, label: k.name, trailing: k.dial, leading: <CoinIcon code={k.flag} size={34} /> })),
      onSelect: setDialIso,
    });

  return (
    <AuthShell
      band="compact"
      step={{ at: 2, of: 3 }}
      headline={["Tell us", "about you."]}
      subtitle="Use your name exactly as it appears on your ID."
      footer={
        <Button
          title="Continue"
          disabled={!valid}
          onPress={() => {
            setDraft({ firstName: first.trim(), lastName: last.trim(), tag: cleanTag, phone: `${dial.dial} ${digits}`, referral: code, heardFrom: heard });
            router.push({ pathname: "/password", params: { mode: "signup" } });
          }}
        />
      }
    >
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.smd }}>
          <View style={{ flex: 1 }}>
            <Field value={first} onChangeText={setFirst} placeholder="First name" autoCapitalize="words" textContentType="givenName" autoComplete="given-name" />
          </View>
          <View style={{ flex: 1 }}>
            <Field value={last} onChangeText={setLast} placeholder="Last name" autoCapitalize="words" textContentType="familyName" autoComplete="family-name" />
          </View>
        </View>
        <Field
          value={tag}
          onChangeText={setTag}
          placeholder="Choose a username"
          autoCapitalize="none"
          leading={
            <Text variant="bodyStrong" tone="brand">
              @
            </Text>
          }
          hint={tagState === "empty" ? "Friends pay you to your @tag, instantly and free." : tagState === "free" ? `@${cleanTag} is yours` : tagState === "taken" ? `@${cleanTag} is taken. Try another.` : "At least 3 characters"}
          hintTone={tagState === "free" ? "success" : tagState === "taken" ? "danger" : "muted"}
        />
        <Field
          value={phone}
          onChangeText={setPhone}
          placeholder={dialIso === "NG" ? "803 555 0142" : "Phone number"}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={dial.digits + 3}
          leading={
            <Pressable onPress={pickDial} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Country code ${dial.dial}, change`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingRight: spacing.sm, borderRightWidth: 1, borderRightColor: c.border, marginRight: 2 }}>
              <CoinIcon code={dial.flag} size={22} />
              <Text variant="bodyStrong">{dial.dial}</Text>
              <Icon name="chevronDown" size={10} color={c.textMuted} weight="bold" />
            </Pressable>
          }
          hint={phoneTaken ? "This number already has a Tribe account." : "We'll verify this number after sign-up."}
          hintTone={phoneTaken ? "danger" : "muted"}
        />
        <Field
          value={referral}
          onChangeText={setReferral}
          placeholder="Referral code (optional)"
          autoCapitalize="characters"
          leading={<Icon name="giftLine" size={16} color={c.textMuted} />}
          hint={refState === "ok" ? "Code applied. Your friend earns when you transact." : refState === "bad" ? "That code doesn't look right. It's like ADA-K2F." : undefined}
          hintTone={refState === "ok" ? "success" : "danger"}
        />
        <Dropdown
          value={heard || undefined}
          placeholder="Where did you hear about us? (optional)"
          onPress={() => overlay.select({ title: "Where did you hear about Tribe?", value: heard, options: HEARD.map((v) => ({ value: v, label: v })), onSelect: setHeard })}
        />
      </View>
    </AuthShell>
  );
}
