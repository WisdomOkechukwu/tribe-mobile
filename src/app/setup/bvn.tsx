import { router } from "expo-router";
import { useState } from "react";
import { BandSkip, OnboardingShell } from "@/screens/onboarding/shell";
import { VerifyFlow } from "@/screens/verify/verify-flow";
import { continueSetup, exitSetup } from "@/utils/setup-flow";

/**
 * Finish setup › Identity: one flow, BVN and date of birth (Tier 1, checked at once) then NIN and
 * a selfie (Tier 2, reviewed), in the setup frame. Stopping after BVN is fine. The form, the checks
 * and every result screen are the same VerifyFlow the verification centre uses, so the two can't
 * disagree. Verified or in review carries on with the next setup task; "Later" after a problem
 * goes to Get set up (carrying on would only open this step again).
 */
export default function Bvn() {
  const [slim, setSlim] = useState(false);
  return (
    <OnboardingShell title="Verify your identity" headline={["Verify your", "identity."]} icon="shield" stripes={false} scroll={false} slim={slim} right={<BandSkip onPress={exitSetup} />}>
      <VerifyFlow tier={1} chain onFormStep={setSlim} onFinished={(o) => (o.status === "approved" || o.status === "pending" ? continueSetup() : router.dismissTo("/get-set-up"))} />
    </OnboardingShell>
  );
}
