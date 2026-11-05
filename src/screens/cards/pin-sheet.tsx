import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { ApiError, errorMessage } from "@/api/http";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { Text } from "@/components/text";
import { overlay } from "@/stores/use-overlay-store";
import { spacing, useColors } from "@/theme";

/**
 * Ask for the transaction PIN in a sheet and run `work` with it (e.g. revealing a card's number:
 * POST cards/:id/reveal). A wrong PIN stays in the sheet; success closes it and calls `onDone`.
 */
export function askForPin<T>({ title, work, onDone }: { title: string; work: (pin: string) => Promise<T>; onDone: (result: T) => void }) {
  overlay.sheet({ title, content: (close) => <PinSheet work={work} onDone={(r) => close(() => onDone(r))} /> });
}

function PinSheet<T>({ work, onDone }: { work: (pin: string) => Promise<T>; onDone: (result: T) => void }) {
  const c = useColors();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  // all four digits in: checking with the API until it answers (a wrong PIN clears the cells)
  const busy = value.length === 4;
  useEffect(() => {
    if (value.length !== 4) return;
    let alive = true;
    work(value)
      .then((r) => alive && onDone(r))
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof ApiError && e.code === "WRONG_PIN" ? "Wrong PIN" : errorMessage(e));
        setValue("");
      });
    return () => {
      alive = false;
    };
  }, [value, work, onDone]);
  return (
    <View style={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.md, gap: spacing.md }}>
      <PinCells length={4} value={value} error={!!error} />
      <View style={{ minHeight: 22, alignItems: "center" }}>
        {busy ? <ActivityIndicator color={c.brandText} /> : <Text variant="subhead" tone={error ? "danger" : "muted"}>{error ?? "Enter your 4-digit transaction PIN"}</Text>}
      </View>
      <NumberPad compact onKey={(d) => !busy && (setError(null), setValue((v) => (v.length < 4 ? v + d : v)))} onDelete={() => setValue((v) => v.slice(0, -1))} />
    </View>
  );
}
