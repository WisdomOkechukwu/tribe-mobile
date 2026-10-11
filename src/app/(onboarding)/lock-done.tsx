import { router } from "expo-router";
import { StatusScreen } from "@/screens/onboarding/shell";

export default function LockDone() {
  return <StatusScreen icon="lockLine" title="Lock PIN set successfully." body="Tribe will ask for it after 10 minutes without a tap. Payments still need your transaction PIN." cta="Got it" onPress={() => router.replace("/biometrics")} />;
}
