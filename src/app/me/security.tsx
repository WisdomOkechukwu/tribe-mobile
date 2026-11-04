import { router } from "expo-router";
import { Platform } from "react-native";
import { BrandSwitch } from "@/components/brand-switch";
import { ListRow, ListSection } from "@/components/list";
import { Screen } from "@/components/screen";
import { logOut, updateProfile } from "@/api/auth";
import { errorMessage } from "@/api/http";
import { BIOMETRIC_LABEL, authenticate, biometricsAvailable, forgetBiometricPin } from "@/services/biometrics";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { useColors } from "@/theme";
import { overlay } from "@/stores/use-overlay-store";

/** Security centre: PIN, biometrics, 2-step, devices and account deletion. */
export default function Security() {
  const c = useColors();
  const biometrics = useSessionStore((s) => s.biometrics);
  const twoFactor = useSessionStore((s) => s.twoFactor);
  // saved on the profile (PATCH profile); the switch moves at once and rolls back on failure
  const save = (patch: { biometrics_enabled?: boolean; two_factor_enabled?: boolean }, undo: () => void) =>
    updateProfile(patch).catch((e) => {
      undo();
      toast(errorMessage(e), "danger");
    });
  const setBiometrics = (on: boolean) => {
    const before = useSessionStore.getState().biometrics;
    useSessionStore.getState().setBiometrics(on);
    if (!on) void forgetBiometricPin();
    return save({ biometrics_enabled: on }, () => useSessionStore.getState().setBiometrics(before));
  };
  const setTwoFactor = (on: boolean) => {
    const before = useSessionStore.getState().twoFactor;
    useSessionStore.getState().setTwoFactor(on);
    void save({ two_factor_enabled: on }, () => useSessionStore.getState().setTwoFactor(before));
  };
  const hidden = usePrefsStore((s) => s.hideBalances);
  const toggleHidden = usePrefsStore((s) => s.toggleHideBalances);
  const pin = useSessionStore((s) => s.hasPin);
  const bioName = BIOMETRIC_LABEL;
  const score = [biometrics, twoFactor, !!pin].filter(Boolean).length;
  const toggleBio = async (on: boolean) => {
    if (!on) {
      void setBiometrics(false);
      return toast(`${bioName} off`);
    }
    if (!(await biometricsAvailable())) return toast(`Set up ${bioName} in your phone's settings first`, "danger");
    if (await authenticate(`Turn on ${bioName} for Tribe`)) {
      void setBiometrics(true);
      toast(`${bioName} on. Your next PIN approval sets it up.`, "success");
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
        <ListRow icon="devicesLine" title="Devices" subtitle="One phone at a time" onPress={() => router.push("/me/devices")} />
        <ListRow icon="eyeOff" title="Hide balances" subtitle="Mask amounts on every screen" trailing={<BrandSwitch label="Hide balances" value={hidden} onValueChange={toggleHidden} />} />
      </ListSection>

      <ListSection footer="Deleting closes every account and card. Our support team confirms it with you first.">
        <ListRow
          icon="trashLine"
          destructive
          title="Delete account"
          onPress={() =>
            overlay.confirm({
              icon: "trash",
              title: "Delete your account?",
              body: "We'll sign you out and our support team will email you to confirm. Every balance must be empty first.",
              confirmLabel: "Delete",
              destructive: true,
              // TODO(backend): no account-deletion endpoint yet; signing out is all the app can do
              onConfirm: () => {
                toast("We'll email you to confirm the deletion");
                void logOut();
              },
            })
          }
        />
      </ListSection>
    </Screen>
  );
}
