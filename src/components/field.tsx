import { forwardRef, type ReactNode } from "react";
import { Platform, TextInput, View, type TextInputProps } from "react-native";
import { radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

/** Labelled text field: label above, filled input, hint/error below. */
export const Field = forwardRef<TextInput, TextInputProps & { label?: string; hint?: string; hintTone?: "muted" | "success" | "danger"; mono?: boolean; trailing?: ReactNode; leading?: ReactNode }>(function Field(
  { label, hint, hintTone = "muted", mono, trailing, leading, style, editable = true, ...props },
  ref,
) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.sm }}>
      {label && (
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          {label}
        </Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: editable ? c.surface : c.sunken, borderRadius: radius.input, borderCurve: "continuous", paddingHorizontal: spacing.md, minHeight: 54, borderWidth: 1, borderColor: hint && hintTone === "danger" ? c.danger : "transparent" }}>
        {leading}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textSubtle}
          selectionColor={c.brand}
          cursorColor={c.brand}
          autoCorrect={false}
          editable={editable}
          {...props}
          style={[{ flex: 1, fontFamily: mono ? "Poppins_600SemiBold" : "Poppins_500Medium", fontSize: mono ? 15 : 16, color: editable ? c.text : c.textMuted, paddingVertical: spacing.smd, letterSpacing: mono ? 0.5 : 0 }, Platform.OS === "web" ? ({ outlineWidth: 0, outlineStyle: "none" } as object) : null, style]}
        />
        {trailing}
      </View>
      {hint && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.xs }}>
          {hintTone === "success" && <Icon name="checkCircle" size={13} color={c.success} />}
          <Text variant="caption" tone={hintTone} style={{ flexShrink: 1 }}>
            {hint}
          </Text>
        </View>
      )}
    </View>
  );
});
