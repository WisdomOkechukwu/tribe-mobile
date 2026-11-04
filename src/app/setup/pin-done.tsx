import { router } from "expo-router";
import { TransactionPinArt } from "@/components/verified-art";
import { StatusScreen } from "@/screens/onboarding/shell";

export default function PinDone() {
  return <StatusScreen art={<TransactionPinArt />} title="PIN created" body="You'll use it to approve every payment. Keep it to yourself." cta="Continue" onPress={() => router.push("/setup/biometrics")} />;
}
