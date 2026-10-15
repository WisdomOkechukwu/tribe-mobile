import { useColorScheme } from "react-native";
import { schemes, type ThemeColors } from "./colors";

export { CARD_GLASS, CARD_PATTERNS, CARD_PRESETS, CARD_SWATCHES, CARD_THEME_ORDER, CUSTOM_SHADES } from "./card-finishes";
export type { CardLook, CustomShade } from "./card-finishes";
export { schemes } from "./colors";
export { palette } from "./palette";
export { fonts, motion, radius, shadows, spacing, type } from "./tokens";
export type { TypeVariant } from "./tokens";
export type { ThemeColors };

/**
 * The one way components read colour. The Appearance preference (system/light/dark) is
 * applied app-wide via Appearance.setColorScheme in the root layout, so this stays a plain
 * useColorScheme read.
 */
export function useTheme() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { scheme, colors: schemes[scheme] } as const;
}

export function useColors(): ThemeColors {
  return useTheme().colors;
}
