import { useId } from "react";
import { Image } from "expo-image";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useSessionStore } from "@/stores/use-session-store";
import { palette, useColors } from "@/theme";
import { Text } from "./text";

const INITIAL_BG = [palette.orange[500], palette.purple[500], "#1E9A45", "#0088e8", palette.purple[700]];

/** Profile photo (or initials) inside the brand purple→orange gradient ring. */
export function Avatar({ size = 44, name, uri, ring = false }: { size?: number; name: string; uri?: string | null; ring?: boolean }) {
  // unique per instance: on web every SVG shares one DOM, and a hidden copy would break url(#id)
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const c = useColors();
  const ringW = ring ? Math.max(2, Math.round(size * 0.05)) : 0;
  const gap = ring ? Math.max(2, Math.round(size * 0.04)) : 0;
  const inner = size - (ringW + gap) * 2;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const bg = INITIAL_BG[(name.charCodeAt(0) || 0) % INITIAL_BG.length];
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityLabel={`${name} avatar`}>
      {ring && (
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Defs>
            <LinearGradient id={`ring-${gid}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={palette.purple[400]} />
              <Stop offset="1" stopColor={palette.orange[500]} />
            </LinearGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - ringW / 2} stroke={`url(#ring-${gid})`} strokeWidth={ringW} fill={c.bg} />
        </Svg>
      )}
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: "hidden", backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: inner, height: inner }} contentFit="cover" transition={150} />
        ) : (
          <Text variant="bodyStrong" style={{ color: "#fff", fontSize: inner * 0.38, lineHeight: inner * 0.5, fontFamily: "BricolageGrotesque_800ExtraBold" }}>
            {initials}
          </Text>
        )}
      </View>
    </View>
  );
}

/** The signed-in user's avatar. */
export function MeAvatar({ size = 44, ring = true }: { size?: number; ring?: boolean }) {
  const user = useSessionStore((s) => s.user);
  const uri = useSessionStore((s) => s.avatarUri);
  return <Avatar size={size} ring={ring} name={`${user.firstName} ${user.lastName}`} uri={uri} />;
}
