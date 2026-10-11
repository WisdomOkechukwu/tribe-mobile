import { forwardRef, useState } from "react";
import type { TextInput, TextInputProps } from "react-native";
import { Field } from "./field";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { useColors } from "@/theme";

/** Password input with the eye toggle (Sign in.png / Create Account.png). */
export const PasswordField = forwardRef<TextInput, TextInputProps & { label?: string; hint?: string; hintTone?: "muted" | "success" | "danger" }>(function PasswordField(props, ref) {
  const c = useColors();
  const [shown, setShown] = useState(false);
  return (
    <Field
      ref={ref}
      secureTextEntry={!shown}
      autoCapitalize="none"
      autoComplete="password"
      textContentType="password"
      leading={<Icon name="lockLine" size={17} color={c.textMuted} />}
      trailing={
        <PressableScale onPress={() => setShown((v) => !v)} hitSlop={12} accessibilityRole="button" accessibilityLabel={shown ? "Hide password" : "Show password"}>
          <Icon name={shown ? "eye" : "eyeOff"} size={19} color={c.textMuted} />
        </PressableScale>
      }
      {...props}
    />
  );
});
