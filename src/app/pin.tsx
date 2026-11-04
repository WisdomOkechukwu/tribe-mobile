import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icon";
import { NumberPad, PinCells } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { actionSummary } from "@/screens/review";
import { BIOMETRIC_ICON, BIOMETRIC_LABEL, pinFromBiometrics, rememberPinForBiometrics } from "@/services/biometrics";
import { useFlowStore } from "@/stores/use-flow-store";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { createPin } from "@/api/auth";
import { ApiError, errorMessage } from "@/api/http";
import { useIsOnline } from "@/services/network";
import { WEAK } from "@/screens/onboarding/pin-create";
import { radius, spacing, useColors } from "@/theme";

const LENGTH = 4;
/** after the 4th digit, so the last dot is seen before approval */
const PIN_BEAT_MS = 60;

/** The API's answer, worded for the PIN screen. */
function failureText(e: unknown) {
  if (!(e instanceof ApiError)) return "Something went wrong. Nothing was charged.";
  if (e.code === "WRONG_PIN") return "Wrong PIN";
  if (e.code === "PIN_LOCKED" || e.status === 429) return e.message || "Too many tries. Wait a little, then try again.";
  if (e.retryable) return `${e.message} Nothing was charged twice: trying again is safe.`;
  return e.message;
}

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
  const status = useFlowStore((s) => s.status);
  const hasPin = useSessionStore((s) => s.hasPin);
  const online = useIsOnline();
  // no PIN yet (new users): create it right here, on the first payment, then approve
  const [mode, setMode] = useState<"enter" | "create" | "confirm">(hasPin ? "enter" : "create");
  const [first, setFirst] = useState("");
  const biometrics = useSessionStore((s) => s.biometrics);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  // captured once: after approval `pending` clears, but this screen stays visible under the result card
  const [summary] = useState(() => (pending ? actionSummary(pending) : null));

  const busy = status === "quoting" || status === "submitting";

  /** Run the payment on the API with this PIN; the result card opens when it answers. */
  const approve = async (pin?: string) => {
    if (!useFlowStore.getState().pending || busy) return;
    setError(null);
    try {
      await execute(pin);
      // Face ID can approve the next one (the PIN is kept behind the biometric prompt)
      if (pin && useSessionStore.getState().biometrics) void rememberPinForBiometrics(pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push("/success");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      if (e instanceof ApiError && e.code === "WRONG_PIN") setAttempts((n) => n + 1);
      setError(failureText(e));
      setValue("");
    }
  };

  useEffect(() => {
    if (value.length !== LENGTH) return;
    const t = setTimeout(() => {
      if (mode === "create") {
        if (WEAK.test(value)) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          setError("Too easy to guess. Try another.");
          setTimeout(() => {
            setValue("");
            setError(null);
          }, 900);
          return;
        }
        setFirst(value);
        setValue("");
        setMode("confirm");
        return;
      }
      if (mode === "confirm") {
        if (value === first) {
          const pin = value;
          createPin(pin)
            .then(() => {
              toast("Payment PIN set", "success");
              setMode("enter");
              return approve(pin);
            })
            .catch((e) => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
              setError(errorMessage(e));
              setValue("");
              setFirst("");
              setMode("create");
            });
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError("PINs didn't match. Start again.");
        setTimeout(() => {
          setValue("");
          setError(null);
          setFirst("");
          setMode("create");
        }, 900);
        return;
      }
      // the PIN is only ever checked by the API, with the payment itself
      void approve(value);
    }, PIN_BEAT_MS);
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

  // the API checks the PIN: Face ID unlocks the one saved after the last typed approval
  const bio = async () => {
    const pin = await pinFromBiometrics("Approve this payment");
    if (pin) void approve(pin);
    else toast(`Enter your PIN once to use ${BIOMETRIC_LABEL} here`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md), paddingHorizontal: spacing.mdl }}>
      <PressableScale onPress={() => router.back()} accessibilityLabel="Back to review" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
        <Icon name="back" size={17} color={c.text} />
      </PressableScale>

      {/* what you're approving, compact */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, marginTop: spacing.lg, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.smd }}>
        {/* the small art: what pays at the back, what it becomes in front (pairs are wider than 44) */}
        <View style={{ minWidth: 44, height: 44, alignItems: "center", justifyContent: "center" }}>{summary.badge}</View>
        <View style={{ flex: 1, gap: spacing.xxs }}>
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
          {mode === "enter" ? (summary.approve ?? "Approve this transaction") : mode === "create" ? "Create your payment PIN" : "Confirm your PIN"}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {mode === "enter" ? "Enter your 4-digit transaction PIN" : mode === "create" ? "First payment! Pick 4 digits. You'll use them to approve every payment." : "Enter it once more and we'll approve this payment."}
        </Text>
      </View>

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        <PinCells length={LENGTH} value={busy ? "••••" : value} error={!!error} />
        <View style={{ minHeight: 22, alignItems: "center", justifyContent: "center" }}>
          {busy ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={c.brandText} />
              <Text variant="subhead" tone="brand">
                {status === "quoting" ? "Locking your rate…" : "Approving…"}
              </Text>
            </View>
          ) : (
            <Text variant="subhead" tone={error ? "danger" : "muted"} align="center">
              {error ? (error === "Wrong PIN" && attempts >= 3 ? "Wrong PIN. Forgot it? Reset it in Me › Security." : error) : !online ? "You're offline. Connect to approve." : " "}
            </Text>
          )}
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", gap: spacing.sm }}>
        <NumberPad
          onKey={(d) => {
            if (busy || !online) return;
            setError(null);
            setValue((v) => (v.length < LENGTH ? v + d : v));
          }}
          onDelete={() => setValue((v) => v.slice(0, -1))}
          extra={
            biometrics && mode === "enter" ? (
              <PressableScale onPress={bio} accessibilityLabel={`Use ${BIOMETRIC_LABEL}`} style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: c.brandSoft }}>
                <Icon name={BIOMETRIC_ICON} size={28} color={c.brandText} weight="regular" />
              </PressableScale>
            ) : null
          }
        />
        <Text variant="caption" tone="muted" align="center">
          Once approved, your transaction can&apos;t be reversed.
        </Text>
      </View>
    </View>
  );
}
