import { View, type StyleProp, type ViewStyle } from "react-native";
import { palette } from "@/theme";

/**
 * The logo's diagonal bands, built from rotated Views (no SVG dependency). Place inside an
 * `overflow: hidden` parent; it overflows on purpose so band ends are never visible.
 */
export function Stripes({
  band = 26,
  gap = 10,
  count = 9,
  angle = -32,
  colors = [palette.purple[500], palette.orange[500]],
  opacity = 1,
  style,
}: {
  band?: number;
  gap?: number;
  count?: number;
  angle?: number;
  colors?: string[];
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[{ position: "absolute", width: "220%", left: "-60%", top: "-60%", height: "220%", opacity, transform: [{ rotate: `${angle}deg` }], justifyContent: "center", gap }, style]}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ height: band, backgroundColor: colors[i % colors.length] }} />
      ))}
    </View>
  );
}
