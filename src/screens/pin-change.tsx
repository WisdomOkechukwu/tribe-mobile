import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { PasswordField } from "@/components/password-field";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { spacing, useColors } from "@/theme";

type Step = "current" | "new" | "confirm";

const WEAK = /^(\d)\1+$|^(?:1234|123456|0000|000000|4321|654321)$/;

/** Password check in a sheet — the way back in when you've forgotten a PIN. */
function PasswordSheet({ close, onOk }: { close: (after?: () => void) => void; onOk: () => void }) {
  const check = useSessionStore((s) => s.checkPassword);
  const [pw, setPw] = useState("");
  const [bad, setBad] = useState(false);
  return (
    <View style={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.md, gap: spacing.md }}>
      <PasswordField value={pw} onChangeText={(v) => (setPw(v), setBad(false))} placeholder="Your password" autoFocus hint={bad ? "That password isn't right." : undefined} hintTone="danger" />
      <Button title="Continue" disabled={!pw} onPress={() => (check(pw) ? close(onOk) : setBad(true))} />
    </View>
  );
}

/**
 * current → new → confirm on the brand pad, for either PIN (transaction: 4, lock: 6).
 * Forgot the current one? The password gets you to "new". No current PIN yet → starts at "new".
 */
export function PinChangeFlow({ length, current, onSave }: { length: number; current: string | null; onSave: (pin: string) => void }) {
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
        if (value !== current) return fail(`That's not your current ${name}`);
        setStep("new");
        setValue("");
      } else if (step === "new") {
        if (value === current) return fail("Pick a PIN you haven't used");
        if (WEAK.test(value)) return fail("Too easy to guess. Try another.");
        setFresh(value);
        setStep("confirm");
        setValue("");
        toast("Enter your PIN again", "success");
      } else {
        if (value !== fresh) return fail("PINs didn't match. Start again.", "new");
        onSave(value);
      }
    }, 140);
    return () => clearTimeout(t);
  }, [value, step, current, fresh, length, name, onSave]);

  const forgot = () =>
    overlay.sheet({
      title: `Forgot your ${name}?`,
      content: (close) => (
        <PasswordSheet
          close={close}
          onOk={() => {
            setStep("new");
            setValue("");
          }}
        />
      ),
    });

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
        <Text variant="subhead" tone={error ? "danger" : "muted"} align="center" style={{ minHeight: 18 }}>
          {error ?? " "}
        </Text>
        {step === "current" && (
          <PressableScale onPress={forgot} hitSlop={10} accessibilityRole="button" style={{ alignSelf: "center" }}>
            <Text variant="subhead" tone="brand">
              Forgot it? Use your password
            </Text>
          </PressableScale>
        )}
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <NumberPad onKey={(d) => setValue((v) => (v.length < length ? v + d : v))} onDelete={() => setValue((v) => v.slice(0, -1))} />
      </View>
    </View>
  );
}

export const backWithToast = (message: string) => {
  toast(message, "success");
  router.back();
};
