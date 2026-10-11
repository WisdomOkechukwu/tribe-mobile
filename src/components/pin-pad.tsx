import * as Haptics from "expo-haptics";
import { useEffect, type ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { motion, radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * Segmented code cells — PIN (masked dots) or OTP / Cashpoint codes (digits). The active cell
 * glows brand purple; `error` shakes the row.
 */
export function PinCells({ length, value, masked = true, error = false, success = false, groupEvery }: { length: number; value: string; masked?: boolean; error?: boolean; success?: boolean; groupEvery?: number }) {
  const c = useColors();
  const shake = useSharedValue(0);
  useEffect(() => {
    if (error) shake.value = withSequence(...[14, -14, 10, -10, 5, 0].map((x) => withTiming(x, { duration: 55 })));
  }, [error, shake]);
  const row = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  // Long codes (11-digit BVN, 12-digit Cashpoint) must fit any phone: size cells to the width.
  const { width } = useWindowDimensions();
  const gap = length > 6 ? 5 : spacing.smd;
  const groups = groupEvery ? Math.ceil(length / groupEvery) - 1 : 0;
  const available = width - spacing.mdl * 2 - gap * (length - 1) - groups * 8;
  const cell = Math.min(length > 6 ? 34 : length > 4 ? 46 : 58, Math.floor(available / length));

  return (
    <Animated.View style={[{ flexDirection: "row", justifyContent: "center", gap }, row]} accessibilityLabel={`${value.length} of ${length} digits entered`}>
      {Array.from({ length }, (_, i) => {
        const filled = i < value.length;
        const active = i === value.length;
        const gapAfter = groupEvery && (i + 1) % groupEvery === 0 && i < length - 1;
        return (
          <View key={i} style={{ flexDirection: "row" }}>
            <View
              style={{
                width: cell,
                height: length > 6 ? 44 : 64,
                borderRadius: length > 6 ? 10 : radius.chip,
                borderCurve: "continuous",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: success ? c.successSoft : error && filled ? c.dangerSoft : filled ? c.brandSoft : c.surface,
                borderWidth: 2,
                borderColor: success ? c.success : error ? c.danger : active ? c.brand : filled ? c.brandSoft : c.border,
                boxShadow: active && !error && !success ? "0 0 0 4px rgba(105,13,172,0.14)" : undefined,
              }}
            >
              {filled &&
                (masked ? (
                  <Cell />
                ) : (
                  <Text variant={length > 6 ? "bodyStrong" : "title"} tone={success ? "success" : error ? "danger" : "brand"}>
                    {value[i]}
                  </Text>
                ))}
            </View>
            {gapAfter && <View style={{ width: 8 }} />}
          </View>
        );
      })}
    </Animated.View>
  );
}

function Cell() {
  const c = useColors();
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withSpring(1, motion.spring);
  }, [s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.brand }, style]} />;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "extra", "0", "del"] as const;

/** Brand number pad — no system keyboard for PINs, amounts or codes. */
export function NumberPad({ onKey, onDelete, extra }: { onKey: (d: string) => void; onDelete: () => void; extra?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm }}>
      {KEYS.map((k) => (
        <View key={k} style={{ width: "33.333%", alignItems: "center" }}>
          {k === "extra" ? (
            <View style={{ width: 76, height: 64, alignItems: "center", justifyContent: "center" }}>{extra}</View>
          ) : (
            <PressableScale
              haptic={false}
              scaleTo={0.9}
              accessibilityLabel={k === "del" ? "Delete" : k}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                if (k === "del") onDelete();
                else onKey(k);
              }}
              style={{ width: 76, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" }}
            >
              {k === "del" ? <Icon name="backspace" size={24} color={c.text} weight="regular" /> : <Text variant="display" style={{ fontSize: 30 }}>{k}</Text>}
            </PressableScale>
          )}
        </View>
      ))}
    </View>
  );
}
