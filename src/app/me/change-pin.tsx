import { useCallback } from "react";
import { changePin, createPin } from "@/api/auth";
import { backWithToast, PinChangeFlow } from "@/screens/pin-change";
import { useSessionStore } from "@/stores/use-session-store";

/** The 4-digit transaction PIN (approves payments). No PIN yet → set one up here. */
export default function ChangePin() {
  const hasPin = useSessionStore((s) => s.hasPin);
  const save = useCallback(
    async (current: string | null, next: string) => {
      if (current) await changePin(current, next);
      else await createPin(next);
      backWithToast(current ? "Transaction PIN changed" : "Transaction PIN set");
    },
    [],
  );
  return <PinChangeFlow length={4} hasPin={hasPin} onSave={save} />;
}
