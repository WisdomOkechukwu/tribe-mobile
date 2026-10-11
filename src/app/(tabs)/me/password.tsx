import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { PasswordField } from "@/components/password-field";
import { PasswordRules } from "@/components/password-rules";
import { Screen } from "@/components/screen";
import { passwordOk } from "@/data/security";
import { useSessionStore } from "@/stores/use-session-store";
import { toast, withLoader } from "@/stores/use-ui-store";
import { spacing } from "@/theme";

/** Change password: current, then a new one that passes the rules. */
export default function ChangePassword() {
  const check = useSessionStore((s) => s.checkPassword);
  const setPassword = useSessionStore((s) => s.setPassword);
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [wrong, setWrong] = useState(false);
  const [strict, setStrict] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== pw;

  const save = async () => {
    if (!check(current)) return setWrong(true);
    if (!passwordOk(pw)) return setStrict(true);
    if (pw !== confirm) return;
    await withLoader("Updating your password…", () => setPassword(pw), 700);
    toast("Password changed", "success");
    router.back();
  };

  return (
    <Screen>
      <View style={{ gap: 14 }}>
        <PasswordField value={current} onChangeText={(v) => (setCurrent(v), setWrong(false))} placeholder="Current password" hint={wrong ? "That isn't your current password." : undefined} hintTone="danger" />
        <PasswordField value={pw} onChangeText={setPw} placeholder="New password" autoComplete="new-password" textContentType="newPassword" />
        <PasswordRules value={pw} strict={strict} />
        <PasswordField value={confirm} onChangeText={setConfirm} placeholder="Confirm new password" autoComplete="new-password" textContentType="newPassword" hint={mismatch ? "Passwords don't match yet." : undefined} hintTone="danger" />
        <View style={{ marginTop: spacing.sm }}>
          <Button title="Change password" disabled={!current || !pw || !confirm || mismatch} onPress={save} />
        </View>
      </View>
    </Screen>
  );
}
