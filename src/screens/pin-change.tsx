import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { ApiError, errorMessage } from "@/api/http";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { Text } from "@/components/text";
import { toast } from "@/stores/use-ui-store";
import { spacing, useColors } from "@/theme";

type Step = "current" | "new" | "confirm";

const WEAK = /^(\d)\1+$|^(?:1234|123456|0000|000000|4321|654321)$/;

/**
 * current → new → confirm on the brand pad. The API checks the current PIN when the new one is
 * saved (`onSave(current, next)`), so a wrong current PIN comes back from the server and the flow
 * starts over at "current". No PIN yet (`hasPin` false) → starts at "new".
 */
export function PinChangeFlow({ length, hasPin, onSave }: { length: number; hasPin: boolean; onSave: (current: string | null, next: string) => Promise<void> }) {
  const current = hasPin ? "set" : null;
  const [typedCurrent, setTypedCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(current ? "current" : "new");
  const [value, setValue] = useState("");
  const [fresh, setFresh] = useState("");
  const [error, setError] = useState<string | null>(null);
  const name = "transaction PIN";
  const copy: Record<Step, { title: string; body: string }> = {
    current: { title: `Enter your current ${name}`, body: "Just making sure it's you." },
    new: { title: current ? `Choose a new ${name}` : `Set up your ${name}`, body: "4 digits that approve payments. Avoid birthdays and 1234." },
    confirm: { title: `Confirm your ${name}`, body: "Type it one more time." },
  };
  const steps: Step[] = current ? ["current", "new", "confirm"] : ["new", "confirm"];

  useEffect(() => {
    if (value.length !== length) return;
    const t = setTimeout(() => {
      const fail = (msg: string, back?: Step) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError(msg);
        setTimeout(() => {
          setValue("");
          setError(null);
          if (back) setStep(back);
        }, 700);
      };
      if (step === "current") {
        setTypedCurrent(value);
        setStep("new");
        setValue("");
      } else if (step === "new") {
        if (value === typedCurrent) return fail("Pick a PIN you haven't used");
        if (WEAK.test(value)) return fail("Too easy to guess. Try another.");
        setFresh(value);
        setStep("confirm");
        setValue("");
        toast("Enter your PIN again", "success");
      } else {
        if (value !== fresh) return fail("PINs didn't match. Start again.", "new");
        setBusy(true);
        onSave(typedCurrent, value)
          .catch((e) => {
            const wrongCurrent = e instanceof ApiError && (e.code === "WRONG_PIN" || !!e.field("current_pin"));
            const weak = e instanceof ApiError ? e.field("new_pin") : undefined;
            fail(wrongCurrent ? `That's not your current ${name}` : (weak ?? errorMessage(e)), wrongCurrent && current ? "current" : "new");
          })
          .finally(() => setBusy(false));
      }
    }, 140);
    return () => clearTimeout(t);
  }, [value, step, current, fresh, typedCurrent, length, name, onSave]);

  const s = copy[step];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingHorizontal: spacing.mdl, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }}>
      <View style={{ alignItems: "center", gap: spacing.sm, marginTop: spacing.xl }}>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
          {steps.map((k, i) => (
            <View key={k} style={{ width: 28, height: 4, borderRadius: 2, backgroundColor: i <= steps.indexOf(step) ? c.brand : c.borderStrong }} />
          ))}
        </View>
        <Text variant="title" align="center">
          {s.title}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {s.body}
        </Text>
      </View>
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <PinCells length={length} value={value} error={!!error} />
        {busy ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 18 }}>
            <ActivityIndicator size="small" color={c.brandText} />
            <Text variant="subhead" tone="brand">
              Saving…
            </Text>
          </View>
        ) : (
          <Text variant="subhead" tone={error ? "danger" : "muted"} align="center" style={{ minHeight: 18 }}>
            {error ?? " "}
          </Text>
        )}
        {step === "current" && (
          <Text variant="caption" tone="muted" align="center">
            Forgot it? Contact support to reset your PIN.
          </Text>
        )}
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <NumberPad onKey={(d) => !busy && setValue((v) => (v.length < length ? v + d : v))} onDelete={() => setValue((v) => v.slice(0, -1))} />
      </View>
    </View>
  );
}

export const backWithToast = (message: string) => {
  toast(message, "success");
  router.back();
};
