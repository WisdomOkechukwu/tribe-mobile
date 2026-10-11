import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { SuccessBurst } from "@/components/success-burst";
import { Text } from "@/components/text";
import { WORLDS } from "@/data/worlds";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { palette, spacing } from "@/theme";

const CTA = { global: "Go to my wallet", crypto: "Deposit crypto", card: "Create my card", bills: "Pay a bill" } as const;

/**
 * Finale. Completing setup flips the route guard to the app; Home then opens the world the
 * user picked (once), so "Crypto" lands on Deposit crypto, "Virtual card" on card creation…
 */
export default function Done() {
  const insets = useSafeAreaInsets();
  const firstName = useSessionStore((s) => s.user.firstName);
  const complete = useSessionStore((s) => s.completeOnboarding);
  const world = useSignupStore((s) => s.world);
  const reset = useSignupStore((s) => s.reset);
  return (
    <View style={{ flex: 1, backgroundColor: palette.purple[900], paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg), paddingHorizontal: spacing.lg }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg }}>
        <SuccessBurst />
        <Text variant="hero" tone="onBrand" align="center">
          Welcome to the tribe, {firstName}.
        </Text>
        <Text variant="body" align="center" style={{ color: palette.purple[100], maxWidth: 300 }}>
          Your wallet is ready.{world === "global" ? " We'll tell you the moment your global accounts are approved." : " Add money to get started."}
        </Text>
      </View>
      <Button
        title={world ? CTA[world] : "Go to my wallet"}
        variant="white"
        onPress={() => {
          complete(world ? WORLDS[world].landing : null);
          reset();
        }}
      />
    </View>
  );
}
