import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

/**
 * A select field: label above, the current choice (with flag/logo) in a filled box, and a
 * chevron. Tapping it opens one of our custom select sheets (`overlay.select`).
 */
export function Dropdown({ label, value, sub, leading, onPress, placeholder = "Choose…", right }: { label?: string; value?: string; sub?: string; leading?: ReactNode; onPress: () => void; placeholder?: string; right?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.sm }}>
      {label && (
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          {label}
        </Text>
      )}
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label ?? "Select"}: ${value ?? placeholder}`}>
        {({ pressed }) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: pressed ? c.surfaceAlt : c.surface, borderRadius: radius.input, borderCurve: "continuous", paddingHorizontal: spacing.md, minHeight: 60, paddingVertical: spacing.sm }}>
            {leading}
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="bodyStrong" style={value ? undefined : { color: c.textSubtle }} numberOfLines={1}>
                {value ?? placeholder}
              </Text>
              {sub && (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {sub}
                </Text>
              )}
            </View>
            {right && (
              <Text variant="subhead" tone="muted">
                {right}
              </Text>
            )}
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Icon name="chevronDown" size={11} color={c.textMuted} weight="bold" />
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}
