import { Image } from "expo-image";
import { View } from "react-native";
import { assetByCode } from "@/data/assets";
import { useColors } from "@/theme";
import { Text } from "./text";

/**
 * Real token logo / country flag (PNG, rasterised from flag-icons by scripts/make-flags.mjs). The coloured glyph coin sits underneath, so it shows while
 * the SVG decodes and stays if it ever fails — never a blank circle.
 */
export function CoinIcon({ code, size = 40, ring }: { code: string; size?: number; ring?: string }) {
  const a = assetByCode(code);
  const c = useColors();
  return (
    <View
      accessible
      accessibilityLabel={a.name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: a.bg,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: ring ? Math.max(2, size * 0.06) : 0,
        borderColor: ring ?? c.surface,
      }}
    >
      <Text variant="bodyStrong" style={{ color: a.fg, fontSize: size * (a.glyph.length > 1 ? 0.28 : 0.42), lineHeight: size * 0.6 }}>
        {a.glyph}
      </Text>
      <Image source={a.logo} contentFit="cover" transition={150} style={{ position: "absolute", width: "100%", height: "100%" }} />
      {/* hairline so pale flags (and white token marks) keep an edge on light surfaces */}
      {a.kind === "fiat" && <View pointerEvents="none" style={{ position: "absolute", inset: 0, borderRadius: size / 2, borderWidth: 1, borderColor: c.border }} />}
    </View>
  );
}
