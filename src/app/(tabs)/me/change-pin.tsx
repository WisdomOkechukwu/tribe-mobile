import { DEMO } from "@/data/seed";
import { backWithToast, PinChangeFlow } from "@/screens/pin-change";
import { useSessionStore } from "@/stores/use-session-store";

/** The 4-digit transaction PIN (approves payments). The lock PIN lives in /me/lock-pin. */
export default function ChangePin() {
  const current = useSessionStore((s) => s.pin) ?? DEMO.pin;
  const setPin = useSessionStore((s) => s.setPin);
  return (
    <PinChangeFlow
      length={4}
      kind="transaction"
      current={current}
      onSave={(pin) => {
        setPin(pin);
        backWithToast("Transaction PIN changed");
      }}
    />
  );
}
