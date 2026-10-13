import { useLocalSearchParams } from "expo-router";
import { continueSetup } from "@/utils/setup-flow";
import { PhoneVerifiedArt } from "@/components/verified-art";
import { StatusScreen } from "@/screens/onboarding/shell";
import { useSessionStore } from "@/stores/use-session-store";

export default function PhoneDone() {
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const setPhoneVerified = useSessionStore((s) => s.setPhoneVerified);
  return (
    <StatusScreen
      art={<PhoneVerifiedArt />}
      title="Phone number added successfully."
      body={phone ? `${phone} is now linked to your Tribe account.` : "It's now linked to your Tribe account."}
      cta="Keep going"
      onPress={() => {
        setPhoneVerified(true);
        continueSetup();
      }}
    />
  );
}
