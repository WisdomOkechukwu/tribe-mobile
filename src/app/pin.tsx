import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icon";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { DEMO } from "@/data/seed";
import { actionSummary } from "@/screens/review";
import { authenticate, BIOMETRIC_ICON, BIOMETRIC_LABEL } from "@/services/biometrics";
import { useFlowStore } from "@/stores/use-flow-store";
import { useSessionStore } from "@/stores/use-session-store";
import { InsufficientFunds } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";

const LENGTH = 4;

/**
 * "Approve this transaction" (Send / Card boards): every money movement is approved here with the
 * 4-digit transaction PIN — or Face ID / fingerprint, verified by the OS — then executed. The
 * result card is pushed ON TOP of this screen (replacing it flashed the review underneath).
 */
export default function Pin() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const pending = useFlowStore((s) => s.pending);
  const execute = useFlowStore((s) => s.execute);
  const storedPin = useSessionStore((s) => s.pin);
  const biometrics = useSessionStore((s) => s.biometrics);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  // captured once: after approval `pending` clears, but this screen stays visible under the result card
  const [summary] = useState(() => (pending ? actionSummary(pending) : null));

  const approve = () => {
    if (!useFlowStore.getState().pending) return;
    try {
      execute();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push("/success");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e instanceof InsufficientFunds ? e.message : "Something went wrong. Nothing was charged.");
      setValue("");
    }
  };

  useEffect(() => {
    if (value.length !== LENGTH) return;
    const t = setTimeout(() => {
      if (value === (storedPin ?? DEMO.pin)) {
        approve();
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setAttempts((n) => n + 1);
      setError("Wrong PIN");
      setTimeout(() => {
        setValue("");
        setError(null);
      }, 600);
    }, 150);
    return () => clearTimeout(t);
    // approve() reads the store directly; only a full PIN should trigger this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!summary) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
        <Text variant="body" tone="muted">
          Nothing to approve.
        </Text>
      </View>
    );
  }

  const bio = async () => {
    if (await authenticate("Approve this payment")) approve();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md), paddingHorizontal: spacing.mdl }}>
      <PressableScale onPress={() => router.back()} accessibilityLabel="Back to review" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
        <Icon name="back" size={17} color={c.text} />
      </PressableScale>

      {/* what you're approving, compact */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, marginTop: spacing.lg, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.smd }}>
        <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{summary.badge ?? <View style={{ transform: [{ scale: 0.72 }] }}>{summary.icon}</View>}</View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {summary.amount}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {summary.line}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: "center", gap: spacing.sm, marginTop: spacing.xl }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="lock" size={22} color={c.brandText} />
        </View>
        <Text variant="title" align="center">
          Approve this transaction
        </Text>
        <Text variant="body" tone="muted" align="center">
          Enter your 4-digit transaction PIN
        </Text>
      </View>

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        <PinCells length={LENGTH} value={value} error={error === "Wrong PIN"} />
        <Text variant="subhead" tone={error ? "danger" : "muted"} align="center" style={{ minHeight: 18 }}>
          {error ? (error === "Wrong PIN" && attempts >= 3 ? "Wrong PIN. Forgot it? Reset it in Me › Security." : error) : " "}
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", gap: spacing.sm }}>
        <NumberPad
          onKey={(d) => setValue((v) => (v.length < LENGTH ? v + d : v))}
          onDelete={() => setValue((v) => v.slice(0, -1))}
          extra={
            biometrics ? (
              <PressableScale onPress={bio} accessibilityLabel={`Use ${BIOMETRIC_LABEL}`} style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: c.brandSoft }}>
                <Icon name={BIOMETRIC_ICON} size={28} color={c.brandText} weight="regular" />
              </PressableScale>
            ) : null
          }
        />
        <Text variant="caption" tone="subtle" align="center">
          Once approved, your transaction can&apos;t be reversed.
        </Text>
      </View>
    </View>
  );
}
