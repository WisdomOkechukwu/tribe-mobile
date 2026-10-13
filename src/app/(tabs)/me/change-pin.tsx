import { backWithToast, PinChangeFlow } from "@/screens/pin-change";
import { useSessionStore } from "@/stores/use-session-store";

/** The 4-digit transaction PIN (approves payments). No PIN yet → set one up here. */
export default function ChangePin() {
  const current = useSessionStore((s) => s.pin);
  const setPin = useSessionStore((s) => s.setPin);
  return (
    <PinChangeFlow
      length={4}
      current={current}
      onSave={(pin) => {
        setPin(pin);
        backWithToast(current ? "Transaction PIN changed" : "Transaction PIN set");
      }}
    />
  );
}
