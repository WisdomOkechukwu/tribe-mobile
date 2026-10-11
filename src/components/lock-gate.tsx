import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { LOCK_MAX_TRIES, LOCK_PIN_LENGTH } from "@/data/security";
import { authenticate, BIOMETRIC_ICON, BIOMETRIC_LABEL } from "@/services/biometrics";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { radius, spacing, useColors } from "@/theme";
import { MeAvatar } from "./avatar";
import { Button } from "./button";
import { Icon } from "./icon";
import { NumberPad, PinCells } from "./pin-pad";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Sign out to the password screen (3 wrong PINs, or a forgotten lock PIN). */
function toPassword(message: string, forgetPin = false) {
  const s = useSessionStore.getState();
  if (forgetPin) s.setLockPin(null);
  s.signOut("lock");
  toast(message, "danger");
}

async function bioUnlock(unlock: () => void) {
  if (await authenticate("Unlock Tribe")) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    unlock();
  }
}

function LockScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const firstName = useSessionStore((s) => s.user.firstName);
  const lockPin = useSessionStore((s) => s.lockPin);
  const biometrics = useSessionStore((s) => s.biometrics);
  const unlock = useSessionStore((s) => s.unlock);
  const failUnlock = useSessionStore((s) => s.failUnlock);
  const fails = useSessionStore((s) => s.lockFails);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const prompted = useRef(false);

  const tryBiometrics = () => bioUnlock(unlock);

  // offer Face ID / fingerprint straight away, once
  useEffect(() => {
    if (!biometrics || prompted.current) return;
    prompted.current = true;
    const t = setTimeout(() => bioUnlock(unlock), 350);
    return () => clearTimeout(t);
  }, [biometrics, unlock]);

  useEffect(() => {
    if (value.length !== LOCK_PIN_LENGTH) return;
    const t = setTimeout(() => {
      if (value === lockPin) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        unlock();
        return;
      }
      const n = failUnlock();
      if (n >= LOCK_MAX_TRIES) {
        toPassword("Too many tries. Sign in with your password.");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(true);
      setTimeout(() => {
        setError(false);
        setValue("");
      }, 600);
    }, 150);
    return () => clearTimeout(t);
  }, [value, lockPin, unlock, failUnlock]);

  const left = LOCK_MAX_TRIES - fails;
  const forgot = () =>
    overlay.confirm({
      icon: "keyLine",
      title: "Forgot your lock PIN?",
      body: "Sign in with your email and password, then set a new lock PIN in Security.",
      confirmLabel: "Use password",
      onConfirm: () => toPassword("Sign in to set a new lock PIN.", true),
    });
  const logOut = () =>
    overlay.confirm({
      icon: "logout",
      title: `Not ${firstName}?`,
      body: "We'll sign this account out. Your money stays safe.",
      confirmLabel: "Log out",
      destructive: true,
      onConfirm: () => useSessionStore.getState().signOut("user"),
    });

  const bioKey = biometrics ? (
    <PressableScale onPress={tryBiometrics} accessibilityLabel={`Unlock with ${BIOMETRIC_LABEL}`} style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" }}>
      <Icon name={BIOMETRIC_ICON} size={30} color={c.brandText} weight="regular" />
    </PressableScale>
  ) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + spacing.xl, paddingBottom: Math.max(insets.bottom, spacing.md), paddingHorizontal: spacing.mdl }}>
      <Animated.View entering={FadeInDown.duration(360)} style={{ alignItems: "center", gap: spacing.sm }}>
        <MeAvatar size={64} />
        <Text variant="title" align="center" style={{ marginTop: spacing.sm }}>
          Welcome back, {firstName}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {lockPin ? "Enter your lock PIN to continue." : `Use ${BIOMETRIC_LABEL} or your password to continue.`}
        </Text>
      </Animated.View>

      {lockPin ? (
        <>
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <PinCells length={LOCK_PIN_LENGTH} value={value} error={error} />
            <View style={{ minHeight: 20, alignItems: "center" }}>
              {fails > 0 && (
                <Text variant="subhead" tone="danger" align="center">
                  Wrong lock PIN. {left} {left === 1 ? "try" : "tries"} left before we ask for your password.
                </Text>
              )}
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "center", gap: spacing.sm, backgroundColor: c.surface, borderRadius: radius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.smd }}>
            <Icon name="lockLine" size={13} color={c.textMuted} />
            <Text variant="caption" tone="muted">
              This is your lock PIN, not your transaction PIN.
            </Text>
          </View>
          <View style={{ flex: 1, justifyContent: "flex-end", gap: spacing.sm }}>
            <NumberPad onKey={(d) => setValue((v) => (v.length < LOCK_PIN_LENGTH ? v + d : v))} onDelete={() => setValue((v) => v.slice(0, -1))} extra={bioKey} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.sm }}>
              <PressableScale onPress={forgot} hitSlop={10} accessibilityRole="button">
                <Text variant="subhead" tone="brand">
                  Forgot lock PIN?
                </Text>
              </PressableScale>
              <PressableScale onPress={logOut} hitSlop={10} accessibilityRole="button">
                <Text variant="subhead" tone="brand">
                  Log out
                </Text>
              </PressableScale>
            </View>
          </View>
        </>
      ) : (
        <View style={{ flex: 1, justifyContent: "flex-end", gap: spacing.sm }}>
          {biometrics && <Button title={`Unlock with ${BIOMETRIC_LABEL}`} icon={BIOMETRIC_ICON} onPress={tryBiometrics} />}
          <Button title="Sign in with password" variant={biometrics ? "secondary" : "primary"} onPress={() => useSessionStore.getState().signOut("lock")} />
          <Button title="Log out" variant="tertiary" onPress={logOut} />
        </View>
      )}
    </View>
  );
}

/**
 * The app lock (Lock screen.png + Sign in.png "Enter your PIN"): an overlay above everything —
 * not a route guard — so unlocking returns the user exactly where they were.
 */
export function LockGate() {
  const active = useSessionStore((s) => s.signedIn && s.hasOnboarded && s.locked);
  // anything open underneath (a picker, a confirm) closes, so nothing peeks over the lock
  useEffect(() => {
    if (active) overlay.close();
  }, [active]);
  if (!active) return null;
  const layer = (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(220)} style={{ position: "absolute", inset: 0, zIndex: 1100 }} accessibilityViewIsModal>
      <LockScreen />
    </Animated.View>
  );
  return Platform.OS === "ios" ? <FullWindowOverlay>{layer}</FullWindowOverlay> : layer;
}
