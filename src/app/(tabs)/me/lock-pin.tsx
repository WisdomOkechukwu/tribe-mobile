import { LOCK_PIN_LENGTH } from "@/data/security";
import { backWithToast, PinChangeFlow } from "@/screens/pin-change";
import { useSessionStore } from "@/stores/use-session-store";

/** Lock screen.png "Set up Center": set up, change or reset (with your password) the 6-digit lock PIN. */
export default function LockPin() {
  const current = useSessionStore((s) => s.lockPin);
  const setLockPin = useSessionStore((s) => s.setLockPin);
  return (
    <PinChangeFlow
      length={LOCK_PIN_LENGTH}
      kind="lock"
      current={current}
      onSave={(pin) => {
        setLockPin(pin);
        backWithToast(current ? "Lock PIN changed" : "Lock PIN set");
      }}
    />
  );
}
