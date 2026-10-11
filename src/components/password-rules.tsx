import { View } from "react-native";
import { PASSWORD_RULES } from "@/data/security";
import { spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

/**
 * Live password checklist: empty rings while you type, green ticks as rules pass, and red
 * crosses for the ones still failing once `strict` (after a submit attempt).
 */
export function PasswordRules({ value, strict = false }: { value: string; strict?: boolean }) {
  const c = useColors();
  return (
    <View style={{ gap: 6, paddingHorizontal: spacing.xs }} accessibilityRole="summary">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        const bad = !ok && strict;
        return (
          <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }} accessibilityLabel={`${r.label}: ${ok ? "done" : "not yet"}`}>
            {ok || bad ? (
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: ok ? c.success : c.danger, alignItems: "center", justifyContent: "center" }}>
                <Icon name={ok ? "check" : "close"} size={9} color="#fff" weight="bold" />
              </View>
            ) : (
              <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: c.borderStrong }} />
            )}
            <Text variant="caption" tone={ok ? "success" : bad ? "danger" : "muted"}>
              {r.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
