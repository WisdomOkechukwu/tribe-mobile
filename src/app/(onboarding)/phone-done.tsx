import { router } from "expo-router";
import { StatusScreen } from "@/screens/onboarding/shell";
import { useSignupStore } from "@/stores/use-signup-store";

export default function PhoneDone() {
  const set = useSignupStore((s) => s.set);
  return (
    <StatusScreen
      icon="phone"
      title="Phone number added successfully."
      cta="Proceed"
      onPress={() => {
        set({ phoneVerified: true });
        router.dismissTo("/checklist");
      }}
    />
  );
}
