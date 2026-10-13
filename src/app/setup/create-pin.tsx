import { router } from "expo-router";
import { PinCreate } from "@/screens/onboarding/pin-create";
import { useSessionStore } from "@/stores/use-session-store";

/** Transaction PIN: 4 digits, approves every payment. */
export default function CreatePin() {
  const setPin = useSessionStore((s) => s.setPin);
  return (
    <PinCreate
      length={4}
      title="Create transaction PIN"
      headline={["Your payment", "PIN."]}
      subtitle="4 digits that approve every payment. Keep it private, Tribe will never ask for it."
      onDone={(pin) => {
        setPin(pin);
        router.push("/setup/pin-done");
      }}
    />
  );
}
