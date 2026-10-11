import { router } from "expo-router";
import { StatusScreen } from "@/screens/onboarding/shell";

export default function PinDone() {
  return <StatusScreen icon="lock" title="Transaction PIN set successfully." body="You'll use it to approve every payment. Keep it to yourself." cta="Proceed" onPress={() => router.replace("/lock-intro")} />;
}
