import { router } from "expo-router";
import { Text } from "@/components/text";
import { LOCK_PIN_LENGTH } from "@/data/security";
import { PinCreate } from "@/screens/onboarding/pin-create";
import { useSessionStore } from "@/stores/use-session-store";

/** Lock screen.png "Set up lock PIN": 6 digits, then again. */
export default function LockCreate() {
  const setLockPin = useSessionStore((s) => s.setLockPin);
  return (
    <PinCreate
      length={LOCK_PIN_LENGTH}
      icon="lockLine"
      title="Set up your lock PIN"
      subtitle="6 digits to unlock Tribe. Pick something different from your transaction PIN."
      note={
        <Text variant="caption" tone="muted" align="center">
          This unlocks the app. It isn&apos;t your transaction PIN.
        </Text>
      }
      onDone={(pin) => {
        setLockPin(pin);
        router.push("/lock-done");
      }}
    />
  );
}
