import * as Haptics from "expo-haptics";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { motion } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Every tappable thing in the app: a spring scale-down on press plus a light haptic.
 * `haptic={false}` for rapid-fire controls like the number pad (which does its own).
 */
export function PressableScale({
  style,
  scaleTo = 0.96,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean }) {
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...props}
      accessibilityRole={props.accessibilityRole ?? "button"}
      onPressIn={(e) => {
        if (!reduce) scale.set(withSpring(scaleTo, motion.press));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, motion.press));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={[style, animated, props.disabled ? { opacity: 0.45 } : null]}
    />
  );
}
