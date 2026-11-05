import { router } from "expo-router";
import { TransactionPinArt } from "@/components/verified-art";
import { StatusScreen } from "@/screens/onboarding/shell";

export default function PinDone() {
  return <StatusScreen art={<TransactionPinArt />} title="Transaction PIN set successfully." body="You'll use it to approve every payment. Keep it to yourself." cta="Keep going" onPress={() => router.push("/setup/biometrics")} />;
}
