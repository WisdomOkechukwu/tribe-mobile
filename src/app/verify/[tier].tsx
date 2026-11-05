import { router, Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/text";
import { TIER_INFO } from "@/services/kyc";
import { VerifyFlow } from "@/screens/verify/verify-flow";
import { useSessionStore, type KycTier } from "@/stores/use-session-store";
import { CARD_TIER } from "@/utils/verification";
import { spacing, useColors } from "@/theme";

export default function VerifyTier() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { tier: raw, then } = useLocalSearchParams<{ tier: string; then?: "card" }>();
  const tier = (Math.min(3, Math.max(1, Number(raw) || 1)) as Exclude<KycTier, 0>);
  return (
    <>
      <Stack.Screen options={{ title: `Tier ${tier}` }} />
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: spacing.md, paddingHorizontal: spacing.mdl, paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.lg }}>
        <Text variant="display">{TIER_INFO[tier].title}</Text>
        <VerifyFlow
          tier={tier}
          onFinished={(o) => {
            // opened from "Get your card": keep going tier by tier, then straight into card creation
            if (then === "card" && o.status === "approved") {
              const now = useSessionStore.getState().kycTier;
              if (now >= CARD_TIER) return router.replace("/card-new");
              return router.replace({ pathname: "/verify/[tier]", params: { tier: String(now + 1), then } });
            }
            if (router.canGoBack()) router.back();
            else router.replace("/");
          }}
        />
      </View>
    </>
  );
}
