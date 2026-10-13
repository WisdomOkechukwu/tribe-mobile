import { continueSetup, exitSetup } from "@/utils/setup-flow";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Dropdown } from "@/components/dropdown";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { BandSkip, OnboardingShell } from "@/screens/onboarding/shell";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { toast, withLoader } from "@/stores/use-ui-store";
import { radius, spacing, useColors } from "@/theme";

const INCOME = ["Salary", "Business income", "Freelance or creator work", "Investments", "Friends and family", "Student allowance", "Pension", "Other"];
const EMPLOYMENT = ["Employed", "Self-employed", "Freelancer / creator", "Student", "Unemployed", "Retired"];
const INDUSTRY = [
  "Technology and software",
  "Banking and financial services",
  "Creative, media and entertainment",
  "Retail and e-commerce",
  "Healthcare and pharmaceuticals",
  "Education",
  "Legal services",
  "Government and public sector",
  "Transportation and logistics",
  "Hospitality and tourism",
  "Agriculture",
  "Other",
];
const DEPOSIT = ["Less than $5,000", "$5,000 – $50,000", "$50,000 – $150,000", "More than $150,000"];
const FREQUENCY = ["Once a year", "Every few months", "A few times a month", "Once a week", "More than once a week"];

type Key = "income" | "employment" | "industry" | "deposit" | "frequency";
const QUESTIONS: { key: Key; label: string; title: string; list: string[] }[] = [
  { key: "income", label: "Main source of income", title: "Main source of income", list: INCOME },
  { key: "employment", label: "Employment status", title: "Employment status", list: EMPLOYMENT },
  { key: "industry", label: "Industry you work in", title: "Industry", list: INDUSTRY },
  { key: "deposit", label: "Expected yearly deposits", title: "Expected yearly deposits", list: DEPOSIT },
  { key: "frequency", label: "How often you'll transact", title: "How often you'll transact", list: FREQUENCY },
];

/**
 * "Let's get to know you" (SBU.png, Global payments world): what regulators need before USD,
 * GBP and EUR accounts are issued. Submitting sends the request for review.
 */
export default function KnowYou() {
  const c = useColors();
  const answers = useSignupStore((s) => s.answers);
  const set = useSignupStore((s) => s.set);
  const requestGlobal = useSessionStore((s) => s.requestGlobalAccounts);
  const [address, setAddress] = useState(answers.address ?? "");
  const [agree, setAgree] = useState(false);
  const ask = (q: (typeof QUESTIONS)[number]) => overlay.select({ title: q.title, value: answers[q.key], options: q.list.map((v) => ({ value: v, label: v })), onSelect: (v) => set({ answers: { ...answers, [q.key]: v } }) });
  const complete = address.trim().length > 8 && QUESTIONS.every((q) => answers[q.key]) && agree;

  return (
    <OnboardingShell
      title="Let's get to know you"
      headline={["A few quick", "questions."]}
      icon="personLine"
      right={<BandSkip onPress={exitSetup} />}
      subtitle="A few questions to open your USD, GBP and EUR accounts. Regulators ask, we keep it private."
      footer={
        <>
        <Button
          title="Submit for review"
          disabled={!complete}
          onPress={async () => {
            await withLoader("Submitting your request…", () => {
              set({ answers: { ...answers, address: address.trim() } });
              requestGlobal();
            });
            toast("Submitted. We'll let you know when your accounts are ready.", "success");
            continueSetup();
          }}
        />
        </>
      }
    >
      <View style={{ flexDirection: "row", gap: spacing.sm }} accessible accessibilityLabel="US dollar, British pound and euro accounts">
        {["USD", "GBP", "EUR"].map((code) => (
          <View key={code} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surface, borderRadius: radius.full, paddingVertical: 6, paddingLeft: 6, paddingRight: spacing.smd }}>
            <CoinIcon code={code} size={22} />
            <Text variant="subhead">{code}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.md }}>
        <Field value={address} onChangeText={setAddress} placeholder="Home address" textContentType="fullStreetAddress" autoComplete="street-address" leading={<Icon name="location" size={16} color={c.textMuted} />} />
        {QUESTIONS.map((q) => (
          <Dropdown key={q.key} label={q.label} value={answers[q.key]} placeholder="Select one" onPress={() => ask(q)} />
        ))}
        <Pressable onPress={() => setAgree((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }} style={{ flexDirection: "row", gap: spacing.smd, alignItems: "flex-start", paddingVertical: spacing.xs }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: agree ? 0 : 1.5, borderColor: c.borderStrong, backgroundColor: agree ? c.brand : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
            {agree && <Icon name="check" size={12} color="#fff" weight="bold" />}
          </View>
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            I agree that this information can be used to set up USD, GBP and EUR accounts for me.
          </Text>
        </Pressable>
      </View>
    </OnboardingShell>
  );
}
