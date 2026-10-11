import * as Haptics from "expo-haptics";
import { Children, isValidElement, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { radius, spacing, useColors } from "@/theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

/**
 * Inset grouped list — the main way content is grouped in v2 (hairlines, not boxes).
 * Separators are inset to align with the row text, iOS-style.
 */
export function ListSection({ title, action, footer, children, style, inset = 66 }: { title?: string; action?: ReactNode; footer?: string; children: ReactNode; style?: StyleProp<ViewStyle>; /** separator indent; 16 for rows without a leading icon */ inset?: number }) {
  const c = useColors();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[{ gap: spacing.sm }, style]}>
      {(title || action) && (
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: spacing.xs }}>
          {title ? <Text variant="headline">{title}</Text> : <View />}
          {action}
        </View>
      )}
      <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
        {rows.map((row, i) => (
          <View key={row.key ?? i}>
            {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: inset }} />}
            {row}
          </View>
        ))}
      </View>
      {footer && (
        <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          {footer}
        </Text>
      )}
    </View>
  );
}

/** Leading icon bubble for ListRow. */
export function RowIcon({ name, tint, bg }: { name: IconName; tint?: string; bg?: string }) {
  const c = useColors();
  return (
    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: bg ?? c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
      <Icon name={name} size={18} color={tint ?? c.text} />
    </View>
  );
}

export function ListRow({
  leading,
  icon,
  iconTint,
  iconBg,
  title,
  subtitle,
  value,
  valueSub,
  valueTone,
  trailing,
  onPress,
  chevron,
  destructive,
  compact,
  accessibilityLabel,
}: {
  leading?: ReactNode;
  icon?: IconName;
  iconTint?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  value?: string;
  valueSub?: string;
  valueTone?: "text" | "success" | "danger" | "muted";
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  /** key/value detail row (receipts, reviews): muted label left, value right */
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const showChevron = chevron ?? (!!onPress && !trailing && !value);
  if (compact) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.smd, minHeight: 48 }}>
        <Text variant="body" tone="muted">
          {title}
        </Text>
        <Text variant="bodyStrong" style={{ flex: 1, textAlign: "right", color: valueTone === "success" ? c.success : valueTone === "danger" ? c.danger : c.text }} numberOfLines={2}>
          {value}
        </Text>
        {trailing}
      </View>
    );
  }
  const body = (pressed: boolean) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd, minHeight: 60, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
      {leading ?? (icon ? <RowIcon name={icon} tint={destructive ? c.danger : iconTint} bg={destructive ? c.dangerSoft : iconBg} /> : null)}
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1} style={destructive ? { color: c.danger } : undefined}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {(value || valueSub) && (
        <View style={{ alignItems: "flex-end", gap: 1 }}>
          {value && (
            <Text variant="amount" tone={valueTone === "success" ? "success" : valueTone === "danger" ? "danger" : valueTone === "muted" ? "muted" : "text"}>
              {value}
            </Text>
          )}
          {valueSub && (
            <Text variant="caption" tone="muted">
              {valueSub}
            </Text>
          )}
        </View>
      )}
      {trailing}
      {showChevron && <Icon name="chevron" size={13} color={c.textSubtle} />}
    </View>
  );
  if (!onPress) return body(false);
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

/** "See all"-style link for a ListSection header. */
export function SectionLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="link">
      {({ pressed }) => (
        <Text variant="subhead" tone="brand" style={{ opacity: pressed ? 0.5 : 1 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
