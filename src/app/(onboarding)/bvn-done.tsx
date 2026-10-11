import { router } from "expo-router";
import { StatusScreen } from "@/screens/onboarding/shell";

export default function BvnDone() {
  return <StatusScreen icon="verified" title="Your BVN has been verified successfully." body="Higher limits are unlocked. You can add USD, GBP and EUR accounts any time." cta="Got it" onPress={() => router.dismissTo("/checklist")} />;
}
