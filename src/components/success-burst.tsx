import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { palette } from "@/theme";
import { Icon } from "./icon";
import { Stripes } from "./stripes";

/** Brand success moment: a stripes disc springs in and slowly turns, the check pops, a success haptic fires. */
export function SuccessBurst({ size = 168 }: { size?: number }) {
  const reduce = useReducedMotion();
  const disc = useSharedValue(reduce ? 1 : 0);
  const spin = useSharedValue(0);
  const check = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) return;
    disc.value = withSpring(1, { damping: 12, stiffness: 140 });
    spin.value = withRepeat(withTiming(1, { duration: 14_000, easing: Easing.linear }), -1);
    check.value = withDelay(260, withSpring(1, { damping: 9, stiffness: 220 }));
    const t = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 280);
    return () => {
      clearTimeout(t);
      cancelAnimation(spin);
    };
  }, [disc, spin, check, reduce]);

  const discStyle = useAnimatedStyle(() => ({ transform: [{ scale: disc.value }, { rotate: `${spin.value * 360}deg` }] }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: check.value }], opacity: check.value }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityLabel="Success">
      <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: palette.purple[700] }, discStyle]}>
        <Stripes band={size * 0.12} gap={size * 0.05} count={10} />
      </Animated.View>
      <Animated.View style={[{ width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px -10px rgba(0,0,0,0.45)" }, checkStyle]}>
        <Icon name="check" size={size * 0.24} color={palette.success[600]} weight="bold" />
      </Animated.View>
    </View>
  );
}
