import * as Clipboard from "expo-clipboard";
import { Children, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
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

/**
 * Equal tiles, `columns` across, flush with the content edges at any width. (Percent widths plus a
 * gap fell short of the right edge, by more the wider the screen: ~27pt on a tablet.) Give tiles
 * `flexGrow: 1` so a row's tiles share one height.
 */
export function TileGrid({ columns = 3, children }: { columns?: number; children: ReactNode }) {
  const items = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap: spacing.sm }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: spacing.sm }}>
          {Array.from({ length: columns }, (_, i) => (
            <View key={i} style={{ flex: 1 }}>
              {row[i]}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
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
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: bg, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, alignSelf: "flex-start" }}>
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
export function CopyField({ label, value, mono, copyValue, tint }: { label: string; value: string; mono?: boolean; copyValue?: string; /** page accent (card pages follow the card's colour) */ tint?: { bg: string; fg: string } }) {
  const c = useColors();
  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityLabel={`Copy ${label}`}
      onPress={() => copyToClipboard(copyValue ?? (mono ? value.replace(/\s/g, "") : value), `${label} copied`)}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingVertical: spacing.smd, paddingHorizontal: spacing.md }}
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant={mono ? "mono" : "bodyStrong"} selectable style={mono ? { fontSize: 15, letterSpacing: 0.6 } : undefined}>
          {value}
        </Text>
      </View>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: tint?.bg ?? c.brandSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name="copy" size={15} color={tint?.fg ?? c.brandText} />
      </View>
    </PressableScale>
  );
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
export function SectionHeader({ title, action, onAction, actionColor }: { title: string; action?: string; onAction?: () => void; actionColor?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: spacing.xs }}>
      <Text variant="headline">{title}</Text>
      {action && (
        <PressableScale onPress={onAction} hitSlop={10}>
          <Text variant="subhead" tone="brand" style={actionColor ? { color: actionColor } : undefined}>
            {action}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}
