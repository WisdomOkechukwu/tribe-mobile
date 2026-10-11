import * as Clipboard from "expo-clipboard";
import { useEffect, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import type { TxStatus } from "@/data/seed";
import { toast } from "@/stores/use-ui-store";
import { radius, spacing, useColors, type ThemeColors } from "@/theme";
import { Icon, type IconName } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Small building blocks used across screens. */

export async function copyToClipboard(value: string, label = "Copied") {
  await Clipboard.setStringAsync(value);
  toast(label);
}

/** Tiny label pill: status, "Soon", "New", tier badges. */
export function Pill({ label, tone = "neutral", icon }: { label: string; tone?: "neutral" | "brand" | "accent" | "success" | "warning" | "danger"; icon?: IconName }) {
  const c = useColors();
  const map: Record<string, [string, string]> = {
    neutral: [c.surfaceAlt, c.textMuted],
    brand: [c.brandSoft, c.brandText],
    accent: [c.accentSoft, c.accentText],
    success: [c.successSoft, c.success],
    warning: [c.warningSoft, c.text],
    danger: [c.dangerSoft, c.danger],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: bg, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, alignSelf: "flex-start" }}>
      {icon && <Icon name={icon} size={11} color={fg} weight="bold" />}
      <Text variant="caption" style={{ color: fg, fontFamily: "Poppins_600SemiBold", fontSize: 11, lineHeight: 15 }}>
        {label}
      </Text>
    </View>
  );
}

export function StatusPill({ status }: { status: TxStatus }) {
  const map = { completed: ["Successful", "success"], pending: ["Pending", "warning"], failed: ["Failed", "danger"], cancelled: ["Cancelled", "neutral"] } as const;
  const [label, tone] = map[status];
  return <Pill label={label} tone={tone} />;
}

/** Surface block. Use sparingly — group with ListSection, not boxes everywhere. */
export function Card({ children, style, tone = "surface" }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: keyof Pick<ThemeColors, "surface" | "surfaceAlt" | "brandSoft" | "accentSoft" | "sunken" | "successSoft" | "warningSoft" | "dangerSoft"> }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c[tone], borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }, style]}>{children}</View>;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.border, marginLeft: inset }} />;
}

/** One-line callout: an icon and a sentence, no box. */
export function Note({ icon = "info", children, tone = "muted" }: { icon?: IconName; children: ReactNode; tone?: "muted" | "warning" | "brand" }) {
  const c = useColors();
  const color = tone === "warning" ? c.accentText : tone === "brand" ? c.brandText : c.textMuted;
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", paddingHorizontal: spacing.xs }}>
      <View style={{ paddingTop: 1 }}>
        <Icon name={icon} size={14} color={color} />
      </View>
      <Text variant="caption" style={{ flex: 1, color: tone === "muted" ? c.textMuted : c.text }}>
        {children}
      </Text>
    </View>
  );
}

/** Tap-to-copy row for account numbers, addresses, codes. Confirms with a toast. */
export function CopyField({ label, value, mono, copyValue }: { label: string; value: string; mono?: boolean; copyValue?: string }) {
  const c = useColors();
  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityLabel={`Copy ${label}`}
      onPress={() => copyToClipboard(copyValue ?? (mono ? value.replace(/\s/g, "") : value), `${label} copied`)}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingVertical: spacing.smd, paddingHorizontal: spacing.md }}
    >
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant={mono ? "mono" : "bodyStrong"} selectable style={mono ? { fontSize: 15, letterSpacing: 0.6 } : undefined}>
          {value}
        </Text>
      </View>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name="copy" size={15} color={c.brandText} />
      </View>
    </PressableScale>
  );
}

/** Shimmer block for first-load states. */
export function Skeleton({ width, height, radius: r = radius.xs, style }: { width: number | `${number}%`; height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const o = useSharedValue(0.55);
  useEffect(() => {
    if (!reduce) o.set(withRepeat(withTiming(1, { duration: 750 }), -1, true));
  }, [o, reduce]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: c.sunken }, anim, style]} />;
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.sm }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs }}>
        <Icon name={icon} size={26} color={c.brandText} />
      </View>
      <Text variant="headline" align="center">
        {title}
      </Text>
      <Text variant="body" tone="muted" align="center" style={{ maxWidth: 290 }}>
        {body}
      </Text>
      {action}
    </View>
  );
}

/** Section title row for non-list content (carousels, grids). Lists use ListSection's title. */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: spacing.xs }}>
      <Text variant="headline">{title}</Text>
      {action && (
        <PressableScale onPress={onAction} hitSlop={10}>
          <Text variant="subhead" tone="brand">
            {action}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}
