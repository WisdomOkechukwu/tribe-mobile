import { continueSetup } from "@/utils/setup-flow";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { BiometricArt } from "@/components/verified-art";
import { Hero, OnboardingShell, Perks } from "@/screens/onboarding/shell";
import { authenticate, biometricsAvailable, BIOMETRIC_ICON, BIOMETRIC_LABEL } from "@/services/biometrics";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";

/** Face ID / fingerprint: turned on only after the OS confirms it's really you. */
export default function Biometrics() {
  const setBiometrics = useSessionStore((s) => s.setBiometrics);
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    biometricsAvailable().then(setAvailable);
  }, []);
  const next = continueSetup;
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
      headline={["Faster with", `${BIOMETRIC_LABEL}.`]}
      icon={BIOMETRIC_ICON}
      subtitle={available === false ? `This phone doesn't have ${BIOMETRIC_LABEL} set up. You can turn it on later in Security.` : "Approve payments with a glance. Your PIN still works as a backup."}
      footer={
        <>
          {available !== false && <Button title={`Turn on ${BIOMETRIC_LABEL}`} onPress={turnOn} icon={BIOMETRIC_ICON} disabled={available === null} />}
          <Button title={available === false ? "Continue" : "Not now"} variant={available === false ? "primary" : "tertiary"} onPress={next} />
        </>
      }
    >
      <Hero>
        <BiometricArt icon={BIOMETRIC_ICON} done={false} />
      </Hero>
      <Perks
        items={[
          { icon: "bolt", title: "Pay with a glance", body: "Approve payments, swaps and Cashpoints without typing." },
          { icon: "key", title: "Your PIN still works", body: "It's always there as a backup." },
        ]}
      />
    </OnboardingShell>
  );
}
