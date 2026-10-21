import { router } from "expo-router";
import { Platform } from "react-native";
import { BrandSwitch } from "@/components/brand-switch";
import { ListRow, ListSection } from "@/components/list";
import { Screen } from "@/components/screen";
import { resetDemoData } from "@/stores/reset";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { useColors } from "@/theme";
import { overlay } from "@/stores/use-overlay-store";
import { authenticate, biometricsAvailable, BIOMETRIC_LABEL } from "@/services/biometrics";

/** Security centre: PIN, biometrics, 2-step, devices and account deletion. */
export default function Security() {
  const c = useColors();
  const biometrics = useSessionStore((s) => s.biometrics);
  const setBiometrics = useSessionStore((s) => s.setBiometrics);
  const twoFactor = useSessionStore((s) => s.twoFactor);
  const setTwoFactor = useSessionStore((s) => s.setTwoFactor);
  const devices = useSessionStore((s) => s.devices);
  const wipe = useSessionStore((s) => s.wipe);
  const hidden = usePrefsStore((s) => s.hideBalances);
  const toggleHidden = usePrefsStore((s) => s.toggleHideBalances);
  const pin = useSessionStore((s) => s.pin);
  const bioName = BIOMETRIC_LABEL;
  const score = [biometrics, twoFactor, !!pin].filter(Boolean).length;
  const toggleBio = async (on: boolean) => {
    if (!on) {
      setBiometrics(false);
      return toast(`${bioName} off`);
    }
    if (!(await biometricsAvailable())) return toast(`Set up ${bioName} in your phone's settings first`, "danger");
    if (await authenticate(`Turn on ${bioName} for Tribe`)) {
      setBiometrics(true);
      toast(`${bioName} on`, "success");
    }
  };

  return (
    <Screen>
      <ListSection footer={score === 3 ? "Your account is locked down. Nice." : "Turn on everything here for the strongest protection."}>
        <ListRow
          icon="shield"
          iconBg={score === 3 ? c.successSoft : c.warningSoft}
          iconTint={score === 3 ? c.success : c.text}
          title={score === 3 ? "Strong protection" : "Good protection"}
          subtitle={`${score} of 3 recommended settings on`}
        />
      </ListSection>

      <ListSection title="Approvals" footer={`Every payment, swap and Cashpoint is approved with your PIN${biometrics ? ` or ${bioName}` : ""}.`}>
        <ListRow icon="keyLine" title="Transaction PIN" subtitle={pin ? "4 digits · Change or reset" : "Not set yet · you'll create it on your first payment"} onPress={() => router.push("/me/change-pin")} />
        <ListRow icon={Platform.OS === "ios" ? "faceid" : "fingerprint"} title={bioName} subtitle="Approve payments with a glance" trailing={<BrandSwitch label={bioName} value={biometrics} onValueChange={toggleBio} />} />
      </ListSection>

      <ListSection title="Sign-in">
        <ListRow icon="key" title="Password" subtitle="Used to sign in on any device" onPress={() => router.push("/me/password")} />
        <ListRow icon="shieldLine" title="2-step verification" subtitle="A code by SMS for new devices" trailing={<BrandSwitch label="2-step verification" value={twoFactor} onValueChange={setTwoFactor} />} />
      </ListSection>

      <ListSection title="Privacy">
        <ListRow icon="devicesLine" title="Devices" subtitle={`${devices.length} signed in`} onPress={() => router.push("/me/devices")} />
        <ListRow icon="eyeOff" title="Hide balances" subtitle="Mask amounts on every screen" trailing={<BrandSwitch label="Hide balances" value={hidden} onValueChange={toggleHidden} />} />
      </ListSection>

      <ListSection footer={`Deleting closes every account and card.${__DEV__ ? " In this demo it just resets everything." : ""}`}>
        <ListRow
          icon="trashLine"
          destructive
          title="Delete account"
          onPress={() =>
            overlay.confirm({
              icon: "trash",
              title: "Delete your account?",
              body: __DEV__ ? "This demo will reset all data and sign you out." : "This permanently closes your accounts and cards and deletes your data. Every balance must be empty first.",
              confirmLabel: "Delete",
              destructive: true,
              onConfirm: () => {
                resetDemoData();
                wipe();
              },
            })
          }
        />
      </ListSection>
    </Screen>
  );
}
