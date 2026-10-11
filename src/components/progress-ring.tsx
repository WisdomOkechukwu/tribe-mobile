import { useId, type ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { palette, useColors } from "@/theme";

/** Brand-gradient progress ring with centred content (referrals, limits). */
export function ProgressRing({ size = 96, stroke = 10, progress, children }: { size?: number; stroke?: number; progress: number; children?: ReactNode }) {
  // unique per instance: on web every SVG shares one DOM, and a hidden copy would break url(#id)
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const c = useColors();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Defs>
          <LinearGradient id={`ring-g-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.purple[400]} />
            <Stop offset="1" stopColor={palette.orange[500]} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.sunken} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#ring-g-${gid})`} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ * p} ${circ}`} />
      </Svg>
      {children}
    </View>
  );
}
