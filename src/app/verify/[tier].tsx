import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/text";
import { TIER_INFO } from "@/services/kyc";
import { VerifyFlow } from "@/screens/verify/verify-flow";
import { useSessionStore, type KycTier } from "@/stores/use-session-store";
import { canStart, tierState } from "@/utils/kyc-state";
import { CARD_TIER } from "@/utils/verification";
import { spacing, useColors } from "@/theme";

/**
 * One tier's verification. VerifyFlow checks the tier's state when it opens: only a tier that can
 * be started shows the form; verified, in review or locked show where it stands (so a deep link or
 * an old button can't send the same request twice).
 */
export default function VerifyTier() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { tier: raw, then } = useLocalSearchParams<{ tier: string; then?: "card" }>();
  const tier = (Math.min(3, Math.max(1, Number(raw) || 1)) as Exclude<KycTier, 0>);
  const [inForm, setInForm] = useState(false);
  return (
    <>
      <Stack.Screen options={{ title: `Tier ${tier}` }} />
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: spacing.md, paddingHorizontal: spacing.mdl, paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.lg }}>
        {/* the form steps need the room (keypad, fields), so the big title only shows on the intro and results */}
        {!inForm && <Text variant="display">{tier === 1 ? "Verify your identity" : TIER_INFO[tier].title}</Text>}
        <VerifyFlow
          tier={tier}
          chain={tier === 1}
          onFormStep={setInForm}
          onFinished={(o) => {
            // opened from "Get your card": keep going tier by tier, then straight into card creation
            // (only into a tier that can actually be started; one in review waits for its decision)
            if (then === "card" && o.status === "approved") {
              const now = useSessionStore.getState().kycTier;
              if (now >= CARD_TIER) return router.replace("/card-new");
              const nextTier = (now + 1) as Exclude<KycTier, 0>;
              if (canStart(tierState(nextTier))) return router.replace({ pathname: "/verify/[tier]", params: { tier: String(nextTier), then } });
            }
            if (router.canGoBack()) router.back();
            else router.replace("/");
          }}
        />
      </View>
    </>
  );
}
