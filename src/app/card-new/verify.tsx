import { router, useLocalSearchParams } from "expo-router";
import { FlowScreen } from "@/components/flow-screen";
import { VerifyFlow } from "@/screens/verify/verify-flow";
import { useSessionStore } from "@/stores/use-session-store";

/** Card onboarding · Tier 2 check, inline — no bouncing out of the flow to verify. */
export default function CardVerify() {
  const params = useLocalSearchParams<{ theme?: string; network?: string }>();
  return (
    <FlowScreen title="Verify your identity" cancel="back" scroll={false}>
      <VerifyFlow
        tier={2}
        onFinished={() => {
          if (useSessionStore.getState().kycTier >= 2) router.replace({ pathname: "/card-new/details", params });
          else router.back();
        }}
      />
    </FlowScreen>
  );
}
