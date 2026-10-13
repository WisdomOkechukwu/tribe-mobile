import { continueSetup } from "@/utils/setup-flow";
import { BvnVerifiedArt } from "@/components/verified-art";
import { StatusScreen } from "@/screens/onboarding/shell";
import { useSignupStore } from "@/stores/use-signup-store";

export default function BvnDone() {
  const name = useSignupStore((s) => s.bvnName);
  return (
    <StatusScreen
      art={<BvnVerifiedArt name={name ? `${name.first} ${name.last}` : null} />}
      title="Your BVN has been verified successfully."
      body="Higher limits are unlocked. Finish NIN + selfie and ID checks to open new wallets like USD, GBP and EUR."
      cta="Keep going"
      onPress={continueSetup}
    />
  );
}
