import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { OnboardingShell } from "@/screens/onboarding/shell";
import { radius, spacing, useColors } from "@/theme";

const POINTS = ["Prevents unauthorised payments", "Just 4 digits", "Only you can approve transfers"];

/** Transaction PIN intro (SBU.png): why it matters, then create → confirm. */
export default function PinIntro() {
  const c = useColors();
  return (
    <OnboardingShell icon="lock" title="Create a transaction PIN" subtitle="Your PIN approves every payment, swap and Cashpoint." footer={<Button title="Get started" onPress={() => router.push("/create-pin")} />}>
      <View style={{ backgroundColor: c.surface, borderRadius: radius.group, padding: spacing.md, gap: spacing.smd }}>
        {POINTS.map((p) => (
          <View key={p} style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="check" size={12} color={c.brandText} weight="bold" />
            </View>
            <Text variant="body">{p}</Text>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}
