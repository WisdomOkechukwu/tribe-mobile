import { useEffect, type ReactNode } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, { cancelAnimation, FadeInDown, FadeOutDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { fonts, radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { NumberPad } from "./pin-pad";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Short phones (SE / mini): every docked keypad uses the compact keys. */
export const useCompactPad = () => useWindowDimensions().height < 780;

/** "08035550142" + [4,3,4] → "0803 555 0142". Extra digits run on in the last group. */
export function groupDigits(v: string, groups: number[]) {
  const out: string[] = [];
  let i = 0;
  groups.forEach((g, n) => {
    if (i >= v.length) return;
    const last = n === groups.length - 1;
    out.push(v.slice(i, last ? undefined : i + g));
    i += g;
  });
  return out.join(" ");
}

function Caret() {
  const c = useColors();
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.set(withRepeat(withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })), -1));
    return () => cancelAnimation(o);
  }, [o, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ width: 2, height: 22, borderRadius: 1, backgroundColor: c.brand, marginLeft: 1 }, style]} />;
}

/**
 * A field typed with OUR keypad, never the system keyboard: looks like `Field`, but tapping it
 * makes it the active field (brand outline + blinking caret) and the screen's `KeypadDock` types
 * into it. Digits are grouped for reading (`groups`).
 */
export function KeyField({
  label,
  value,
  placeholder,
  active,
  onPress,
  groups,
  hint,
  hintTone = "muted",
  leading,
  trailing,
  prefix,
}: {
  label?: string;
  value: string;
  placeholder?: string;
  active: boolean;
  onPress: () => void;
  groups?: number[];
  hint?: string;
  hintTone?: "muted" | "success" | "danger";
  leading?: ReactNode;
  trailing?: ReactNode;
  prefix?: string;
}) {
  const c = useColors();
  const shown = groups ? groupDigits(value, groups) : value;
  return (
    <View style={{ gap: spacing.sm }}>
      {label && (
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          {label}
        </Text>
      )}
      <View>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label ?? "Field"}: ${value || "empty"}`} accessibilityHint="Opens the keypad">
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            backgroundColor: c.surface,
            borderRadius: radius.input,
            borderCurve: "continuous",
            paddingHorizontal: spacing.md,
            minHeight: 56,
            borderWidth: 1.5,
            borderColor: active ? c.brand : hint && hintTone === "danger" ? c.danger : "transparent",
            boxShadow: active ? "0 0 0 4px rgba(105,13,172,0.12)" : undefined,
          }}
        >
          {leading}
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            {prefix && value ? <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: c.textMuted }}>{prefix}</Text> : null}
            <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 17, letterSpacing: 0.6, color: value ? c.text : c.textSubtle }}>
              {value ? shown : active ? "" : placeholder}
            </Text>
            {active && <Caret />}
          </View>
          {/* room for the trailing button, which sits on top (a button can't live inside one) */}
          {trailing ? <View style={{ width: 36 }} /> : null}
        </View>
      </Pressable>
      {trailing ? <View style={{ position: "absolute", right: spacing.md, top: 0, bottom: 0, justifyContent: "center" }}>{trailing}</View> : null}
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
}

/**
 * The one keypad a form shows, docked above its CTA while a `KeyField` (or amount) is active:
 * a slim bar naming what you're typing, a Done button, and the brand number pad.
 */
export function KeypadDock({ label, onKey, onDelete, onDone }: { label: string; onKey: (d: string) => void; onDelete: () => void; onDone: () => void }) {
  const c = useColors();
  const compact = useCompactPad();
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(160)} style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xs }}>
        <Text variant="caption" tone="muted">
          Typing: <Text variant="caption" style={{ fontFamily: fonts.semibold, color: c.text }}>{label}</Text>
        </Text>
        <PressableScale onPress={onDone} hitSlop={10} accessibilityRole="button" accessibilityLabel="Done, hide keypad" style={{ backgroundColor: c.brandSoft, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
          <Text variant="subhead" tone="brand">
            Done
          </Text>
        </PressableScale>
      </View>
      <NumberPad compact onKey={onKey} onDelete={onDelete} />
      {!compact && <View style={{ height: spacing.xs }} />}
    </Animated.View>
  );
}
