import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { OnboardingShell } from "@/screens/onboarding/shell";
import { radius, spacing, useColors } from "@/theme";

const POINTS = ["Tribe locks itself after 10 minutes without a tap", "6 digits to get back in, or Face ID / fingerprint", "Different from your 4-digit transaction PIN"];

/** Lock screen.png intro: what the lock PIN is for — and that it isn't the payment PIN. */
export default function LockIntro() {
  const c = useColors();
  return (
    <OnboardingShell
      icon="lockLine"
      title="Add a lock PIN"
      subtitle="A secure 6-digit PIN that unlocks the app. It keeps your money private if someone picks up your phone."
      footer={
        <>
          <Button title="Get started" onPress={() => router.push("/lock-create")} />
          <Button title="Set up later" variant="tertiary" onPress={() => router.push("/biometrics")} />
        </>
      }
    >
      <View style={{ backgroundColor: c.surface, borderRadius: radius.group, padding: spacing.md, gap: spacing.smd }}>
        {POINTS.map((p) => (
          <View key={p} style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="check" size={12} color={c.brandText} weight="bold" />
            </View>
            <Text variant="body" style={{ flex: 1 }}>
              {p}
            </Text>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}
