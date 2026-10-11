import { Text as RNText, type TextProps } from "react-native";
import { type, useColors, type ThemeColors, type TypeVariant } from "@/theme";

export type Tone = "text" | "muted" | "subtle" | "brand" | "accent" | "success" | "danger" | "onBrand" | "cardText" | "cardMuted";

const toneKey: Record<Tone, keyof ThemeColors> = {
  text: "text",
  muted: "textMuted",
  subtle: "textSubtle",
  brand: "brandText",
  accent: "accentText",
  success: "success",
  danger: "danger",
  onBrand: "onBrand",
  cardText: "cardText",
  cardMuted: "cardMuted",
};

/** The only text primitive. Size/weight come from `variant`, colour from `tone`. */
export function Text({ variant = "body", tone = "text", align, style, ...props }: TextProps & { variant?: TypeVariant; tone?: Tone; align?: "left" | "center" | "right" }) {
  const colors = useColors();
  return <RNText {...props} style={[type[variant], { color: colors[toneKey[tone]], textAlign: align }, style]} />;
}
