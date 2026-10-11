import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { OnboardingShell } from "@/screens/onboarding/shell";
import { authenticate, biometricsAvailable, BIOMETRIC_ICON, BIOMETRIC_LABEL } from "@/services/biometrics";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { useColors } from "@/theme";

/** Face ID / fingerprint: turned on only after the OS confirms it's really you. */
export default function Biometrics() {
  const c = useColors();
  const setBiometrics = useSessionStore((s) => s.setBiometrics);
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    biometricsAvailable().then(setAvailable);
  }, []);
  const next = () => router.push("/redeem");
  const turnOn = async () => {
    if (await authenticate(`Turn on ${BIOMETRIC_LABEL} for Tribe`)) {
      setBiometrics(true);
      toast(`${BIOMETRIC_LABEL} is on`, "success");
      next();
    }
  };
  return (
    <OnboardingShell
      title={`Faster with ${BIOMETRIC_LABEL}`}
      subtitle={available === false ? `This phone doesn't have ${BIOMETRIC_LABEL} set up. You can turn it on later in Security.` : "Unlock Tribe and approve payments with a glance. Your PINs still work as a backup."}
      footer={
        <>
          {available !== false && <Button title={`Turn on ${BIOMETRIC_LABEL}`} onPress={turnOn} icon={BIOMETRIC_ICON} disabled={available === null} />}
          <Button title={available === false ? "Continue" : "Not now"} variant={available === false ? "primary" : "tertiary"} onPress={next} />
        </>
      }
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={{ width: 168, height: 168, borderRadius: 84, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: c.brand, alignItems: "center", justifyContent: "center", boxShadow: "0 18px 40px -16px rgba(105,13,172,0.7)" }}>
            <Icon name={BIOMETRIC_ICON} size={56} color="#fff" weight="regular" />
          </View>
        </Animated.View>
      </View>
    </OnboardingShell>
  );
}
