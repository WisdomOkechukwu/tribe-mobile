import { useState } from "react";
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { motion, radius, spacing, useTheme } from "@/theme";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Quiet segmented control (iOS-style sliding thumb). Used for every "pick one view" switch. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { scheme, colors: c } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const seg = width ? (width - 4) / options.length : 0;
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(index * seg, motion.spring) }] }), [index, seg]);

  return (
    <View accessibilityRole="tablist" onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={[{ flexDirection: "row", padding: 2, borderRadius: radius.input - 4, backgroundColor: c.sunken }, style]}>
      {seg > 0 && (
        <Animated.View
          style={[
            { position: "absolute", top: 2, left: 2, bottom: 2, width: seg, borderRadius: radius.input - 6, borderCurve: "continuous", backgroundColor: scheme === "dark" ? c.surfaceAlt : c.surface, boxShadow: scheme === "dark" ? undefined : "0 1px 3px rgba(20,16,26,0.12)" },
            thumb,
          ]}
        />
      )}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)} scaleTo={0.97} style={{ flex: 1, paddingVertical: spacing.sm - 1, alignItems: "center" }}>
            <Text variant="subhead" style={{ color: on ? c.text : c.textMuted, fontFamily: on ? "Poppins_600SemiBold" : "Poppins_500Medium" }}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
