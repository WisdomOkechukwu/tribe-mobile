import { router } from "expo-router";
import { useRef, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { KeyboardFrame } from "./keyboard-frame";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * Frame for form-sheet routes (receipt, receive, guides, pickers): grabber-first, title on the
 * left, a quiet close button, scroll body, pinned footer. Modal *flows* use FlowScreen instead.
 */
export function Sheet({ title, subtitle, children, footer, scroll = true, onClose, leading }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; scroll?: boolean; onClose?: () => void; leading?: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardFrame backgroundColor={c.bg}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.mdl, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
        {leading}
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="title">{title}</Text>
          {subtitle && (
            <Text variant="subhead" tone="muted">
              {subtitle}
            </Text>
          )}
        </View>
        <PressableScale onPress={onClose ?? (() => router.back())} accessibilityLabel="Close" hitSlop={10} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={12} color={c.textMuted} weight="bold" />
        </PressableScale>
      </View>
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentInsetAdjustmentBehavior="never" automaticallyAdjustsScrollIndicatorInsets={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.mdl, paddingTop: spacing.sm, gap: spacing.lg, paddingBottom: spacing.xl }}>
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.mdl, paddingTop: spacing.sm, gap: spacing.lg }}>{children}</View>
      )}
      {footer && <View style={{ paddingHorizontal: spacing.mdl, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.sm }}>{footer}</View>}
    </KeyboardFrame>
  );
}

/** Horizontal chip picker (networks, pay-with assets, amounts). Selected = brand fill. */
export function ChipRow<T extends string | number>({ options, value, onChange, render, bleed = 0 }: { options: readonly T[]; value: T; onChange: (v: T) => void; render: (v: T, selected: boolean) => ReactNode; bleed?: number }) {
  const c = useColors();
  const ref = useRef<ScrollView>(null);
  const placed = useRef(false);
  return (
    <ScrollView showsVerticalScrollIndicator={false}
      ref={ref}
      horizontal
      contentInsetAdjustmentBehavior="never"
      showsHorizontalScrollIndicator={false}
      style={bleed ? { marginHorizontal: -bleed } : undefined}
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: bleed }}
    >
      {options.map((o) => {
        const on = o === value;
        return (
          <PressableScale
            key={String(o)}
            onPress={() => onChange(o)}
            // First layout only: bring a default selection that starts off-screen into view.
            onLayout={
              on
                ? (e) => {
                    if (placed.current) return;
                    placed.current = true;
                    const x = e.nativeEvent.layout.x;
                    if (x > 220) ref.current?.scrollTo({ x: x - spacing.xl, animated: false });
                  }
                : undefined
            }
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.smd + 2, height: 40, borderRadius: radius.full, backgroundColor: on ? c.brand : c.surface }}
          >
            {render(o, on)}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

/** Text colour for content rendered inside a ChipRow chip. */
export const useChipText = () => {
  const c = useColors();
  return (selected: boolean) => (selected ? c.onBrand : c.text);
};
