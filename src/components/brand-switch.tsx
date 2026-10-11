import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { motion, palette, useColors } from "@/theme";

/** Brand switch — purple when on (never system green), springy knob, light haptic. */
export function BrandSwitch({ value, onValueChange, label, disabled }: { value: boolean; onValueChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const c = useColors();
  const track = useAnimatedStyle(() => ({ backgroundColor: withTiming(value ? palette.purple[500] : c.borderStrong, { duration: motion.fast }) }), [value, c.borderStrong]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(value ? 20 : 0, motion.spring) }] }), [value]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onValueChange(!value);
      }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[{ width: 50, height: 30, borderRadius: 15, padding: 3 }, track]}>
        <Animated.View style={[{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }, knob]} />
      </Animated.View>
    </Pressable>
  );
}
