import * as Haptics from "expo-haptics";
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { Text } from "@/components/text";
import { toast } from "@/stores/use-ui-store";
import { spacing } from "@/theme";
import { OnboardingShell } from "./shell";

export const WEAK = /^(\d)\1+$|^(?:0123|1234|2345|3456|4567|5678|6789|9876|4321|012345|123456|234567|345678|456789|987654|654321)$/;

/**
 * Create → confirm the 4-digit transaction PIN with segmented cells.
 * The confirm step announces itself with a toast, like Lock screen.png's "Enter your PIN again".
 */
export function PinCreate({ length, title, headline, subtitle, icon = "lock", right, note, onDone }: { length: number; title: string; headline?: string[]; subtitle: string; icon?: "lock" | "lockLine" | "key"; right?: ReactNode; note?: ReactNode; onDone: (pin: string) => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (value.length !== length) return;
    const t = setTimeout(() => {
      if (!first) {
        setFirst(value);
        setValue("");
        toast("Enter your PIN again", "success");
        return;
      }
      if (value === first) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onDone(value);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError(true);
        setTimeout(() => {
          setError(false);
          setValue("");
          setFirst(null);
        }, 650);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [value, first, length, onDone]);

  const confirming = first !== null;
  const weak = !confirming && value.length === length && WEAK.test(value);

  return (
    <OnboardingShell
      icon={icon}
      title={confirming ? "Confirm your PIN" : title}
      headline={confirming ? ["One more", "time."] : headline}
      subtitle={confirming ? "Enter it once more." : subtitle}
      scroll={false}
      right={right}
      onBack={
        confirming
          ? () => {
              setFirst(null);
              setValue("");
            }
          : undefined
      }
    >
      <PinCells length={length} value={value} error={error} />
      <View style={{ alignItems: "center", minHeight: 20, gap: spacing.sm }}>
        {error ? (
          <Text variant="subhead" tone="danger">
            PINs didn&apos;t match. Let&apos;s start again.
          </Text>
        ) : weak ? (
          <Text variant="subhead" tone="accent">
            This PIN is easy to guess. Consider a stronger one.
          </Text>
        ) : (
          note
        )}
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.md }}>
        <NumberPad onKey={(d) => setValue((v) => (v.length < length ? v + d : v))} onDelete={() => setValue((v) => v.slice(0, -1))} />
      </View>
    </OnboardingShell>
  );
}
